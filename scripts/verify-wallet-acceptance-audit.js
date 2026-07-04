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

const audit = read('scripts/wallet-acceptance-audit.js');
const readme = read('README.md');
const external = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const goalAudit = read('docs/WALLET_GOAL_COMPLETION_AUDIT.md');
const plan = read('docs/WALLET_IMPLEMENTATION_PLAN.md');
const packageJson = read('package.json');

[
  'Wallet External Acceptance Audit',
  '--strict',
  '--json',
  '--business-id',
  '--owner-id',
  'Secrets, Token, Save-JWTs',
  'expectedTables',
  'operator_profiles',
  'wallet_notification_campaigns',
  'wallet_notification_recipients',
  'wallet_push_logs',
  'wallet_update_queue',
  'apple_wallet_registrations',
  'apple_pass_versions',
  'google_wallet_objects',
  'topup_payment_sessions',
  'balance_transactions',
  'apple_device_registered',
  'apple_pass_downloaded',
  'google_wallet_save_link',
  'google_text_and_notify',
  'google_object_message_fallback',
  'Business-Isolation Gesamt',
  "['sent', 'failed', 'cancelled']",
  "scope.ownerId ? unlockedQuery.eq('id', scope.ownerId)",
  "count: 'exact' }).limit(1)",
  'supabase/acceptance-queries.sql'
].forEach((needle) => assertIncludes(audit, needle, 'Acceptance-Audit-Script ist unvollständig'));

assert(
  !audit.includes("head: true"),
  'Acceptance-Audit darf keine HEAD-Counts nutzen, weil Supabase Schema-Cache-Fehler dabei maskieren kann.'
);

[
  'node scripts/wallet-acceptance-audit.js',
  'node scripts/wallet-acceptance-audit.js --strict',
  'Wallet External Acceptance Audit'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss Acceptance Audit dokumentieren');
  assertIncludes(external, needle, 'External Acceptance muss Acceptance Audit dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss Acceptance Audit dokumentieren');
});

assertIncludes(goalAudit, 'scripts/wallet-acceptance-audit.js', 'Goal Audit muss Acceptance Audit nennen');
assertIncludes(plan, 'scripts/wallet-acceptance-audit.js', 'Implementation Plan muss Acceptance Audit nennen');
assertIncludes(packageJson, 'node --check scripts/wallet-acceptance-audit.js', 'pnpm check muss Acceptance-Audit-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-acceptance-audit.js', 'pnpm check muss Acceptance-Audit-Vertrag prüfen');

console.log('Wallet Acceptance Audit ist dokumentiert und statisch abgesichert.');
