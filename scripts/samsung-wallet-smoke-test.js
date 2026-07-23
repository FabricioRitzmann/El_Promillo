import { createClient } from '@supabase/supabase-js';
import { loadConfig, looksConfigured } from '../server/config.js';

const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const strict = argSet.has('--strict');
const jsonOutput = argSet.has('--json');

function argValue(name) {
  const index = rawArgs.indexOf(name);

  return index >= 0 ? rawArgs[index + 1] : '';
}

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/samsung-wallet-smoke-test.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1
  node scripts/samsung-wallet-smoke-test.js --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --template-id <TEMPLATE_ID> --strict
  node scripts/samsung-wallet-smoke-test.js --json

Options:
  --functions-base-url  Supabase Edge Functions base URL.
  --template-id         Optional active template id. If omitted, the newest active template is used.
  --strict              Exit non-zero on any failed check.
  --json                Print machine-readable JSON.

This smoke test creates one Samsung Wallet instance and one add_link_created
event. If sandbox unverified auth is enabled remotely, it also exercises one
POST Card State callback. It never prints Supabase keys, private keys,
certificates or full Samsung Add-to-Wallet URLs.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function add(results, status, label, detail) {
  results.push({ status, label, detail });
}

function configured(value) {
  return looksConfigured(String(value || '').trim());
}

function redactUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}#Clip?<redacted>`;
  } catch {
    return '<invalid-url>';
  }
}

function base64UrlJson(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function cdataHeaderFromAddUrl(value) {
  try {
    const parsed = new URL(value);
    const cdata = parsed.hash.split('?')[1] ? new URLSearchParams(parsed.hash.split('?')[1]).get('cdata') : '';
    const headerSegment = String(cdata || '').split('.')[0];
    return headerSegment ? base64UrlJson(headerSegment) : null;
  } catch {
    return null;
  }
}

function cdataPayloadFromAddUrl(value) {
  try {
    const parsed = new URL(value);
    const cdata = parsed.hash.split('?')[1] ? new URLSearchParams(parsed.hash.split('?')[1]).get('cdata') : '';
    const payloadSegment = String(cdata || '').split('.')[1];
    return payloadSegment ? Buffer.from(payloadSegment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payloadSegment.length / 4) * 4, '='), 'base64').toString('utf8') : '';
  } catch {
    return '';
  }
}

function functionsBaseUrl(config) {
  const explicit = argValue('--functions-base-url');
  const configuredUrl = config.publicUrls?.supabaseFunctionBaseUrl;

  return String(explicit || configuredUrl || '').replace(/\/+$/, '');
}

