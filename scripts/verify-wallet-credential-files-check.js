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

const check = read('scripts/wallet-credential-files-check.js');
const goLive = read('scripts/wallet-go-live-report.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');

[
  'Wallet Credential Files Check',
  '--json',
  '--strict',
  'X509Certificate',
  'createPrivateKey',
  'Apple WWDR Certificate',
  'Apple Pass Certificate',
  'Apple Pass Private Key',
  'Private Key passt nicht zum Pass-Zertifikat',
  'APPLE_APNS_KEY_ID',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'google-service-account*.json',
  'certs/*.p8',
  'secretsPrinted: false',
  'certificatesPrinted: false',
  'process.exitCode = 1'
].forEach((needle) => assertIncludes(check, needle, 'Credential-Datei-Check ist unvollständig'));

[
  'wallet-credential-files-check.js',
  'credentialFiles',
  'Credential-Dateien prüfen'
].forEach((needle) => assertIncludes(goLive, needle, 'Go-Live-Report muss Credential-Datei-Check integrieren'));

[
  'wallet-credential-files-check.js',
  'Wallet Credential Files Check'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss Credential-Datei-Check dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss Credential-Datei-Check dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss Credential-Datei-Check dokumentieren');
});

assertIncludes(packageJson, 'node --check scripts/wallet-credential-files-check.js', 'pnpm check muss Credential-Datei-Check-Syntax prüfen');
assertIncludes(packageJson, 'verify-wallet-credential-files-check.js', 'pnpm check muss Credential-Datei-Check-Vertrag prüfen');

console.log('Wallet Credential-Datei-Check ist dokumentiert und statisch abgesichert.');
