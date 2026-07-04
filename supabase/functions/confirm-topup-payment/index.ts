// Supabase Edge Function: Zahlungsbestätigung für Guthaben-Aufladung.
//
// Produktiv sollte diese Funktion von einem Provider-Webhook mit
// PAYMENT_WEBHOOK_SECRET aufgerufen werden. Für lokale MVP-Tests ist auch ein
// eingeloggter Betreiber erlaubt; in beiden Fällen schreibt die SQL-RPC das
// Guthaben atomar und matrixvalidiert.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { assertFeatureAllowed, normalizeTemplateType } from '../_shared/templateFeatures.ts';
import { publicOperatorCard } from '../_shared/publicResponses.ts';

type Row = Record<string, any>;

const MIN_PAYMENT_WEBHOOK_SECRET_LENGTH = 32;
const textEncoder = new TextEncoder();

const confirmTopupTemplateSelect = [
  'id',
  'business_name',
  'card_name',
  'card_type',
  'template_type',
  'description',
  'primary_color',
  'text_color',
  'logo_url',
  'businesses(name,logo_url)',
  'reward_text',
  'stamps_required',
  'streak_goal',
  'vip_tier',
  'settings',
  'club_features',
  'club_settings',
  'is_active'
].join(',');

const confirmTopupSessionCardSelect = [
  'id',
  'card_templates(' + confirmTopupTemplateSelect + ')'
].join(',');

const confirmTopupSessionSelect = [
  'id',
  'provider_session_id',
  'customer_card_id',
  `customer_cards(${confirmTopupSessionCardSelect})`
].join(',');

const confirmTopupUpdatedCardSelect = [
  'id',
  'template_id',
  'card_instance_number',
  'customer_code',
  'status',
  'stamp_count',
  'streak_count',
  'vip_status',
  'pass_serial_number',
  'wallet_platform',
  'wallet_object_id',
  'wallet_serial_number',
  'balance_cents',
  'currency',
  'cloakroom_active',
  'cloakroom_started_at',
  'cloakroom_completed_at',
  'last_scanned_at',
  'metadata',
  'updated_at',
  'created_at',
  `card_templates(${confirmTopupTemplateSelect})`
].join(',');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payment-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function createStructuredError(statusCode: number, errorCode: string, message: string, reason: string) {
  return {
    statusCode,
    error_code: errorCode,
    error_message: message,
    error_reason: reason
  };
}

function stringValue(value: unknown) {
  return String(value || '').trim();
}

async function sha256Bytes(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', textEncoder.encode(value)));
}

async function paymentWebhookSecretMatches(expected: unknown, candidate: unknown) {
  const expectedSecret = stringValue(expected);
  const candidateSecret = stringValue(candidate);

  if (!expectedSecret || !candidateSecret) {
    return false;
  }

  const [expectedHash, candidateHash] = await Promise.all([
    sha256Bytes(expectedSecret),
    sha256Bytes(candidateSecret)
  ]);
  let diff = expectedHash.length ^ candidateHash.length;
  const length = Math.max(expectedHash.length, candidateHash.length);

  for (let index = 0; index < length; index += 1) {
    diff |= (expectedHash[index] || 0) ^ (candidateHash[index] || 0);
  }

  return diff === 0;
}

function errorJson(error: any) {
  const status = Number(error?.statusCode || error?.status || 500);

  return json({
    error: error?.message || error?.error_message || 'Unbekannter Fehler',
    error_code: error?.error_code || 'CONFIRM_TOPUP_PAYMENT_ERROR',
    error_message: error?.error_message || error?.message || 'Zahlungsbestätigung fehlgeschlagen.',
    error_reason: error?.error_reason || 'Bitte prüfe Payment-Session, Provider-Referenz und Kartentyp.'
  }, status);
}

function rpcErrorToStructured(error: any) {
  const message = String(error?.message || '');
  const match = message.match(/^([A-Z_]+):\s*(.*)$/);

  if (!match) {
    return error;
  }

  const [, code, reason] = match;
  const statusByCode: Record<string, number> = {
    PAYMENT_SESSION_REQUIRED: 400,
    PAYMENT_SESSION_NOT_FOUND: 404,
    PAYMENT_SESSION_ALREADY_CLOSED: 409,
    PAYMENT_SESSION_EXPIRED: 409,
    CARD_FORBIDDEN: 403,
    OPERATOR_LOCKED: 403,
    ACTION_NOT_ALLOWED_FOR_TEMPLATE: 403
  };
  const messageByCode: Record<string, string> = {
    PAYMENT_SESSION_REQUIRED: 'Payment-Session fehlt.',
    PAYMENT_SESSION_NOT_FOUND: 'Payment-Session nicht gefunden.',
    PAYMENT_SESSION_ALREADY_CLOSED: 'Payment-Session ist nicht mehr offen.',
    PAYMENT_SESSION_EXPIRED: 'Payment-Session ist abgelaufen.',
    CARD_FORBIDDEN: 'Kein Zugriff auf diese Karte.',
    OPERATOR_LOCKED: 'Account nicht freigeschaltet.',
    ACTION_NOT_ALLOWED_FOR_TEMPLATE: 'Aktion nicht erlaubt für diesen Kartentyp.'
  };

  return createStructuredError(
    statusByCode[code] || 500,
    code,
    messageByCode[code] || 'Zahlungsbestätigung fehlgeschlagen.',
    reason || message
  );
}

