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

const report = read('scripts/wallet-go-live-report.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');

[
  'Wallet Go-Live Report',
  '--json',
  '--skip-remote',
  '--strict',
  'wallet-readiness-report.js',
  'wallet-remote-schema-check.js',
  'wallet-edge-functions-report.js',
  'prepare-supabase-secrets-local.js --write',
  'prepare-supabase-sql-editor-bundle.js --write --force',
  'prepare-supabase-cron-sql.js --write --force',
  'tmp/supabase-cron.sql',
  'Cron-SQL',
  'bash scripts/set-supabase-secrets.sh',
  'bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql',
  'Supabase CLI für Secret-Writes authentifizieren',
  'tmp/supabase-schema-sql-editor-bundle.sql',
  'Wallet Edge Functions deployen: bash scripts/deploy-wallet-functions.sh',
  'Falls config.json keine Supabase URL enthält',
  'deployToolStatus',
  'deployTool',
  'Supabase Deploy CLI',
  'SUPABASE_ACCESS_TOKEN',
  'pnpm dlx supabase',
  'npx --yes supabase',
  'edgeFunctions',
  'secretsPrinted: false',
  'goLiveReady',
  'process.exitCode = 1',
  'Secrets, Zertifikate, Tokens und Save-JWTs werden nicht ausgegeben.'
].forEach((needle) => assertIncludes(report, needle, 'Go-Live-Report-Script ist unvollständig'));

[
  'wallet-go-live-report.js',
  'Wallet Go-Live Report',
  '--skip-remote'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss Go-Live-Report dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss Go-Live-Report dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss Go-Live-Report dokumentieren');
});

assertIncludes(packageJson, 'node --check scripts/wallet-go-live-report.js', 'pnpm check muss Go-Live-Report-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-go-live-report.js', 'pnpm check muss Go-Live-Report-Vertrag prüfen');

console.log('Wallet Go-Live Report ist dokumentiert und statisch abgesichert.');
