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

const helper = read('scripts/samsung-wallet-sign-partner-authorization.js');
const bearerGuide = read('docs/SAMSUNG_BEARER_TEST_GUIDE.md');
const samsungDoc = read('docs/samsung-wallet.md');
const report = read('REPORT.md');
const packageJson = read('package.json');

assertIncludesAll('Samsung Partner Authorization Helper', helper, [
  'Samsung Partner Authorization erstellt.',
  'Partner-to-Samsung',
  'Samsung-to-El-Promillo Callback-Bearer',
  '--action update',
  '--path',
  '--ref-id',
  '--output',
  'cty: \'AUTH\'',
  'ver: 3',
  'certificateId',
  'partnerId',
  'utc: Date.now()',
  'alg: \'RS256\'',
  'API',
  'RSA-SHA256',
  'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
  'SAMSUNG_WALLET_PARTNER_ID',
  'SAMSUNG_WALLET_CERTIFICATE_ID',
  '/wltex/cards/',
  '/updates',
  '/cancels'
]);

assertIncludesAll('Samsung Partner Authorization Helper Docs', `${bearerGuide}\n${samsungDoc}\n${report}`, [
  'samsung-wallet-sign-partner-authorization.js',
  'Partner-to-Samsung',
  'Samsung-to-El-Promillo',
  'kein Ersatz für den echten Samsung Callback-Bearer'
]);

assertIncludesAll('Package Check', packageJson, [
  'node --check scripts/samsung-wallet-sign-partner-authorization.js',
  'node --check scripts/verify-samsung-wallet-partner-authorization-helper.js',
  'node scripts/verify-samsung-wallet-partner-authorization-helper.js'
]);

console.log('Samsung Partner Authorization Helper ist dokumentiert und statisch abgesichert.');
