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

const script = read('scripts/wallet-go-live-runbook.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');
const gitignore = read('.gitignore');

[
  'Wallet Go-Live Runbook',
  '--write',
  '--force',
  '--json',
  '--skip-remote',
  'tmp/wallet-go-live-runbook.md',
  'wallet-go-live-report.js',
  'wallet-sql-editor-apply-report.js',
  'wallet-edge-functions-report.js',
  'prepare-supabase-cron-sql.js --json',
  'prepare-supabase-cron-sql.js --write --force',
  'tmp/supabase-cron.sql',
  'apply-supabase-schema.sh --file tmp/supabase-cron.sql',
  'Cron-SQL lokal',
  'WALLET_CRON_SECRET',
  'Supabase Deploy CLI',
  'Supabase CLI Auth',
  'set-supabase-secrets.sh --dry-run',
  'set-supabase-secrets.sh',
  'wallet-credential-files-check.js --strict',
  'wallet-remote-schema-check.js --strict',
  'deploy-wallet-functions.sh',
  'deploy-wallet-functions.sh --project-ref',
  'deploy-wallet-functions.sh --skip-auth-check',
  'SUPABASE_CLI_BIN',
  'SUPABASE_ACCESS_TOKEN',
  'Falls config.json keine Supabase URL enthält',
  'wallet-acceptance-audit.js --strict',
  'supabase/acceptance-queries.sql',
  'APPLE_APNS_KEY_ID',
  'GOOGLE_WALLET_ISSUER_ID',
  'apple_wallet_registrations',
  'google_wallet_objects',
  'Business-A/B Isolation',
  'secretsPrinted: false',
  'Supabase Keys',
  'APNS Tokens',
  'Google Service-Account-JSON',
  'Wallet Save JWTs'
].forEach((needle) => assertIncludes(script, needle, 'Go-Live-Runbook-Script ist unvollständig'));

[
  'Wallet Go-Live Runbook',
  'wallet-go-live-runbook.js',
  'tmp/wallet-go-live-runbook.md'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss Go-Live-Runbook dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss Go-Live-Runbook dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss Go-Live-Runbook dokumentieren');
});

assertIncludes(gitignore, 'tmp/', 'tmp/ muss ignoriert bleiben, damit generierte Runbooks nicht versioniert werden');
assertIncludes(packageJson, 'node --check scripts/wallet-go-live-runbook.js', 'pnpm check muss Go-Live-Runbook-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-go-live-runbook.js', 'pnpm check muss Go-Live-Runbook-Vertrag prüfen');

console.log('Wallet Go-Live Runbook ist dokumentiert und statisch abgesichert.');
