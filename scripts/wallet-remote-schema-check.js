import { createSupabaseAdmin } from '../server/supabaseAdmin.js';
import { loadConfig, looksConfigured } from '../server/config.js';

const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const strict = argSet.has('--strict');
const jsonOutput = argSet.has('--json');

const requiredSchema = [
  {
    table: 'operator_profiles',
    columns: ['id', 'unlock', 'created_at', 'updated_at']
  },
  {
    table: 'businesses',
    columns: ['id', 'owner_id', 'name', 'address', 'location_lat', 'location_lng', 'created_at', 'updated_at']
  },
  {
    table: 'card_templates',
    columns: ['id', 'owner_id', 'business_id', 'card_name', 'template_type', 'settings', 'created_at', 'updated_at']
  },
  {
    table: 'customer_cards',
    columns: ['id', 'owner_id', 'business_id', 'template_id', 'customer_code', 'wallet_platform', 'created_at', 'updated_at']
  },
  {
    table: 'card_instances',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'template_id',
      'customer_card_id',
      'wallet_platform',
      'apple_serial_number',
      'google_object_id',
      'push_enabled',
      'last_wallet_update_at',
      'last_notification_at',
      'notification_count_24h',
      'created_at',
      'updated_at'
    ]
  },
  {
    table: 'apple_wallet_devices',
    columns: ['id', 'device_library_identifier', 'push_token', 'created_at', 'updated_at']
  },
  {
    table: 'apple_wallet_registrations',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'template_id',
      'device_library_identifier',
      'pass_type_identifier',
      'serial_number',
      'card_instance_id',
      'authentication_token_hash',
      'created_at'
    ]
  },
  {
    table: 'apple_pass_versions',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'template_id',
      'card_instance_id',
      'serial_number',
      'pass_type_identifier',
      'pass_json',
      'assets',
      'version',
      'last_updated_at'
    ]
  },
  {
    table: 'google_wallet_objects',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'template_id',
      'card_instance_id',
      'issuer_id',
      'class_id',
      'object_id',
      'object_type',
      'save_url',
      'created_at',
      'updated_at'
    ]
  },
  {
    table: 'samsung_wallet_instances',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'template_id',
      'ref_id',
      'customer_code',
      'card_id',
      'card_type',
      'card_sub_type',
      'country_code',
      'add_flow',
      'card_status',
      'samsung_wallet_id',
      'last_event',
      'last_event_at',
      'last_synced_at',
      'created_at',
      'updated_at'
    ]
  },
  {
    table: 'samsung_wallet_events',
    columns: [
      'id',
      'samsung_wallet_instance_id',
      'owner_id',
      'business_id',
      'template_id',
      'ref_id',
      'event_type',
      'samsung_request_id',
      'samsung_event',
      'created_at'
    ]
  },
  {
    table: 'wallet_notification_campaigns',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'template_id',
      'title',
      'message',
      'target_type',
      'target_filter',
      'send_type',
      'scheduled_at',
      'location_lat',
      'location_lng',
      'location_radius_m',
      'status',
      'created_by',
      'created_at',
      'sent_at'
    ]
  },
  {
    table: 'wallet_notification_recipients',
    columns: [
      'id',
      'campaign_id',
      'owner_id',
      'business_id',
      'card_instance_id',
      'wallet_platform',
      'status',
      'provider_response',
      'error_code',
      'error_message',
      'sent_at',
      'created_at'
    ]
  },
  {
    table: 'wallet_push_logs',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'card_instance_id',
      'campaign_id',
      'wallet_platform',
      'action',
      'status',
      'request_payload',
      'response_payload',
      'error_message',
      'created_at'
    ]
  },
  {
    table: 'wallet_update_queue',
    columns: [
      'id',
      'owner_id',
      'business_id',
      'card_instance_id',
      'wallet_platform',
      'update_type',
      'payload',
      'status',
      'attempt_count',
      'next_attempt_at',
      'created_at',
      'processed_at'
    ]
  },
  {
    table: 'balance_transactions',
    columns: ['id', 'owner_id', 'business_id', 'card_instance_id', 'amount_cents', 'type', 'created_at']
  },
  {
    table: 'topup_payment_sessions',
    columns: ['id', 'owner_id', 'business_id', 'card_instance_id', 'amount_cents', 'status', 'created_at', 'updated_at']
  },
  {
    table: 'card_events',
    columns: ['id', 'owner_id', 'business_id', 'template_id', 'customer_card_id', 'event_type', 'created_at']
  }
];

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/wallet-remote-schema-check.js
  node scripts/wallet-remote-schema-check.js --strict
  node scripts/wallet-remote-schema-check.js --json

