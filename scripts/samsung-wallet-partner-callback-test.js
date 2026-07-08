import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadConfig, looksConfigured } from '../server/config.js';

const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const strict = argSet.has('--strict');
const jsonOutput = argSet.has('--json');
const skipPost = argSet.has('--skip-post');

function argValue(name) {
  const index = rawArgs.indexOf(name);

  return index >= 0 ? rawArgs[index + 1] : '';
}

function usage() {
  console.log(`Usage:
  node scripts/samsung-wallet-partner-callback-test.js --authorization-file tmp/samsung-bearer.txt --strict
  node scripts/samsung-wallet-partner-callback-test.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --card-id <CARD_ID> --ref-id <REF_ID> --authorization-file tmp/samsung-bearer.txt
  SAMSUNG_WALLET_TEST_AUTHORIZATION='Bearer <Samsung-JWS>' node scripts/samsung-wallet-partner-callback-test.js --strict

Options:
  --functions-base-url   Supabase Edge Functions base URL. Falls nicht gesetzt, config.publicUrls.supabaseFunctionBaseUrl.
  --card-id              Samsung Wallet Card ID. Falls nicht gesetzt, neueste samsung_wallet_instances-Zeile.
  --ref-id               Samsung refId/pdata. Falls nicht gesetzt, neueste samsung_wallet_instances-Zeile.
  --authorization        Samsung Authorization Header oder nur JWS. Wird nie ausgegeben.
  --authorization-file   Datei mit Samsung Authorization Header oder nur JWS. Wird nie ausgegeben.
  --get-authorization-file
                         Optional separate Datei fuer GET Card Data Authorization.
  --post-authorization-file
                         Optional separate Datei fuer POST Card State Authorization.
  --post-event           Samsung Status-Event fuer POST. Default: ADDED.
  --country-code         cc2 Query-Parameter. Default: CH.
  --callback-url         Optionaler Callback-Wert im POST-Body.
  --skip-post            Nur GET Card Data testen.
  --strict               Exit non-zero bei Fehlern.
  --json                 Maschinenlesbare Ausgabe.

Das Script ist fuer die echte externe Samsung-Abnahme gedacht. Der Authorization
Header muss aus dem Samsung Test Tool oder einem echten Samsung-Wallet-Callback
kommen und zur Route /cards/{cardId}/{refId} passen.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  usage();
}

function add(results, status, label, detail = '') {
  results.push({ status, label, detail });
}

function configured(value) {
  return looksConfigured(String(value || '').trim());
}

function normalizeAuthorization(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  return /^Bearer\s+/i.test(text) ? text : `Bearer ${text}`;
}

function readAuthorizationFile(file) {
  return file ? fs.readFileSync(file, 'utf8') : '';
}

function authorizationHeader(kind = 'generic') {
  const direct = argValue('--authorization');
  const file = argValue('--authorization-file');
  const specificFile = kind === 'get'
    ? argValue('--get-authorization-file')
    : kind === 'post'
      ? argValue('--post-authorization-file')
      : '';
  const specificEnv = kind === 'get'
    ? process.env.SAMSUNG_WALLET_TEST_GET_AUTHORIZATION
    : kind === 'post'
      ? process.env.SAMSUNG_WALLET_TEST_POST_AUTHORIZATION
      : '';
  const envValue = process.env.SAMSUNG_WALLET_TEST_AUTHORIZATION || '';

  if (specificFile) {
    return normalizeAuthorization(readAuthorizationFile(specificFile));
  }

  if (specificEnv) {
    return normalizeAuthorization(specificEnv);
  }

  if (direct) {
    return normalizeAuthorization(direct);
  }

  if (file) {
    return normalizeAuthorization(readAuthorizationFile(file));
  }

  return normalizeAuthorization(envValue);
}

function functionsBaseUrl(config) {
  return String(argValue('--functions-base-url') || config.publicUrls?.supabaseFunctionBaseUrl || '').replace(/\/+$/, '');
}

async function newestSamsungInstance(supabase) {
  const { data, error } = await supabase
    .from('samsung_wallet_instances')
    .select('id, ref_id, card_id, card_status, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function countEvents(supabase, instanceId, eventType) {
  const { count, error } = await supabase
    .from('samsung_wallet_events')
    .select('id', { count: 'exact', head: true })
    .eq('samsung_wallet_instance_id', instanceId)
    .eq('event_type', eventType);

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

async function reloadInstance(supabase, instanceId) {
  const { data, error } = await supabase
    .from('samsung_wallet_instances')
    .select('id, card_status, last_event, last_event_at, last_synced_at')
    .eq('id', instanceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function publicError(payload) {
  return `${payload?.error_code || payload?.error || 'UNKNOWN'} ${payload?.error_message || ''}`.trim();
}

async function main() {
  const results = [];
  const config = loadConfig();
  const baseUrl = functionsBaseUrl(config);
  const getAuth = authorizationHeader('get');
  const postAuth = authorizationHeader('post');
  const postEvent = String(argValue('--post-event') || 'ADDED').trim().toUpperCase();
  const countryCode = String(argValue('--country-code') || 'CH').trim().toUpperCase();
  const callbackUrl = String(argValue('--callback-url') || '').trim();

  if (!configured(baseUrl) || !/^https:\/\/.+\/functions\/v1$/i.test(baseUrl)) {
    add(results, 'fail', 'Functions Base URL', 'Setze --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1.');
    return results;
  }

  if (!getAuth) {
    add(results, 'fail', 'Samsung Authorization', 'Lege den Samsung Bearer aus dem Test Tool in --authorization-file oder SAMSUNG_WALLET_TEST_AUTHORIZATION ab.');
    return results;
  }

  if (!configured(config.supabase?.url) || !configured(config.supabase?.serviceRoleKey)) {
    add(results, 'fail', 'Supabase Admin Config', 'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt lokal.');
    return results;
  }

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const providedRefId = String(argValue('--ref-id') || '').trim();
  const providedCardId = String(argValue('--card-id') || '').trim();
  const instance = providedRefId && providedCardId
    ? null
    : await newestSamsungInstance(supabase);
  const refId = providedRefId || instance?.ref_id || '';
  const cardId = providedCardId || instance?.card_id || '';

  if (!refId || !cardId) {
    add(results, 'fail', 'Samsung Instance', 'Keine refId/cardId gefunden. Erzeuge zuerst einen Add-Link mit samsung-wallet-smoke-test.js oder der Claim-Seite.');
    return results;
  }

  add(results, 'ok', 'Samsung Instance', providedRefId && providedCardId ? 'refId/cardId aus Argumenten genutzt.' : 'Neueste gespeicherte Samsung-Instanz genutzt.');

  const route = `${baseUrl}/samsung-wallet-server/cards/${encodeURIComponent(cardId)}/${encodeURIComponent(refId)}`;
  const getResponse = await fetch(route, {
    method: 'GET',
    headers: {
      authorization: getAuth,
      'x-request-id': `codex-samsung-get-${Date.now()}`
    }
  });
  const getPayload = await getResponse.json().catch(() => ({}));

  add(
    results,
    getResponse.ok && getPayload?.card ? 'ok' : 'fail',
    'GET Card Data',
    getResponse.ok ? 'Samsung Card Data wurde geliefert.' : `${getResponse.status} ${publicError(getPayload)}`
  );

  if (instance?.id) {
    const getCardDataEvents = await countEvents(supabase, instance.id, 'get_card_data');
    add(results, getCardDataEvents > 0 ? 'ok' : 'fail', 'GET Event Persisted', `get_card_data Events: ${getCardDataEvents}`);
  }

  if (skipPost) {
    return results;
  }

  if (!postAuth) {
    add(results, 'fail', 'Samsung POST Authorization', 'Lege fuer POST einen passenden Samsung Bearer in --post-authorization-file, --authorization-file oder SAMSUNG_WALLET_TEST_POST_AUTHORIZATION ab.');
    return results;
  }

  const postUrl = new URL(route);
  postUrl.searchParams.set('cc2', countryCode || 'CH');
  postUrl.searchParams.set('event', postEvent || 'ADDED');

  const postResponse = await fetch(postUrl, {
    method: 'POST',
    headers: {
      authorization: postAuth,
      'content-type': 'application/json',
      'x-request-id': `codex-samsung-post-${Date.now()}`
    },
    body: JSON.stringify(callbackUrl ? { callback: callbackUrl } : {})
  });
  const postPayload = await postResponse.json().catch(() => ({}));

  add(
    results,
    postResponse.ok && (postPayload?.ok || postResponse.status === 204) ? 'ok' : 'fail',
    'POST Card State',
    postResponse.ok ? `Samsung Event ${postEvent || 'ADDED'} wurde verarbeitet.` : `${postResponse.status} ${publicError(postPayload)}`
  );

  if (instance?.id) {
    const sendCardStateEvents = await countEvents(supabase, instance.id, 'send_card_state');
    const updatedInstance = await reloadInstance(supabase, instance.id);

    add(results, sendCardStateEvents > 0 ? 'ok' : 'fail', 'POST Event Persisted', `send_card_state Events: ${sendCardStateEvents}`);
    add(results, updatedInstance?.last_event === postEvent ? 'ok' : 'fail', 'Samsung Last Event', updatedInstance?.last_event || 'leer');

    if (postEvent === 'ADDED' || postEvent === 'PROVISIONED' || postEvent === 'UPDATED') {
      add(results, updatedInstance?.card_status === 'active' ? 'ok' : 'fail', 'Samsung Card Status', updatedInstance?.card_status || 'leer');
    }
  }

  return results;
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, { ok: 0, warn: 0, fail: 0 });
}

const results = await main();
const summary = summarize(results);

if (jsonOutput) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.log('Samsung Wallet Partner Callback Test');
  console.log('Authorization Header, Secrets und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.');
  console.log(`OK: ${summary.ok}  WARN: ${summary.warn}  FAIL: ${summary.fail}`);

  for (const result of results) {
    console.log(`${result.status.toUpperCase().padEnd(4)} ${result.label} - ${result.detail}`);
  }
}

if (strict && summary.fail > 0) {
  process.exitCode = 1;
}
