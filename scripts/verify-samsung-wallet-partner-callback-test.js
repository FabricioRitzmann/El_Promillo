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

const script = read('scripts/samsung-wallet-partner-callback-test.js');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const samsungDoc = read('docs/samsung-wallet.md');
const report = read('REPORT.md');
const packageJson = read('package.json');

assertIncludesAll('Samsung Partner Callback Test Script', script, [
  'Samsung Wallet Partner Callback Test',
  '--authorization-file',
  '--get-authorization-file',
  '--post-authorization-file',
  'SAMSUNG_WALLET_TEST_AUTHORIZATION',
  'SAMSUNG_WALLET_TEST_GET_AUTHORIZATION',
  'SAMSUNG_WALLET_TEST_POST_AUTHORIZATION',
  '/samsung-wallet-server/cards/',
  'GET Card Data',
  'POST Card State',
  'get_card_data',
  'send_card_state',
  'Authorization Header, Secrets und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.'
]);

assertIncludesAll('Samsung Partner Callback Test Docs', `${acceptance}\n${samsungDoc}\n${report}`, [
  'samsung-wallet-partner-callback-test.js',
  '--authorization-file',
  '--get-authorization-file',
  '--post-authorization-file',
  'Samsung Test Tool'
]);

assertIncludesAll('Package Check', packageJson, [
  'node --check scripts/samsung-wallet-partner-callback-test.js',
  'node scripts/verify-samsung-wallet-partner-callback-test.js'
]);

console.log('Samsung Wallet Partner Callback Test ist dokumentiert und statisch abgesichert.');