Options:
  --strict  Exit non-zero when a required table or column is missing.
  --json    Print machine-readable JSON.

The check uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from config.json or
the environment. It only verifies table/column reachability and never prints
Supabase keys, wallet tokens, certificates, APNS tokens or Save JWTs.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function add(results, status, label, detail) {
  results.push({ group: 'remote-schema', status, label, detail });
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, { ok: 0, warn: 0, fail: 0 });
}

function projectHost(config) {
  try {
    return new URL(config.supabase.url).host;
  } catch {
    return 'nicht konfiguriert';
  }
}

function schemaHint(error) {
  const message = error?.message || 'Unbekannter Supabase-Fehler';

  if (error?.code === 'PGRST205' || message.includes('schema cache')) {
    return 'Tabelle fehlt im Supabase REST-Schema. Führe supabase/schema.sql im SQL Editor komplett aus und lade danach den Schema-Cache neu.';
  }

  if (message.includes('column') && message.includes('does not exist')) {
    return 'Eine erwartete Spalte fehlt. Führe supabase/schema.sql im SQL Editor erneut komplett aus.';
  }

  return message;
}

async function missingColumns(supabase, table, columns) {
  const missing = [];

  for (const column of columns) {
    const { error } = await supabase
      .from(table)
      .select(column)
      .limit(1);

    if (error) {
      missing.push(column);
    }
  }

  return missing;
}

async function checkTable(supabase, table, columns) {
  const select = columns.join(',');
  const { error } = await supabase
    .from(table)
    .select(select, { count: 'exact' })
    .limit(1);

  if (error) {
    if (error.code === '42703') {
      const missing = await missingColumns(supabase, table, columns);

      return {
        status: 'fail',
        detail: missing.length > 0
          ? `Spalten fehlen im REST-Schema: ${missing.join(', ')}`
          : `${schemaHint(error)} (${error.code || 'NO_CODE'})`
      };
    }

    return {
      status: 'fail',
      detail: `${schemaHint(error)} (${error.code || 'NO_CODE'})`
    };
  }

  return {
    status: 'ok',
    detail: `${columns.length} erwartete Spalten im REST-Schema erreichbar`
  };
}

async function buildReport() {
  const config = loadConfig();
  const results = [];
  const admin = createSupabaseAdmin(config);

  if (!looksConfigured(config.supabase.url) || !looksConfigured(config.supabase.serviceRoleKey) || !admin) {
    add(
      results,
      'fail',
      'Supabase Admin Config',
      'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt oder ist noch ein Platzhalter.'
    );
    return {
      strict,
      projectHost: projectHost(config),
      summary: summarize(results),
      results,
      nextStep: 'config.json oder Umgebungsvariablen mit Supabase URL und Service Role Key füllen.'
    };
  }

  for (const item of requiredSchema) {
    const result = await checkTable(admin, item.table, item.columns);
    add(results, result.status, item.table, result.detail);
  }

  const missing = results.filter((result) => result.status === 'fail').map((result) => result.label);

  return {
    strict,
    projectHost: projectHost(config),
    summary: summarize(results),
    results,
    missing,
    nextStep: missing.length > 0
      ? "supabase/schema.sql im Supabase SQL Editor komplett ausführen; danach optional `notify pgrst, 'reload schema';` ausführen und diesen Check wiederholen."
      : 'Remote-Schema ist für die Wallet-Abnahme erreichbar. Danach echte Apple-/Google-/Kampagnen-Aktionen testen.'
  };
}

function printReport(report) {
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Wallet Remote Supabase Schema Check');
  console.log(`Projekt: ${report.projectHost}`);
  console.log(`OK: ${report.summary.ok}  WARN: ${report.summary.warn}  FAIL: ${report.summary.fail}`);
  console.log('Secrets und Tokens werden nicht ausgegeben.');

  for (const result of report.results) {
    const marker = result.status === 'ok' ? 'OK' : result.status === 'warn' ? 'WARN' : 'FAIL';
    console.log(`${marker.padEnd(4)} ${result.label} - ${result.detail}`);
  }

  console.log(`\nNächster Schritt: ${report.nextStep}`);
}

const report = await buildReport();
printReport(report);

if (strict && report.summary.fail > 0) {
  process.exitCode = 1;
}
