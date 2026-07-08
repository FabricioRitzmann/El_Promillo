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

const script = read('scripts/samsung-wallet-callback-evidence.js');
const samsungDoc = read('docs/samsung-wallet.md');
const bearerGuide = read('docs/SAMSUNG_BEARER_TEST_GUIDE.md');
const audit = read('docs/SAMSUNG_WALLET_GOAL_AUDIT.md');
const report = read('REPORT.md');
const packageJson = read('package.json');

assertIncludesAll('Samsung Callback Evidence Script', script, [
  'Samsung Wallet Callback Evidence',
  'samsung_wallet_instances',
  'samsung_wallet_events',
  '--instance-id',
  '--ref-id',
  '--customer-code',
  'add_link_created',
  'get_card_data',
  'send_card_state',
  'authorization_failed',
  'Secrets, Bearer, Zertifikate und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.',
  'redact(',
  'safePayload(',
  'EXTERNAL_BLOCKED'
]);

assertIncludesAll('Samsung Callback Evidence Docs', `${samsungDoc}\n${bearerGuide}\n${audit}\n${report}`, [
  'samsung-wallet-callback-evidence.js',
  'GET Card Data Evidence',
  'POST Card State Evidence',
  'authorization_failed'
]);

assertIncludesAll('Package Check', packageJson, [
  'node --check scripts/samsung-wallet-callback-evidence.js',
  'node --check scripts/verify-samsung-wallet-callback-evidence.js',
  'node scripts/verify-samsung-wallet-callback-evidence.js'
]);

console.log('Samsung Wallet Callback Evidence ist dokumentiert und statisch abgesichert.');
