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

const guide = read('docs/WALLET_EXTERNAL_CREDENTIALS.md');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const plan = read('docs/WALLET_IMPLEMENTATION_PLAN.md');
const packageJson = read('package.json');

[
  '# Wallet External Credentials',
  'Keine echten Werte in diese Datei schreiben',
  'Apple Wallet Identifiers und Pass Type ID Certificate',
  'Apple APNs Private Key erstellen',
  'Google Wallet Issuer Onboarding',
  'Google Wallet REST API Credentials',
  'Google Wallet Service Account Begriff',
  'Google Issuer ID Hinweis',
  'node scripts/wallet-credential-files-check.js --strict',
  'node scripts/wallet-go-live-report.js --skip-remote',
  'certs/AppleWWDRCAG4.pem',
  'certs/pass-cert.pem',
  'certs/pass-key.pem',
  'APPLE_TEAM_ID',
  'APPLE_PASS_TYPE_ID',
  'APPLE_WWDR_CERT',
  'APPLE_PASS_CERT',
  'APPLE_PASS_KEY',
  'APPLE_PASS_KEY_PASSWORD',
  'APPLE_APNS_KEY_ID',
  'APPLE_APNS_TEAM_ID',
  'APPLE_APNS_AUTH_KEY',
  'AuthKey_XXXXXXXXXX.p8',
  'APPLE_WEB_SERVICE_BASE_URL',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'google-service-account.json',
  'Service Account',
  'Developer',
  'supabase/secrets.local.env',
  'node scripts/prepare-supabase-secrets-local.js --write --force',
  'bash scripts/set-supabase-secrets.sh --dry-run',
  'bash scripts/set-supabase-secrets.sh',
  'supabase secrets set APPLE_APNS_AUTH_KEY="$(cat certs/AuthKey_XXXXXXXXXX.p8)"',
  'supabase secrets set GOOGLE_WALLET_SERVICE_ACCOUNT_JSON="$(cat google-service-account.json)"',
  'node scripts/wallet-remote-schema-check.js --strict',
  'node scripts/wallet-smoke-test.js --functions',
  'node scripts/wallet-acceptance-audit.js --strict'
].forEach((needle) => assertIncludes(guide, needle, 'Wallet External Credentials Guide ist unvollständig'));

[
  'https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates/',
  'https://developer.apple.com/help/account/keys/create-a-private-key/',
  'https://developer.apple.com/help/account/keys/revoke-edit-and-download-keys/',
  'https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes',
  'https://developers.google.com/wallet/generic/getting-started/issuer-onboarding',
  'https://developers.google.com/wallet/generic/getting-started/auth/rest',
  'https://developers.google.com/wallet/generic/resources/terminology',
  'https://developers.google.com/wallet/smart-tap/introduction/collection-identifiers'
].forEach((url) => assertIncludes(guide, url, 'Guide muss offizielle Referenz verlinken'));

[
  'docs/WALLET_EXTERNAL_CREDENTIALS.md',
  'Wallet External Credentials'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss External Credentials Guide verlinken');
  assertIncludes(acceptance, needle, 'External Acceptance muss External Credentials Guide verlinken');
  assertIncludes(context, needle, 'Wallet Integration Context muss External Credentials Guide verlinken');
  assertIncludes(plan, needle, 'Wallet Implementation Plan muss External Credentials Guide verlinken');
});

assertIncludes(packageJson, 'node --check scripts/verify-wallet-external-credentials.js', 'pnpm check muss External-Credentials-Verifier syntaktisch prüfen');
assertIncludes(packageJson, 'verify-wallet-external-credentials.js', 'pnpm check muss External-Credentials-Verifier ausführen');

console.log('Wallet External Credentials Guide ist dokumentiert und statisch abgesichert.');
