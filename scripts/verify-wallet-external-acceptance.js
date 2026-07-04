import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), `${message}: ${needle}`);
}

const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const acceptanceQueries = read('supabase/acceptance-queries.sql');
const readme = read('README.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const audit = read('docs/WALLET_GOAL_COMPLETION_AUDIT.md');
const packageJson = read('package.json');

[
  '# Wallet External Acceptance',
  'supabase/schema.sql',
  'supabase/test-data.sql',
  'supabase/config.toml',
  'APP_PUBLIC_BASE_URL',
  'APPLE_WEB_SERVICE_BASE_URL',
  'WALLET_CRON_SECRET',
  'PAYMENT_WEBHOOK_SECRET',
  'supabase/acceptance-queries.sql',
  'node scripts/wallet-smoke-test.js --base-url',
  'node scripts/wallet-smoke-test.js --functions',
  'node scripts/wallet-acceptance-audit.js --strict',
  'APPLE_TEAM_ID',
  'APPLE_PASS_TYPE_ID',
  'APPLE_WWDR_CERT',
  'APPLE_PASS_CERT',
  'APPLE_PASS_KEY',
  'APPLE_PASS_KEY_PASSWORD',
  'APPLE_APNS_KEY_ID',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H',
  'claim-apple-pass',
  'apple_wallet_devices',
  'apple_wallet_registrations',
  'apple_pass_versions',
  'apple_device_registered',
  'send-apple-wallet-update',
  'google-wallet-save-link',
  'google_wallet_objects',
  'google_text_and_notify',
  'google_object_message_fallback',
  'wallet_notification_campaigns',
  'wallet_notification_recipients',
  'wallet_push_logs',
  'supabase/cron.example.sql',
  'wallet-process-scheduled-notifications',
  'wallet-process-update-queue',
  'location_based',
  'Business-Isolation',
  'confirm-topup-payment',
  'confirm_card_topup',
  'balance_transactions',
  'card_events',
  'pnpm check'
].forEach((needle) => assertIncludes(acceptance, needle, 'External Acceptance Doku ist unvollständig'));

[
  'Apple Wallet Abnahme',
  'Google Wallet Abnahme',
  'Scheduled, Location und Queue',
  'Business-Isolation',
  'Payment/Topup',
  'Abschlussnachweis'
].forEach((heading) => assertIncludes(acceptance, heading, 'External Acceptance Doku braucht Abschnitt'));

assertIncludes(readme, 'docs/WALLET_EXTERNAL_ACCEPTANCE.md', 'README muss auf die externe Abnahme verweisen');
assertIncludes(readme, 'supabase/acceptance-queries.sql', 'README muss die Acceptance Queries nennen');
assertIncludes(readme, 'node scripts/wallet-smoke-test.js', 'README muss den manuellen Smoke-Test nennen');
assertIncludes(readme, 'node scripts/wallet-acceptance-audit.js', 'README muss den Acceptance Audit nennen');
assertIncludes(context, 'docs/WALLET_EXTERNAL_ACCEPTANCE.md', 'Wallet-Kontext muss auf die externe Abnahme verweisen');
assertIncludes(context, 'supabase/acceptance-queries.sql', 'Wallet-Kontext muss die Acceptance Queries nennen');
assertIncludes(context, 'scripts/wallet-smoke-test.js', 'Wallet-Kontext muss den Smoke-Test nennen');
assertIncludes(context, 'scripts/wallet-acceptance-audit.js', 'Wallet-Kontext muss den Acceptance Audit nennen');
assertIncludes(audit, 'docs/WALLET_EXTERNAL_ACCEPTANCE.md', 'Goal-Audit muss auf die externe Abnahme verweisen');
assertIncludes(audit, 'supabase/acceptance-queries.sql', 'Goal-Audit muss die Acceptance Queries nennen');
assertIncludes(audit, 'scripts/wallet-smoke-test.js', 'Goal-Audit muss den Smoke-Test nennen');
assertIncludes(audit, 'scripts/wallet-acceptance-audit.js', 'Goal-Audit muss den Acceptance Audit nennen');
assertIncludes(packageJson, 'verify-wallet-external-acceptance.js', 'pnpm check muss die externe Abnahme prüfen');

[
  'Wallet External Acceptance Queries',
  'Read-only',
  'schema_tables',
  'operator_unlock_summary',
  'business_template_card_summary',
  'apple_registrations_latest',
  'apple_pass_versions_latest',
  'apple_wallet_logs_latest',
  'google_wallet_objects_latest',
  'google_wallet_logs_latest',
  'campaign_summary_latest',
  'visible_notification_count_check',
  'wallet_update_queue_summary',
  'cron_jobs',
  'topup_sessions_latest',
  'balance_transactions_latest',
  'wallet_context_mismatch_check',
  'apple_wallet_registrations',
  'apple_pass_versions',
  'google_wallet_objects',
  'wallet_push_logs',
  'wallet_notification_campaigns',
  'wallet_notification_recipients',
  'wallet_update_queue',
  'cron.job',
  'topup_payment_sessions',
  'balance_transactions'
].forEach((needle) => assertIncludes(acceptanceQueries, needle, 'Acceptance Queries sind unvollständig'));

console.log('Wallet External Acceptance Checkliste ist dokumentiert und maschinenprüfbar.');
