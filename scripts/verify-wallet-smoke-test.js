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

const smoke = read('scripts/wallet-smoke-test.js');
const runner = read('scripts/wallet-local-smoke-runner.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const audit = read('docs/WALLET_GOAL_COMPLETION_AUDIT.md');
const packageJson = read('package.json');

[
  'Wallet Smoke Test',
  '--base-url',
  '--functions',
  '--all-functions',
  '--functions-base-url',
  '--strict',
  '--json',
  'Secrets werden nicht ausgegeben.',
  '/api/config',
  '/dashboard.html',
  '/editor.html',
  '/scanner.html',
  '/claim.html',
  'claim-card',
  'claim-apple-pass',
  'google-wallet-save-link',
  'apple-wallet-webservice',
  'process-scheduled-wallet-notifications',
  'process-wallet-update-queue',
  'Access-Control-Request-Headers',
  'SUPABASE_FUNCTION_BASE_URL',
  '/functions/v1'
].forEach((needle) => assertIncludes(smoke, needle, 'Wallet-Smoke-Test-Script ist unvollständig'));

[
  'Wallet Local Smoke Runner',
  'wallet-smoke-test.js',
  '--base-url',
  '--strict',
  '--json',
  'findFreePort',
  'waitForServer',
  'startedTemporaryServer',
  'reusedExistingServer',
  'Secrets werden nicht ausgegeben.',
  'process.execPath',
  'server/index.js',
  'SIGTERM'
].forEach((needle) => assertIncludes(runner, needle, 'Wallet-Local-Smoke-Runner ist unvollständig'));

[
  'node scripts/wallet-local-smoke-runner.js',
  'node scripts/wallet-smoke-test.js',
  'node scripts/wallet-smoke-test.js --functions',
  'node scripts/wallet-smoke-test.js --base-url',
  'Smoke-Test'
].forEach((needle) => assertIncludes(readme, needle, 'README muss den Wallet Smoke Test dokumentieren'));

[
  'node scripts/wallet-local-smoke-runner.js --strict',
  'node scripts/wallet-smoke-test.js --base-url',
  'node scripts/wallet-smoke-test.js --functions',
  'Smoke-Test'
].forEach((needle) => assertIncludes(acceptance, needle, 'External Acceptance muss den Wallet Smoke Test nennen'));

[
  'scripts/wallet-smoke-test.js',
  'Smoke-Test'
].forEach((needle) => assertIncludes(context, needle, 'Wallet-Kontext muss den Wallet Smoke Test nennen'));

assertIncludes(audit, 'scripts/wallet-smoke-test.js', 'Goal-Audit muss den Wallet Smoke Test als Abnahmehilfe nennen');
assertIncludes(context, 'scripts/wallet-local-smoke-runner.js', 'Wallet-Kontext muss den lokalen Smoke Runner nennen');
assertIncludes(packageJson, 'node --check scripts/wallet-smoke-test.js', 'pnpm check muss die Smoke-Test-Syntax prüfen');
assertIncludes(packageJson, 'node --check scripts/wallet-local-smoke-runner.js', 'pnpm check muss die Local-Smoke-Runner-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-smoke-test.js', 'pnpm check muss den Smoke-Test-Vertrag prüfen');

console.log('Wallet Smoke Test ist dokumentiert und statisch abgesichert.');
