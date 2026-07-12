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

function assertIncludesAll(label, source, needles) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

const script = read('scripts/samsung-wallet-final-readiness.js');
const bearerGuide = read('docs/SAMSUNG_BEARER_TEST_GUIDE.md');
const samsungDoc = read('docs/samsung-wallet.md');
const externalAcceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const report = read('REPORT.md');
const packageJson = read('package.json');

assertIncludesAll('Samsung Final Readiness Script', script, [
  'Samsung Wallet Final Readiness',
  'verify-samsung-wallet-contract.js',
  'verify-samsung-wallet-error-paths.js',
  'verify-samsung-wallet-partner-callback-test.js',
  'wallet-remote-schema-check.js',
  'wallet-edge-functions-report.js',
  'samsung-wallet-smoke-test.js',
  'samsung-wallet-callback-evidence.js',
  'samsungEvidenceDetail',
  'Samsung Verified Callback Evidence',
  'Verified Auth Evidence',
  'samsung-wallet-partner-callback-test.js',
  "'--strict'",
  'blocked_external',
  'defaultBearerFile',
  'tmp/samsung-bearer.txt',
  'Secrets, Bearer, Zertifikate und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.'
]);

assertIncludesAll('Samsung Final Readiness Docs', `${bearerGuide}\n${samsungDoc}\n${externalAcceptance}\n${report}`, [
  'samsung-wallet-final-readiness.js',
  'tmp/samsung-bearer.txt',
  'Authorization: Bearer <JWS>',
  'Partner-Key-JWT Ist Nicht Derselbe Bearer',
  'cty=AUTH',
  'API.method',
  'API.path',
  'SAMSUNG_AUTHORIZATION_HEADER_INVALID',
  'Samsung Verified Callback Evidence'
]);

assertIncludesAll('Package Check', packageJson, [
  'node --check scripts/samsung-wallet-final-readiness.js',
  'node --check scripts/verify-samsung-wallet-final-readiness.js',
  'node scripts/verify-samsung-wallet-final-readiness.js'
]);

console.log('Samsung Wallet Final Readiness Check ist dokumentiert und statisch abgesichert.');
