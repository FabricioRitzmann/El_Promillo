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

const smokeTest = read('scripts/samsung-wallet-smoke-test.js');
const packageJson = read('package.json');
const externalAcceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const report = read('REPORT.md');

[
  'Samsung Wallet Smoke Test',
  '--functions-base-url',
  '--template-id',
  '--strict',
  'samsung-wallet-add-link',
  'samsung-wallet-server',
  'https://a.swallet.link/atw/v3/',
  'pdata=',
  'cdata=',
  'Samsung Add Link Token',
  'Samsung Add Link Path',
  'Samsung cdata JWE Format',
  'Innerer Payload hat',
  'cdata nutzt /atw/v3/{cardId}.',
  'pdata nutzt /atw/v3/{certificateId}/{cardId}.',
  'samsung_wallet_instances',
  'samsung_wallet_events',
  'add_link_created',
  'send_card_state',
  'SAMSUNG_AUTHORIZATION_REQUIRED',
  'Samsung Sandbox Unverified Auth',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH akzeptiert fehlenden Bearer',
  'Samsung Sandbox POST Card State',
  'Samsung POST Event Persisted',
  'Samsung Card Status',
  "event: 'ADDED'",
  "cc2: 'CH'",
  'Secrets, Zertifikate und vollstaendige Add-to-Wallet-URLs werden nicht ausgegeben.',
  'redactUrl',
  'process.exitCode = 1'
].forEach((needle) => assertIncludes(smokeTest, needle, 'Samsung-Smoke-Test ist unvollständig'));

assertIncludes(packageJson, 'node --check scripts/samsung-wallet-smoke-test.js', 'pnpm check muss Samsung-Smoke-Test-Syntax prüfen');
assertIncludes(packageJson, 'verify-samsung-wallet-smoke-test.js', 'pnpm check muss Samsung-Smoke-Test-Vertrag prüfen');
assertIncludes(externalAcceptance, 'samsung-wallet-smoke-test.js', 'External Acceptance muss Samsung-Smoke-Test dokumentieren');
assertIncludes(report, 'samsung-wallet-smoke-test.js', 'REPORT muss Samsung-Smoke-Test dokumentieren');

console.log('Samsung Wallet Smoke Test ist dokumentiert und statisch abgesichert.');
