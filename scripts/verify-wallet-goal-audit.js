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

const audit = read('docs/WALLET_GOAL_COMPLETION_AUDIT.md');
const readme = read('README.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');

[
  '# Wallet Goal Completion Audit',
  'Stand: 2026-07-03',
  'Repo-seitig umgesetzt und statisch/lokal prüfbar',
  'Extern noch produktiv zu beweisen',
  'docs/WALLET_EXTERNAL_ACCEPTANCE.md',
  'Nachgereichter Goal-Kontext vom 2026-07-03',
  'kein Frontend-Framework',
  'Kunde/Karte/Tag',
  'Requirement Audit',
  '1. Grundregeln',
  '2. Architektur',
  '3. Apple Wallet Integration',
  '4. Google Wallet Integration',
  '5. Supabase Tabellen',
  '6. Supabase Edge Functions',
  '7. Editor UI',
  '8. Template-Feature-Matrix',
  '9. Nachrichten-Versandlogik',
  '10. Scheduled und Location-Based Notifications',
  '11. Rate Limits und Spam-Schutz',
  '12. Supabase Secrets',
  '13. Security',
  '14. Testdaten',
  '15. Tests',
  '16. Erwartetes Ergebnis',
  'pnpm check',
  'Lokaler Smoke',
  'Apple Pass auf iPhone speichern',
  'Google Save-Link speichern',
  'Business-A/B Isolation',
  'Die Nachweise aus `docs/WALLET_EXTERNAL_ACCEPTANCE.md` und `supabase/acceptance-queries.sql` sind gesammelt.'
].forEach((needle) => assertIncludes(audit, needle, 'Goal-Audit ist unvollständig'));

[
  'APPLE_TEAM_ID',
  'APPLE_PASS_TYPE_ID',
  'APPLE_WEB_SERVICE_BASE_URL',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYMENT_WEBHOOK_SECRET',
  'WALLET_CRON_SECRET'
].forEach((secret) => assertIncludes(audit, secret, 'Goal-Audit muss externe Secrets nennen'));

[
  'walletNotificationService.createCampaign()',
  'appleWalletProvider.signPass()',
  'googleWalletProvider.sendTextAndNotify()',
  'apple_wallet_registrations',
  'google_wallet_objects',
  'scripts/verify-google-wallet-contract.js',
  'scripts/verify-wallet-external-acceptance.js',
  'supabase/acceptance-queries.sql',
  'wallet_push_logs',
  'wallet_update_queue'
].forEach((needle) => assertIncludes(audit, needle, 'Goal-Audit muss technische Evidenz nennen'));

assertIncludes(readme, 'docs/WALLET_GOAL_COMPLETION_AUDIT.md', 'README muss auf das Goal-Audit verweisen');
assertIncludes(context, 'docs/WALLET_GOAL_COMPLETION_AUDIT.md', 'Wallet-Kontext muss auf das Goal-Audit verweisen');
assertIncludes(packageJson, 'verify-wallet-goal-audit.js', 'pnpm check muss das Goal-Audit prüfen');

console.log('Wallet Goal Completion Audit ist dokumentiert und prüfbar.');
