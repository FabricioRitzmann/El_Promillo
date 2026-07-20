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

const audit = read('docs/SAMSUNG_WALLET_GOAL_AUDIT.md');
const packageJson = read('package.json');
const providerRegistry = read('supabase/functions/_shared/walletProviderRegistry.ts');
const samsungProvider = read('supabase/functions/_shared/samsungWalletProvider.ts');
const claim = read('public/js/claim.js');
const detection = read('public/js/walletDeviceDetection.js');
const schema = read('supabase/schema.sql');
const report = read('REPORT.md');

assertIncludesAll('Samsung Goal Audit', audit, [
  '# Samsung Wallet Goal Audit',
  'Samsung Wallet ist als zusätzlicher Provider neben Apple und Google ergänzt.',
  'Apple- und Google-Pfade bleiben getrennt',
  'Data-Fetch-Links',
  'cdata',
  'Authorization: Bearer <JWS>',
  'SAMSUNG_WALLET_ENV=production',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=false',
  'EXTERNAL_BLOCKED',
  'Requirement Audit',
  'Provider-Architektur Apple/Google/Samsung',
  'Gemeinsames internes CardModel',
  'Robuste Device Detection',
  'GET Card Data',
  'POST Card State',
  'Update Notification',
  'Cancel Notification',
  'Keine Secrets im Frontend',
  'QR enthält keine sensiblen Daten',
  'Rate Limiting',
  'Input-/Output-Validation',
  'Error Handling',
  'REPORT.md'
]);

assertIncludesAll('Provider Registry', providerRegistry, [
  'walletCardModel',
  'walletProviders',
  'apple:',
  'google:',
  'samsung:',
  'generateAddLink',
  'detectSupport',
  'serialize',
  'deserialize',
  'mapping'
]);

assertIncludesAll('Samsung Provider', samsungProvider, [
  'pdata=',
  'cdata=',
  'verifyPartnerServerAuthorization',
  'signAuthorizationToken',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH',
  'SAMSUNG_AUTHORIZATION_UNVERIFIED_PRODUCTION_DISABLED',
  'SAMSUNG_AUTHORIZATION_PUBLIC_KEY_REQUIRED_IN_PRODUCTION'
]);

assertIncludesAll('Claim Device Routing', `${claim}\n${detection}`, [
  'claimSamsungWallet',
  'samsung-wallet-add-link',
  'detectWalletDevice',
  'samsung',
  'android',
  'manual'
]);

assertIncludesAll('Samsung SQL', schema, [
  'samsung_wallet_instances',
  'samsung_wallet_events',
  'alter table public.samsung_wallet_instances enable row level security',
  'alter table public.samsung_wallet_events enable row level security',
  'public_edge_rate_limits'
]);

assertIncludesAll('Samsung Report', report, [
  'Samsung Wallet Integration Report',
  'Neue Edge Functions',
  'Sicherheitsprüfung',
  'Teststatus',
  'Rollback'
]);

assertIncludesAll('Package Check', packageJson, [
  'node --check scripts/verify-samsung-wallet-goal-audit.js',
  'node scripts/verify-samsung-wallet-goal-audit.js'
]);

console.log('Samsung Wallet Goal Audit ist dokumentiert und gegen Prompt-Kernanforderungen abgesichert.');
