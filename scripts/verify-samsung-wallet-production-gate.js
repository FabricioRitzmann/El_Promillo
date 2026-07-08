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

const gate = read('scripts/samsung-wallet-production-gate.js');
const packageJson = read('package.json');
const samsungDoc = read('docs/samsung-wallet.md');
const setupDoc = read('docs/setup.md');
const externalAcceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const report = read('REPORT.md');

assertIncludesAll('Samsung Production Gate Script', gate, [
  'Samsung Wallet Production Gate',
  '--env-file',
  '--authorization-file',
  'SAMSUNG_WALLET_ENV',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH',
  'production',
  'prod',
  'live',
  'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
  'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
  'SAMSUNG_WALLET_PARTNER_SERVER_URL',
  'APP_PUBLIC_BASE_URL',
  'Samsung Callback Bearer',
  'blocked_external',
  'Secrets, Bearer, Zertifikate und vollstaendige URLs werden nicht ausgegeben.'
]);

assertIncludesAll('Samsung Production Gate Docs', `${samsungDoc}\n${setupDoc}\n${externalAcceptance}\n${report}`, [
  'samsung-wallet-production-gate.js',
  'SAMSUNG_WALLET_ENV=production',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false'
]);

assertIncludesAll('Package Check', packageJson, [
  'node --check scripts/samsung-wallet-production-gate.js',
  'node --check scripts/verify-samsung-wallet-production-gate.js',
  'node scripts/verify-samsung-wallet-production-gate.js'
]);

console.log('Samsung Wallet Production Gate ist dokumentiert und statisch abgesichert.');
