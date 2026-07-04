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

const report = read('scripts/wallet-readiness-report.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const packageJson = read('package.json');

[
  'Wallet Readiness Report',
  '--strict',
  '--json',
  'supabase/secrets.local.env',
  'loadLocalSecretsEnv',
  'localSecretsLoaded',
  'Secrets werden nur als Status gezeigt',
  'Lokale Secret-Datei',
  'Wert redigiert',
  'requiredEdgeFunctions',
  'requiredNoJwtFunctions',
  'APPLE_WEB_SERVICE_BASE_URL',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'PAYMENT_WEBHOOK_SECRET',
  'WALLET_CRON_SECRET',
  'WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H',
  'publicUrls.supabaseFunctionBaseUrl',
  'deriveFunctionsBaseUrl',
  '/functions/v1',
  '/apple-wallet-webservice',
  'googleWallet.desiredPassTypes',
  'generic',
  'loyalty',
  'offer',
  'eventTicket',
  'process.exitCode = 1'
].forEach((needle) => assertIncludes(report, needle, 'Readiness-Report-Script ist unvollständig'));

[
  'wallet-readiness-report.js',
  '--strict',
  'Wallet Readiness Report'
].forEach((needle) => assertIncludes(readme, needle, 'README muss den Readiness Report dokumentieren'));

[
  'wallet-readiness-report.js',
  'Readiness'
].forEach((needle) => assertIncludes(acceptance, needle, 'External Acceptance muss den Readiness Report nennen'));

assertIncludes(packageJson, 'node --check scripts/wallet-readiness-report.js', 'pnpm check muss die Readiness-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-readiness-report.js', 'pnpm check muss den Readiness-Vertrag prüfen');

console.log('Wallet Readiness Report ist dokumentiert und statisch abgesichert.');
