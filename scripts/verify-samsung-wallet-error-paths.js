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

const provider = read('supabase/functions/_shared/samsungWalletProvider.ts');
const addLink = read('supabase/functions/samsung-wallet-add-link/index.ts');
const server = read('supabase/functions/samsung-wallet-server/index.ts');
const update = read('supabase/functions/update-samsung-wallet-pass/index.ts');
const smoke = read('scripts/samsung-wallet-smoke-test.js');
const packageJson = read('package.json');

assertIncludesAll('Samsung Missing ENV', provider, [
  'SAMSUNG_WALLET_CONFIG_MISSING',
  'SAMSUNG_WALLET_PRIVATE_KEY_MISSING',
  'SAMSUNG_WALLET_PUBLIC_ASSET_URL_MISSING',
  'SAMSUNG_AUTHORIZATION_PUBLIC_KEY_MISSING',
  'SAMSUNG_WALLET_AUTH_SIGNING_FAILED',
  'SAMSUNG_WALLET_API_REQUEST_FAILED'
]);

assertIncludesAll('Samsung Missing Partner/Auth', provider, [
  'SAMSUNG_AUTHORIZATION_REQUIRED',
  'SAMSUNG_AUTHORIZATION_PARTNER_MISMATCH',
  'SAMSUNG_AUTHORIZATION_CERTIFICATE_MISMATCH',
  'SAMSUNG_AUTHORIZATION_API_MISMATCH',
  'SAMSUNG_AUTHORIZATION_REF_MISMATCH',
  'SAMSUNG_AUTHORIZATION_SIGNATURE_INVALID',
  'SAMSUNG_AUTHORIZATION_UNVERIFIED_MISSING',
  'SAMSUNG_AUTHORIZATION_UNVERIFIED_PRODUCTION_DISABLED',
  'SAMSUNG_AUTHORIZATION_PUBLIC_KEY_REQUIRED_IN_PRODUCTION'
]);

assertIncludesAll('Samsung Add-Link Missing Card/Template', addLink, [
  'CLAIM_LINK_REQUIRED',
  'TEMPLATE_NOT_FOUND',
  'SAMSUNG_INSTANCE_SAVE_FAILED',
  'SAMSUNG_EVENT_SAVE_FAILED',
  'SAMSUNG_WALLET_CONFIG_MISSING'
]);

assertIncludesAll('Samsung Partner Server Error Paths', server, [
  'SAMSUNG_ROUTE_NOT_FOUND',
  'SAMSUNG_ROUTE_PARAMS_REQUIRED',
  'SAMSUNG_AUTHORIZATION_INVALID',
  'insertSamsungAuthorizationFailure',
  'authorization_failed',
  'SAMSUNG_CARD_DATA_FAILED',
  'samsungStateBody',
  'event_source',
  'get_card_data',
  'send_card_state',
  'noContent(204)'
]);

assertIncludesAll('Samsung Update Error Paths', update, [
  'SAMSUNG_INSTANCE_IDENTIFIER_REQUIRED',
  'SAMSUNG_INSTANCE_NOT_FOUND',
  'SAMSUNG_ACTION_INVALID',
  'SAMSUNG_UPDATE_FIELDS_INVALID',
  'SAMSUNG_REF_ID_INVALID',
  'SAMSUNG_EVENT_SAVE_FAILED',
  'SAMSUNG_INSTANCE_STATE_SAVE_FAILED'
]);

assertIncludesAll('Samsung Smoke Unauthorized Coverage', smoke, [
  'Samsung Unauthorized Gate',
  'SAMSUNG_AUTHORIZATION_REQUIRED',
  'unauthorizedResponse.status === 401',
  'Samsung Add Link Token',
  'Samsung Instance Add Flow',
  'Samsung Event Persisted'
]);

assert(
  packageJson.includes('verify-samsung-wallet-error-paths.js'),
  'package.json muss verify-samsung-wallet-error-paths.js in pnpm check ausführen.'
);

console.log('Samsung Wallet Fehlerpfade fuer Missing ENV, Missing Card, Missing Partner und Unauthorized sind abgesichert.');
