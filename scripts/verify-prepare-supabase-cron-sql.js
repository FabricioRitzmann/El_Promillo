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

const script = read('scripts/prepare-supabase-cron-sql.js');
const cronDoc = read('docs/WALLET_CRON_SETUP.md');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');
const gitignore = read('.gitignore');

[
  'Supabase Cron SQL Preparation',
  'supabase/cron.example.sql',
  'tmp/supabase-cron.sql',
  'supabase/secrets.local.env',
  'WALLET_CRON_SECRET',
  'config.automation.walletCronSecret',
  'YOUR_PROJECT_REF',
  'YOUR_WALLET_CRON_SECRET',
  '--write',
  '--force',
  '--json',
  '--project-ref',
  '--output',
  'outputContainsSecret',
  'secretsPrinted: false',
  'sqlLiteralPart',
  'replaceAll',
  'Status: Dry-run',
  'Cron-Secret-Wert und bleibt in tmp/.'
].forEach((needle) => assertIncludes(script, needle, 'Cron-SQL-Helper ist unvollständig'));

[
  'prepare-supabase-cron-sql.js',
  'tmp/supabase-cron.sql',
  'bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql',
  'WALLET_CRON_SECRET',
  'gibt den Secret-Wert nicht aus'
].forEach((needle) => {
  assertIncludes(cronDoc, needle, 'Cron-Doku muss den Cron-SQL-Helper dokumentieren');
  assertIncludes(readme, needle, 'README muss den Cron-SQL-Helper dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss den Cron-SQL-Helper dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss den Cron-SQL-Helper dokumentieren');
});

assertIncludes(gitignore, 'tmp/', 'tmp/ muss ignoriert bleiben, weil die generierte Cron-SQL den Secret-Wert enthält');
assertIncludes(packageJson, 'node --check scripts/prepare-supabase-cron-sql.js', 'pnpm check muss Cron-SQL-Helper-Syntax prüfen');
assertIncludes(packageJson, 'verify-prepare-supabase-cron-sql.js', 'pnpm check muss Cron-SQL-Helper-Vertrag prüfen');

console.log('Supabase Cron SQL Helper ist dokumentiert und statisch abgesichert.');