async function newestActiveTemplate(supabase) {
  const { data, error } = await supabase
    .from('card_templates')
    .select('id, card_name, template_type, created_at')
    .eq('is_active', true)
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

async function reloadSamsungInstance(supabase, instanceId) {
  const { data, error } = await supabase
    .from('samsung_wallet_instances')
    .select('card_status, last_event')
    .eq('id', instanceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function main() {
  const results = [];
  const config = loadConfig();
  const baseUrl = functionsBaseUrl(config);
  const templateIdArg = argValue('--template-id');

  if (!configured(config.supabase?.url) || !configured(config.supabase?.serviceRoleKey)) {
    add(results, 'fail', 'Supabase Admin Config', 'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt lokal.');
    return results;
  }

  if (!configured(baseUrl) || !/^https:\/\/.+\/functions\/v1$/i.test(baseUrl)) {
    add(results, 'fail', 'Functions Base URL', 'Setze --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1.');
    return results;
  }

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const template = templateIdArg
    ? { id: templateIdArg }
    : await newestActiveTemplate(supabase);

  if (!template?.id) {
    add(results, 'fail', 'Active Template', 'Kein aktives Template gefunden.');
    return results;
  }

  add(results, 'ok', 'Active Template', templateIdArg ? 'Template-ID aus Argument genutzt.' : 'Neuestes aktives Template genutzt.');

  const addLinkResponse = await fetch(`${baseUrl}/samsung-wallet-add-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ templateId: template.id })
  });
  const addLinkBody = await addLinkResponse.json().catch(() => ({}));

  if (!addLinkResponse.ok || !addLinkBody.ok) {
    add(results, 'fail', 'Samsung Add Link', `${addLinkResponse.status} ${addLinkBody.error_code || 'UNKNOWN'} ${addLinkBody.error_reason || ''}`.trim());
    return results;
  }

  const addUrl = String(addLinkBody.addUrl || '');
  const refId = String(addLinkBody.refId || '');
  const customerCode = String(addLinkBody.card?.customer_code || '');
  const isDataFetchLink = addUrl.includes('pdata=') && !addUrl.includes('cdata=');
  const isCdataLink = addUrl.includes('cdata=') && !addUrl.includes('pdata=');
  const addUrlPathParts = (() => {
    try {
      return new URL(addUrl).pathname.split('/').filter(Boolean);
    } catch {
      return [];
    }
  })();

  add(results, addUrl.startsWith('https://a.swallet.link/atw/v3/') ? 'ok' : 'fail', 'Samsung Add URL Host', redactUrl(addUrl));
  add(results, isDataFetchLink || isCdataLink ? 'ok' : 'fail', 'Samsung Add Link Token', isCdataLink ? 'Add URL nutzt cdata.' : 'Add URL nutzt pdata.');
  add(results, (isCdataLink ? addUrlPathParts.length === 3 : addUrlPathParts.length === 4) ? 'ok' : 'fail', 'Samsung Add Link Path', isCdataLink ? 'cdata nutzt /atw/v3/{cardId}.' : 'pdata nutzt /atw/v3/{certificateId}/{cardId}.');

  if (isCdataLink) {
    const cdataHeader = cdataHeaderFromAddUrl(addUrl);
    const cdataPayload = cdataPayloadFromAddUrl(addUrl);
    const encryptedPayloadParts = cdataPayload.split('.');

    add(results, cdataHeader?.cty === 'CARD' && cdataHeader?.ver === '3' ? 'ok' : 'fail', 'Samsung cdata Header', cdataHeader ? `cty=${cdataHeader.cty}, ver=${cdataHeader.ver}` : 'Header konnte nicht gelesen werden.');
    add(results, cdataHeader?.certificateId && cdataHeader?.partnerId ? 'ok' : 'fail', 'Samsung cdata Partner Header', cdataHeader ? 'certificateId und partnerId vorhanden.' : 'Header fehlt.');
    add(results, encryptedPayloadParts.length === 4 ? 'ok' : 'fail', 'Samsung cdata JWE Format', `Innerer Payload hat ${encryptedPayloadParts.length} Teile.`);
  }

  add(results, /^[A-Za-z0-9_-]{8,32}$/.test(refId) ? 'ok' : 'fail', 'Samsung Ref ID', `Laenge ${refId.length}.`);
  add(results, /^SW-[A-Z0-9_-]{8,40}$/.test(customerCode) ? 'ok' : 'fail', 'Samsung Customer Code', 'Kundencode wurde generiert.');

  const { data: instance, error: instanceError } = await supabase
    .from('samsung_wallet_instances')
    .select('id, ref_id, customer_code, card_id, add_flow, card_status, template_id')
    .eq('ref_id', refId)
    .maybeSingle();

  if (instanceError || !instance) {
    add(results, 'fail', 'Samsung Instance Persisted', instanceError?.message || 'Keine Instanz zur Ref-ID gefunden.');
    return results;
  }

  add(results, ['data_fetch', 'cdata'].includes(instance.add_flow) ? 'ok' : 'fail', 'Samsung Instance Add Flow', instance.add_flow);
  add(results, instance.card_status === 'pending' ? 'ok' : 'fail', 'Samsung Initial Status', instance.card_status);

  const { data: events, error: eventError } = await supabase
    .from('samsung_wallet_events')
    .select('event_type, ref_id')
    .eq('samsung_wallet_instance_id', instance.id)
    .eq('event_type', 'add_link_created');

  if (eventError) {
    add(results, 'fail', 'Samsung Event Persisted', eventError.message);
  } else {
    add(results, Array.isArray(events) && events.length > 0 ? 'ok' : 'fail', 'Samsung Event Persisted', 'add_link_created');
  }

  const samsungServerRoute = `${baseUrl}/samsung-wallet-server/cards/${encodeURIComponent(instance.card_id)}/${encodeURIComponent(refId)}`;
  const unauthorizedResponse = await fetch(samsungServerRoute, {
    method: 'GET'
  });
  const unauthorizedBody = await unauthorizedResponse.json().catch(() => ({}));

  if (unauthorizedResponse.status === 401 && unauthorizedBody.error_code === 'SAMSUNG_AUTHORIZATION_REQUIRED') {
    add(results, 'ok', 'Samsung Unauthorized Gate', `${unauthorizedResponse.status} ${unauthorizedBody.error_code}`);
  } else if (unauthorizedResponse.ok && unauthorizedBody?.card) {
    add(results, 'warn', 'Samsung Sandbox Unverified Auth', 'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH akzeptiert fehlenden Bearer. Nur Sandbox.');

    const postResponse = await fetch(samsungServerRoute, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        event: 'ADDED',
        cc2: 'CH'
      })
    });
    const postBody = await postResponse.json().catch(() => ({}));

    add(
      results,
      postResponse.ok && postBody?.ok ? 'ok' : 'fail',
      'Samsung Sandbox POST Card State',
      postResponse.ok ? 'POST Event ADDED wurde ohne Bearer im Sandbox-Fallback verarbeitet.' : `${postResponse.status} ${postBody.error_code || 'UNKNOWN'}`
    );

    const sendCardStateEvents = await countEvents(supabase, instance.id, 'send_card_state');
    const updatedInstance = await reloadSamsungInstance(supabase, instance.id);

    add(results, sendCardStateEvents > 0 ? 'ok' : 'fail', 'Samsung POST Event Persisted', `send_card_state Events: ${sendCardStateEvents}`);
    add(results, updatedInstance?.last_event === 'ADDED' ? 'ok' : 'fail', 'Samsung Last Event', updatedInstance?.last_event || 'leer');
    add(results, updatedInstance?.card_status === 'active' ? 'ok' : 'fail', 'Samsung Card Status', updatedInstance?.card_status || 'leer');
  } else {
    add(results, 'fail', 'Samsung Unauthorized Gate', `${unauthorizedResponse.status} ${unauthorizedBody.error_code || 'UNKNOWN'}`);
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
  console.log('Samsung Wallet Smoke Test');
  console.log('Secrets, Zertifikate und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.');
  console.log(`OK: ${summary.ok}  WARN: ${summary.warn}  FAIL: ${summary.fail}`);

  for (const result of results) {
    console.log(`${result.status.toUpperCase().padEnd(4)} ${result.label} - ${result.detail}`);
  }
}

if (strict && summary.fail > 0) {
  process.exitCode = 1;
}
