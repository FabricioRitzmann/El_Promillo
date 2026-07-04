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

const script = read('scripts/wallet-sql-editor-apply-report.js');
const goLive = read('scripts/wallet-go-live-report.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');

[
  'Wallet SQL Editor Apply Report',
  '--json',
  '--skip-remote',
  '--strict',
  'wallet-remote-schema-check.js',
  'prepare-supabase-sql-editor-bundle.js --write --force',
  'prepare-supabase-sql-editor-chunks.js --write --force',
  'tmp/supabase-schema-sql-editor-bundle.sql',
  'tmp/supabase-schema-sql-editor-chunks/',
  "notify pgrst, 'reload schema';",
  'recommendedMode',
  'readyForRemoteWalletTests',
  'secretsPrinted: false',
  'containsSecrets: false',
  'process.exitCode = 1',
  'Supabase SQL Editor'
].forEach((needle) => assertIncludes(script, needle, 'SQL-Editor-Apply-Report ist unvollständig'));

[
  'wallet-sql-editor-apply-report.js',
  'Wallet SQL Editor Apply Report'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss SQL-Editor-Apply-Report dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss SQL-Editor-Apply-Report dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss SQL-Editor-Apply-Report dokumentieren');
});

[
  'tmp/supabase-schema-sql-editor-bundle.sql',
  'tmp/supabase-schema-sql-editor-chunks/',
  'node scripts/wallet-remote-schema-check.js --strict'
].forEach((needle) => assertIncludes(goLive, needle, 'Go-Live-Report muss SQL-Editor-Schritte nennen'));

assertIncludes(packageJson, 'node --check scripts/wallet-sql-editor-apply-report.js', 'pnpm check muss SQL-Editor-Apply-Report-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-sql-editor-apply-report.js', 'pnpm check muss SQL-Editor-Apply-Report-Vertrag prüfen');

console.log('Wallet SQL Editor Apply Report ist dokumentiert und statisch abgesichert.');
