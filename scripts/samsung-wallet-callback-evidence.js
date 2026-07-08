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

function usage() {
  console.log(`Usage:
  node scripts/samsung-wallet-callback-evidence.js
  node scripts/samsung-wallet-callback-evidence.js --ref-id sw_xxx
  node scripts/samsung-wallet-callback-evidence.js --customer-code SW-XXX --strict
  node scripts/samsung-wallet-callback-evidence.js --json

Options:
  --instance-id     Samsung wallet instance UUID.
  --ref-id          Samsung refId/pdata.
  --customer-code   Public Samsung customer code.
  --limit           Number of recent events to inspect. Default: 20.
  --strict          Exit non-zero if no Samsung GET callback evidence exists.
  --json            Machine-readable output.

This script prints no Supabase keys, Samsung Bearer, private keys,
certificates or full Add-to-Wallet URLs. IDs and card codes are redacted.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  usage();
}

function configured(value) {
  return looksConfigured(String(value || '').trim());
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

function add(results, status, label, detail = '') {
  results.push({ status, label, detail });
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, { ok: 0, warn: 0, fail: 0, blocked_external: 0 });
}

function safePayload(payload = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const output = {};

  for (const key of ['error_code', 'error_message', 'samsung_event', 'cc2', 'event_source', 'callback_present', 'fields', 'method']) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      output[key] = source[key];
    }
  }

  if (source.samsung_request_id) {
    output.samsung_request_id = redact(source.samsung_request_id);
  }

  return output;
}

async function loadInstance(supabase) {
  const instanceId = String(argValue('--instance-id') || '').trim();
  const refId = String(argValue('--ref-id') || '').trim();
  const customerCode = String(argValue('--customer-code') || '').trim();
  let query = supabase
    .from('samsung_wallet_instances')
    .select('id, ref_id, customer_code, card_id, card_status, last_event, last_event_at, last_synced_at, created_at, updated_at')
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

async function loadEvents(supabase, instanceId) {
  const limit = Math.max(1, Math.min(100, Number(argValue('--limit') || 20) || 20));
  const { data, error } = await supabase
    .from('samsung_wallet_events')
    .select('id, event_type, samsung_event, samsung_request_id, request_payload, created_at')
    .eq('samsung_wallet_instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function main() {
  const results = [];
  const config = loadConfig();

  if (!configured(config.supabase?.url) || !configured(config.supabase?.serviceRoleKey)) {
    add(results, 'fail', 'Supabase Admin Config', 'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt lokal.');
    return { results, instance: null, events: [] };
  }

  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const instance = await loadInstance(supabase);

  if (!instance) {
    add(results, 'blocked_external', 'Samsung Instance', 'Keine Samsung-Instanz gefunden. Erzeuge zuerst einen Add-Link auf der Claim-Seite oder per Smoke-Test.');
    return { results, instance: null, events: [] };
  }

  const events = await loadEvents(supabase, instance.id);
  const eventCounts = events.reduce((counts, event) => {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    return counts;
  }, {});
  const hasAddLink = eventCounts.add_link_created > 0;
  const hasGet = eventCounts.get_card_data > 0;
  const hasPost = eventCounts.send_card_state > 0;
  const hasAuthFailed = eventCounts.authorization_failed > 0;

  add(results, 'ok', 'Samsung Instance', `Status ${instance.card_status || 'unknown'}, refId ${redact(instance.ref_id)}, Kundencode ${redact(instance.customer_code)}.`);
  add(results, hasAddLink ? 'ok' : 'warn', 'Add-Link Evidence', hasAddLink ? `add_link_created Events: ${eventCounts.add_link_created}` : 'Kein add_link_created Event im untersuchten Fenster.');
  add(results, hasGet ? 'ok' : 'blocked_external', 'GET Card Data Evidence', hasGet ? `get_card_data Events: ${eventCounts.get_card_data}` : 'Noch kein Samsung GET Card Data Callback sichtbar.');
  add(results, hasPost ? 'ok' : 'warn', 'POST Card State Evidence', hasPost ? `send_card_state Events: ${eventCounts.send_card_state}` : 'Noch kein Samsung POST Card State Callback sichtbar.');
  add(results, hasAuthFailed ? 'warn' : 'ok', 'Authorization Failures', hasAuthFailed ? `authorization_failed Events: ${eventCounts.authorization_failed}` : 'Keine Authorization-Fehler im untersuchten Fenster.');

  if (instance.last_event) {
    add(results, 'ok', 'Latest Samsung State', `${instance.last_event} / ${instance.card_status || 'unknown'} / ${instance.last_event_at || 'kein Zeitstempel'}`);
  }

  return {
    results,
    instance: {
      id: redact(instance.id),
      ref_id: redact(instance.ref_id),
      customer_code: redact(instance.customer_code),
      card_id: redact(instance.card_id),
      card_status: instance.card_status,
      last_event: instance.last_event,
      last_event_at: instance.last_event_at,
      last_synced_at: instance.last_synced_at,
      created_at: instance.created_at,
      updated_at: instance.updated_at
    },
    events: events.map((event) => ({
      event_type: event.event_type,
      samsung_event: event.samsung_event || null,
      samsung_request_id: redact(event.samsung_request_id),
      created_at: event.created_at,
      payload: safePayload(event.request_payload)
    }))
  };
}

let output;

try {
  output = await main();
} catch (error) {
  output = {
    results: [{
      status: 'fail',
      label: 'Samsung Callback Evidence',
      detail: error instanceof Error ? error.message : 'Unbekannter Fehler.'
    }],
    instance: null,
    events: []
  };
}

const summary = summarize(output.results);

if (jsonOutput) {
  console.log(JSON.stringify({ summary, ...output }, null, 2));
} else {
  console.log('Samsung Wallet Callback Evidence');
  console.log('Secrets, Bearer, Zertifikate und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.');
  console.log(`OK: ${summary.ok}  WARN: ${summary.warn}  FAIL: ${summary.fail}  EXTERNAL_BLOCKED: ${summary.blocked_external}`);

  for (const result of output.results) {
    console.log(`${result.status.toUpperCase().padEnd(16)} ${result.label} - ${result.detail}`);
  }

  if (output.events.length > 0) {
    console.log('Recent Events:');
    for (const event of output.events.slice(0, 10)) {
      const payloadBits = Object.entries(event.payload || {})
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      console.log(`- ${event.created_at} ${event.event_type}${event.samsung_event ? `:${event.samsung_event}` : ''}${payloadBits ? ` (${payloadBits})` : ''}`);
    }
  }
}

if (strict && (summary.fail > 0 || summary.blocked_external > 0)) {
  process.exitCode = 1;
}
