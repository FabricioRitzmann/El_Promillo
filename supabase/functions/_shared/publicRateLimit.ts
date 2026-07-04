const DEFAULT_PUBLIC_CLAIM_LIMIT = 80;
const DEFAULT_PUBLIC_CLAIM_WINDOW_SECONDS = 900;

function stringValue(value) {
  return String(value || '').trim();
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function firstHeaderValue(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0] || '';
}

function clientFingerprintInput(request, routeKey) {
  const headers = request.headers;
  const ip = firstHeaderValue(
    stringValue(headers.get('cf-connecting-ip'))
      || stringValue(headers.get('x-real-ip'))
      || stringValue(headers.get('x-forwarded-for'))
      || 'unknown'
  );
  const userAgent = stringValue(headers.get('user-agent')).slice(0, 220);
  const language = stringValue(headers.get('accept-language')).slice(0, 80);

  return [routeKey, ip, userAgent, language].join('|');
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function publicRateLimitError(rateLimit) {
  const retryAfterSeconds = positiveInteger(rateLimit?.retry_after_seconds, DEFAULT_PUBLIC_CLAIM_WINDOW_SECONDS);

  return {
    statusCode: 429,
    error_code: 'PUBLIC_CLAIM_RATE_LIMITED',
    error_message: 'Zu viele Anfragen.',
    error_reason: `Bitte warte ${retryAfterSeconds} Sekunden und versuche es danach erneut.`,
    retry_after_seconds: retryAfterSeconds
  };
}

export async function enforcePublicClaimRateLimit(supabaseAdmin, request, routeKey, options = {}) {
  const normalizedRouteKey = stringValue(routeKey).toLowerCase();
  const limit = positiveInteger(
    Deno.env.get(options.limitEnv || 'WALLET_PUBLIC_CLAIM_RATE_LIMIT'),
    positiveInteger(options.limit, DEFAULT_PUBLIC_CLAIM_LIMIT)
  );
  const windowSeconds = positiveInteger(
    Deno.env.get(options.windowSecondsEnv || 'WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS'),
    positiveInteger(options.windowSeconds, DEFAULT_PUBLIC_CLAIM_WINDOW_SECONDS)
  );
  const subjectHash = await sha256Hex(clientFingerprintInput(request, normalizedRouteKey));

  const { data, error } = await supabaseAdmin.rpc('consume_public_edge_rate_limit', {
    p_route_key: normalizedRouteKey,
    p_subject_hash: subjectHash,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error) {
    throw {
      statusCode: 500,
      error_code: 'PUBLIC_CLAIM_RATE_LIMIT_CHECK_FAILED',
      error_message: 'Rate-Limit-Prüfung fehlgeschlagen.',
      error_reason: error.message || 'Die öffentliche Schutzprüfung konnte nicht ausgeführt werden.'
    };
  }

  if (data?.allowed === false) {
    throw publicRateLimitError(data);
  }

  return data || {
    allowed: true,
    route_key: normalizedRouteKey,
    limit,
    remaining: Math.max(limit - 1, 0)
  };
}
