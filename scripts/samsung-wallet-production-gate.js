import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadConfig, looksConfigured } from '../server/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const strict = argSet.has('--strict');
const jsonOutput = argSet.has('--json');

function argValue(name) {
  const index = rawArgs.indexOf(name);

  return index >= 0 ? rawArgs[index + 1] : '';
}

function usage() {
  console.log(`Usage:
  node scripts/samsung-wallet-production-gate.js --env-file supabase/secrets.local.env --authorization-file tmp/samsung-bearer.txt --strict
  node scripts/samsung-wallet-production-gate.js --json

Options:
  --env-file                Env file to inspect. Default: supabase/secrets.local.env.
  --authorization-file      Samsung callback Authorization header file. Default: tmp/samsung-bearer.txt when present.
  --get-authorization-file  GET-specific Samsung callback Authorization header file.
  --post-authorization-file POST-specific Samsung callback Authorization header file.
  --instance-id             Optional Samsung instance UUID for verified evidence lookup.
  --ref-id                  Optional Samsung refId/pdata for verified evidence lookup.
  --customer-code           Optional Samsung customer code for verified evidence lookup.
  --strict                  Exit non-zero on fail or blocked_external.
  --json                    Machine-readable output.

This script prints no Samsung Bearer, Supabase keys, private keys, certificates,
tracking URLs or full Add-to-Wallet URLs.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  usage();
}

function add(results, status, label, detail = '', required = true) {
  results.push({ status, label, detail, required });
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

function safeHttpsUrl(value) {
  const text = String(value || '').trim();

  if (!/^https:\/\//i.test(text)) {
    return false;
  }

  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

function bearerFiles() {
  const explicitGeneric = argValue('--authorization-file');
  const defaultGeneric = fs.existsSync(path.join(rootDir, 'tmp/samsung-bearer.txt')) ? 'tmp/samsung-bearer.txt' : '';

  return [
    explicitGeneric || defaultGeneric,
    argValue('--get-authorization-file'),
    argValue('--post-authorization-file')
  ].filter(Boolean);
}

function bearerPresent() {
  if (configured(process.env.SAMSUNG_WALLET_TEST_AUTHORIZATION)
    || configured(process.env.SAMSUNG_WALLET_TEST_GET_AUTHORIZATION)
    || configured(process.env.SAMSUNG_WALLET_TEST_POST_AUTHORIZATION)) {
    return true;
  }

  return bearerFiles().some((file) => {
    try {
      const text = fs.readFileSync(path.resolve(rootDir, file), 'utf8').trim();
      return /^Authorization:\s*Bearer\s+\S+\.\S+\.\S+/i.test(text) || /^Bearer\s+\S+\.\S+\.\S+/i.test(text);
    } catch {
      return false;
    }
  });
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

async function loadSamsungInstance(supabase) {
  const instanceId = String(argValue('--instance-id') || '').trim();
  const refId = String(argValue('--ref-id') || '').trim();
  const customerCode = String(argValue('--customer-code') || '').trim();
  let query = supabase
    .from('samsung_wallet_instances')
    .select('id, ref_id, customer_code, card_status, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (instanceId) {
    query = query.eq('id', instanceId);
  } else if (refId) {
    query = query.eq('ref_id', refId);
  } else if (customerCode) {
    query = query.eq('customer_code', customerCode);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function payloadValue(event, key) {
  const payload = event?.request_payload;

  return payload && typeof payload === 'object' ? payload[key] : undefined;
}

async function verifiedCallbackEvidence() {
  const config = loadConfig();

  if (!configured(config.supabase?.url) || !configured(config.supabase?.serviceRoleKey)) {
    return {
      ok: false,
      detail: 'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt lokal für Evidence-Abfrage.'
    };
  }

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const instance = await loadSamsungInstance(supabase);

  if (!instance?.id) {
    return {
      ok: false,
      detail: 'Keine Samsung-Instanz gefunden.'
    };
  }

  const { data, error } = await supabase
    .from('samsung_wallet_events')
    .select('event_type, request_payload, created_at')
    .eq('samsung_wallet_instance_id', instance.id)
    .in('event_type', ['get_card_data', 'send_card_state'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const events = Array.isArray(data) ? data : [];
  const verified = events.some((event) => payloadValue(event, 'auth_verified') === true || payloadValue(event, 'auth_status') === 'verified');
  const statuses = [...new Set(events.map((event) => String(payloadValue(event, 'auth_status') || '').trim()).filter(Boolean))];

  return {
    ok: verified,
    detail: verified
      ? `verifizierter Samsung Callback vorhanden (${redact(instance.ref_id)}).`
      : statuses.length > 0
        ? `kein verifizierter Callback; gesehen: ${statuses.join(', ')}.`
        : 'Callbacks ohne auth_status oder keine Callback-Events gefunden.'
  };
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, { ok: 0, warn: 0, fail: 0, blocked_external: 0 });
}

async function main() {
  const results = [];
  const envFile = path.resolve(rootDir, argValue('--env-file') || 'supabase/secrets.local.env');
  const env = parseEnvFile(envFile);
  const samsungEnv = envValue(env, 'SAMSUNG_WALLET_ENV').toLowerCase();
  const allowUnverified = envValue(env, 'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH').toLowerCase();

  add(results, fs.existsSync(envFile) ? 'ok' : 'warn', 'Env File', fs.existsSync(envFile) ? 'Env-Datei gefunden.' : 'Env-Datei nicht gefunden, prüfe nur process.env.', false);
  add(results, ['production', 'prod', 'live'].includes(samsungEnv) ? 'ok' : 'fail', 'Samsung Production Env', samsungEnv || 'leer');
  add(results, allowUnverified === 'false' ? 'ok' : 'fail', 'Samsung Unverified Auth Disabled', allowUnverified || 'leer');

  const requiredSecrets = [
    'SAMSUNG_WALLET_PARTNER_ID',
    'SAMSUNG_WALLET_PARTNER_CODE',
    'SAMSUNG_WALLET_CARD_ID',
    'SAMSUNG_WALLET_CARD_TYPE',
    'SAMSUNG_WALLET_CERTIFICATE_ID',
    'SAMSUNG_WALLET_COUNTRY_CODE',
    'SAMSUNG_WALLET_ADD_FLOW',
    'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
    'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
    'SAMSUNG_WALLET_RD_CLICK_URL',
    'SAMSUNG_WALLET_RD_IMPRESSION_URL',
    'SAMSUNG_WALLET_PARTNER_SERVER_URL',
    'APP_PUBLIC_BASE_URL'
  ];

  for (const secretName of requiredSecrets) {
    add(results, configured(envValue(env, secretName)) ? 'ok' : 'fail', `Secret ${secretName}`, configured(envValue(env, secretName)) ? 'gesetzt' : 'fehlt oder Platzhalter');
  }

  const addFlow = envValue(env, 'SAMSUNG_WALLET_ADD_FLOW').toLowerCase();
  add(results, ['data_fetch', 'cdata'].includes(addFlow) ? 'ok' : 'fail', 'Samsung Add Flow', addFlow || 'leer');
  add(results, safeHttpsUrl(envValue(env, 'SAMSUNG_WALLET_PARTNER_SERVER_URL')) ? 'ok' : 'fail', 'Partner Server HTTPS', safeHttpsUrl(envValue(env, 'SAMSUNG_WALLET_PARTNER_SERVER_URL')) ? 'HTTPS ok' : 'keine gültige HTTPS-URL');
  add(results, safeHttpsUrl(envValue(env, 'APP_PUBLIC_BASE_URL')) ? 'ok' : 'fail', 'App Public HTTPS', safeHttpsUrl(envValue(env, 'APP_PUBLIC_BASE_URL')) ? 'HTTPS ok' : 'keine gültige HTTPS-URL');

  if (bearerPresent()) {
    add(results, 'ok', 'Samsung Callback Bearer', 'lokaler Bearer-Nachweis vorhanden');
  } else {
    add(results, 'blocked_external', 'Samsung Callback Bearer', 'Echter Samsung Authorization: Bearer <JWS> fehlt noch.');
  }

  try {
    const evidence = await verifiedCallbackEvidence();
    add(
      results,
      evidence.ok ? 'ok' : 'blocked_external',
      'Samsung Verified Callback Evidence',
      evidence.detail
    );
  } catch (error) {
    add(
      results,
      'blocked_external',
      'Samsung Verified Callback Evidence',
      error instanceof Error ? error.message : 'Evidence-Abfrage fehlgeschlagen.'
    );
  }

  return results;
}

const results = await main();
const summary = summarize(results);

if (jsonOutput) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.log('Samsung Wallet Production Gate');
  console.log('Secrets, Bearer, Zertifikate und vollstaendige URLs werden nicht ausgegeben.');
  console.log(`OK: ${summary.ok}  WARN: ${summary.warn}  FAIL: ${summary.fail}  EXTERNAL_BLOCKED: ${summary.blocked_external}`);

  for (const result of results) {
    console.log(`${result.status.toUpperCase().padEnd(16)} ${result.label} - ${result.detail}`);
  }
}

if (strict && (summary.fail > 0 || summary.blocked_external > 0)) {
  process.exitCode = 1;
}
