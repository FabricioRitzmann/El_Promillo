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

const schemaCheck = read('scripts/wallet-remote-schema-check.js');
const acceptanceAudit = read('scripts/wallet-acceptance-audit.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');

[
  'Wallet Remote Supabase Schema Check',
  '--strict',
  '--json',
  'requiredSchema',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PGRST205',
  '42703',
  'schema cache',
  'missingColumns',
  'Spalten fehlen im REST-Schema',
  'supabase/schema.sql',
  "notify pgrst, 'reload schema';",
  'operator_profiles',
  'businesses',
  'card_templates',
  'customer_cards',
  'card_instances',
  'apple_wallet_devices',
  'apple_wallet_registrations',
  'apple_pass_versions',
  'google_wallet_objects',
  'samsung_wallet_instances',
  'samsung_wallet_events',
  'wallet_notification_campaigns',
  'wallet_notification_recipients',
  'wallet_push_logs',
  'wallet_update_queue',
  'balance_transactions',
  'topup_payment_sessions',
  'card_events',
  'Secrets und Tokens werden nicht ausgegeben.',
  'process.exitCode = 1'
].forEach((needle) => assertIncludes(schemaCheck, needle, 'Remote-Schema-Check ist unvollständig'));

assert(
  !schemaCheck.includes('head: true'),
  'Remote-Schema-Check darf keine HEAD-Counts nutzen, weil Schema-Cache-Fehler sichtbar bleiben müssen.'
);

[
  'wallet-remote-schema-check.js',
  'Wallet Remote Supabase Schema Check',
  "notify pgrst, 'reload schema';"
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss den Remote-Schema-Check dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss den Remote-Schema-Check dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss den Remote-Schema-Check dokumentieren');
});

assertIncludes(acceptanceAudit, 'schema cache', 'Acceptance Audit muss Schema-Cache-Fehler sichtbar machen');
assertIncludes(packageJson, 'node --check scripts/wallet-remote-schema-check.js', 'pnpm check muss Remote-Schema-Check-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-remote-schema-check.js', 'pnpm check muss Remote-Schema-Check-Vertrag prüfen');

console.log('Wallet Remote-Schema-Check ist dokumentiert und statisch abgesichert.');
