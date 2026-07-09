import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { looksConfigured } from '../server/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const jsonOutput = argSet.has('--json');
const printBearer = argSet.has('--print');

function argValue(name) {
  const index = rawArgs.indexOf(name);

  return index >= 0 ? rawArgs[index + 1] : '';
}

function usage() {
  console.log(`Usage:
  node scripts/samsung-wallet-sign-partner-authorization.js --action update --ref-id <REF_ID> --output tmp/samsung-partner-update-authorization.txt
  node scripts/samsung-wallet-sign-partner-authorization.js --method POST --path /CH/wltex/cards/<CARD_ID>/updates --ref-id <REF_ID> --print

Options:
  --env-file  Env file to read. Default: supabase/secrets.local.env.
  --action    Convenience path builder: update, delete or revoke.
  --method    HTTP method for the Samsung API signature. Default: POST.
  --path      Exact Samsung API path to sign, e.g. /CH/wltex/cards/<CARD_ID>/updates.
  --ref-id    Optional Samsung refId included in the JWS payload.
  --output    Optional output file for "Authorization: Bearer <JWS>".
  --print     Print the generated Authorization header to stdout.
  --json      Machine-readable redacted summary.

This creates a Partner-to-Samsung Authorization header for outbound Samsung
Server API calls such as Update or Cancel Notification. It does not create the
Samsung-to-El-Promillo callback Bearer required for final production evidence.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  usage();
}

function configured(value) {
  return looksConfigured(String(value || '').trim());
}

function stripQuotes(value) {
  const text = String(value || '').trim();

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }

  return text;
}

function parseEnvFile(filePath) {
  const env = {};

  if (!filePath || !fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    env[match[1]] = stripQuotes(match[2]);
  }

  return env;
}

function envValue(env, name) {
  return String(process.env[name] || env[name] || '').trim();
}

function normalizePem(value) {
  return String(value || '')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function redact(value, visible = 4) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (text.length <= visible * 2 + 3) {
    return `${text.slice(0, Math.min(2, text.length))}...`;
  }

  return `${text.slice(0, visible)}...${text.slice(-visible)}`;
}

function resolveOutputFile(filePath) {
  if (!filePath) {
    return '';
  }

  return path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
}

function actionPath(action, env) {
  const normalized = String(action || '').trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  const countryCode = envValue(env, 'SAMSUNG_WALLET_COUNTRY_CODE') || 'CH';
  const cardId = envValue(env, 'SAMSUNG_WALLET_CARD_ID');
  const encodedCountry = encodeURIComponent(countryCode.toUpperCase());
  const encodedCardId = encodeURIComponent(cardId);

  if (!configured(cardId)) {
    throw new Error('SAMSUNG_WALLET_CARD_ID fehlt fuer --action.');
  }

  if (['update', 'delete'].includes(normalized)) {
    return `/${encodedCountry}/wltex/cards/${encodedCardId}/updates`;
  }

  if (normalized === 'revoke' || normalized === 'cancel') {
    return `/${encodedCountry}/wltex/cards/${encodedCardId}/cancels`;
  }

  throw new Error('--action muss update, delete oder revoke sein.');
}

function signPartnerAuthorization({ method, apiPath, refId, privateKeyPem, partnerId, certificateId }) {
  const header = {
    cty: 'AUTH',
    ver: 3,
    certificateId,
    partnerId,
    utc: Date.now(),
    alg: 'RS256'
  };
  const payload = {
    API: {
      method: method.toUpperCase(),
      path: apiPath
    },
    ...(refId ? { refId } : {})
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem);

  return `Bearer ${signingInput}.${base64Url(signature)}`;
}

function validateApiPath(apiPath) {
  if (!apiPath.startsWith('/')) {
    throw new Error('--path muss mit / beginnen und exakt dem Samsung API-Pfad entsprechen.');
  }
}

function main() {
  const envFile = path.resolve(rootDir, argValue('--env-file') || 'supabase/secrets.local.env');
  const env = parseEnvFile(envFile);
  const method = String(argValue('--method') || 'POST').trim().toUpperCase();
  const apiPath = String(argValue('--path') || actionPath(argValue('--action'), env)).trim();
  const refId = String(argValue('--ref-id') || '').trim();
  const outputFile = resolveOutputFile(argValue('--output'));
  const partnerId = envValue(env, 'SAMSUNG_WALLET_PARTNER_ID');
  const certificateId = envValue(env, 'SAMSUNG_WALLET_CERTIFICATE_ID');
  const privateKeyPem = normalizePem(envValue(env, 'SAMSUNG_WALLET_PRIVATE_KEY_PEM'));

  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    throw new Error('--method muss eine gueltige HTTP-Methode sein.');
  }

  if (!apiPath) {
    throw new Error('Setze entweder --path oder --action update|delete|revoke.');
  }

  validateApiPath(apiPath);

  for (const [name, value] of [
    ['SAMSUNG_WALLET_PARTNER_ID', partnerId],
    ['SAMSUNG_WALLET_CERTIFICATE_ID', certificateId],
    ['SAMSUNG_WALLET_PRIVATE_KEY_PEM', privateKeyPem]
  ]) {
    if (!configured(value)) {
      throw new Error(`${name} fehlt oder ist ein Platzhalter.`);
    }
  }

  const authorization = signPartnerAuthorization({
    method,
    apiPath,
    refId,
    privateKeyPem,
    partnerId,
    certificateId
  });
  const outputLine = `Authorization: ${authorization}`;

  if (outputFile) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${outputLine}\n`, { mode: 0o600 });
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      ok: true,
      kind: 'partner_to_samsung',
      method,
      path: apiPath.replace(envValue(env, 'SAMSUNG_WALLET_CARD_ID'), redact(envValue(env, 'SAMSUNG_WALLET_CARD_ID'))),
      refId: refId ? redact(refId) : '',
      outputFile: outputFile ? path.relative(rootDir, outputFile) : '',
      printed: printBearer
    }, null, 2));
  } else {
    console.log('Samsung Partner Authorization erstellt.');
    console.log('Typ: Partner-to-Samsung, nicht Samsung-to-El-Promillo Callback-Bearer.');
    console.log(`Methode: ${method}`);
    console.log(`Pfad: ${apiPath.replace(envValue(env, 'SAMSUNG_WALLET_CARD_ID'), redact(envValue(env, 'SAMSUNG_WALLET_CARD_ID')))}`);
    if (refId) {
      console.log(`Ref-ID: ${redact(refId)}`);
    }
    if (outputFile) {
      console.log(`Datei: ${path.relative(rootDir, outputFile)}`);
    }
  }

  if (printBearer) {
    console.log(outputLine);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (jsonOutput) {
    console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    console.error(`Samsung Partner Authorization konnte nicht erstellt werden: ${message}`);
  }

  process.exit(1);
}