async function getAuthenticatedUserId(supabaseAdmin: any, request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return null;
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    throw createStructuredError(
      401,
      'AUTH_INVALID',
      'Bitte erneut einloggen.',
      'Der Login-Token konnte nicht verifiziert werden.'
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('operator_profiles')
    .select('id, unlock')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile?.unlock) {
    throw createStructuredError(
      403,
      'OPERATOR_LOCKED',
      'Account nicht freigeschaltet.',
      'Topup-Bestätigungen sind nur für freigeschaltete Betreiber erlaubt.'
    );
  }

  return userData.user.id;
}

async function requireProviderOrOperator(supabaseAdmin: any, request: Request) {
  const userId = await getAuthenticatedUserId(supabaseAdmin, request);

  if (userId) {
    return userId;
  }

  const configuredSecret = stringValue(Deno.env.get('PAYMENT_WEBHOOK_SECRET'));
  const receivedSecret = stringValue(request.headers.get('x-payment-webhook-secret'));

  if (!configuredSecret || configuredSecret.length < MIN_PAYMENT_WEBHOOK_SECRET_LENGTH) {
    throw createStructuredError(
      500,
      'PAYMENT_WEBHOOK_SECRET_MISSING',
      'Payment-Webhook-Secret fehlt oder ist zu kurz.',
      'Setze PAYMENT_WEBHOOK_SECRET als serverseitiges Supabase Secret mit mindestens 32 Zeichen.'
    );
  }

  if (!(await paymentWebhookSecretMatches(configuredSecret, receivedSecret))) {
    throw createStructuredError(
      401,
      'PAYMENT_CONFIRMATION_UNAUTHORIZED',
      'Zahlungsbestätigung nicht autorisiert.',
      'Sende entweder einen gültigen Betreiber-Login oder das serverseitige PAYMENT_WEBHOOK_SECRET.'
    );
  }

  return null;
}

async function loadSession(supabaseAdmin: any, body: Row) {
  const topupSessionId = stringValue(body.topupPaymentSessionId || body.topup_payment_session_id || body.sessionId || body.session_id);
  const providerSessionId = stringValue(body.providerSessionId || body.provider_session_id);

  let query = supabaseAdmin
    .from('topup_payment_sessions')
    .select(confirmTopupSessionSelect);

  if (topupSessionId) {
    query = query.eq('id', topupSessionId);
  } else if (providerSessionId) {
    query = query.eq('provider_session_id', providerSessionId);
  } else {
    throw createStructuredError(
      400,
      'PAYMENT_SESSION_REQUIRED',
      'Payment-Session fehlt.',
      'Sende topupPaymentSessionId oder providerSessionId.'
    );
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({
      error_code: 'METHOD_NOT_ALLOWED',
      error_message: 'Nur POST ist erlaubt.',
      error_reason: 'Zahlungsbestätigungen müssen als POST gesendet werden.'
    }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw createStructuredError(
        500,
        'SUPABASE_EDGE_CONFIG_MISSING',
        'Supabase Edge Secrets fehlen.',
        'Setze SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY für diese Edge Function.'
      );
    }

    const body = await request.json().catch(() => ({})) as Row;
    const paymentStatus = stringValue(body.status || body.payment_status || 'succeeded');

    if (paymentStatus !== 'succeeded') {
      throw createStructuredError(
        409,
        'PAYMENT_NOT_SUCCEEDED',
        'Zahlung ist nicht erfolgreich.',
        'Nur erfolgreich bestätigte Zahlungen dürfen das Kartenguthaben erhöhen.'
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const createdBy = await requireProviderOrOperator(supabaseAdmin, request);
    const session = await loadSession(supabaseAdmin, body);

    if (!session) {
      throw createStructuredError(
        404,
        'PAYMENT_SESSION_NOT_FOUND',
        'Payment-Session nicht gefunden.',
        'Die angegebene Topup-Session existiert nicht.'
      );
    }

    const card = session.customer_cards;
    const template = card?.card_templates;

    if (!card || !template) {
      throw createStructuredError(
        404,
        'CARD_NOT_FOUND',
        'Kundenkarte nicht gefunden.',
        'Die Payment-Session ist keiner gültigen Kundenkarte zugeordnet.'
      );
    }

    try {
      assertFeatureAllowed(template, 'balance');
    } catch (error) {
      throw {
        ...(error as Row),
        statusCode: 403,
        template_type: normalizeTemplateType(template)
      };
    }

    const { data: confirmResult, error: confirmError } = await supabaseAdmin.rpc('confirm_card_topup', {
      p_topup_session_id: session.id,
      p_provider_session_id: stringValue(body.providerSessionId || body.provider_session_id) || session.provider_session_id,
      p_provider_reference: stringValue(body.providerReference || body.provider_reference || body.payment_reference),
      p_created_by: createdBy,
      p_source: stringValue(body.source) || 'confirm_topup_payment_edge_function'
    });

    if (confirmError) {
      throw rpcErrorToStructured(confirmError);
    }

    const { data: updatedCard, error: updatedCardError } = await supabaseAdmin
      .from('customer_cards')
      .select(confirmTopupUpdatedCardSelect)
      .eq('id', card.id)
      .single();

    if (updatedCardError) {
      throw updatedCardError;
    }

    return json({
      ok: true,
      action: 'balance-topup',
      template_type: normalizeTemplateType(template),
      result: confirmResult,
      card: publicOperatorCard(updatedCard)
    });
  } catch (error) {
    return errorJson(error);
  }
});
