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

function assertFile(relativePath) {
  assert(fs.existsSync(path.join(rootDir, relativePath)), `Datei fehlt: ${relativePath}`);
}

function assertIncludesAll(label, source, needles) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

function exportedObjectBody(relativePath, exportName) {
  const content = read(relativePath);
  const start = content.indexOf(`export const ${exportName} = {`);

  assert(start >= 0, `${exportName} wurde in ${relativePath} nicht gefunden.`);

  return content.slice(start);
}

function assertObjectMethods(relativePath, exportName, methods) {
  const body = exportedObjectBody(relativePath, exportName);

  for (const method of methods) {
    const pattern = new RegExp(`(?:async\\s+)?${method}\\s*\\(`);

    assert(pattern.test(body), `${exportName}.${method} fehlt in ${relativePath}.`);
  }
}

const providerPath = 'supabase/functions/_shared/samsungWalletProvider.ts';
const addLinkPath = 'supabase/functions/samsung-wallet-add-link/index.ts';
const serverPath = 'supabase/functions/samsung-wallet-server/index.ts';
const updatePath = 'supabase/functions/update-samsung-wallet-pass/index.ts';

[
  providerPath,
  addLinkPath,
  serverPath,
  updatePath,
  'docs/samsung-wallet.md',
  'docs/provider-architecture.md',
  'docs/wallet.md',
  'docs/setup.md',
  'REPORT.md'
].forEach(assertFile);

const provider = read(providerPath);
const addLink = read(addLinkPath);
const server = read(serverPath);
const update = read(updatePath);
const schema = read('supabase/schema.sql');
const config = read('supabase/config.toml');
const deploy = read('scripts/deploy-wallet-functions.sh');
const secrets = read('supabase/secrets.example.env');
const setupDoc = read('docs/samsung-wallet.md');
const globalSetupDoc = read('docs/setup.md');
const providerDoc = read('docs/provider-architecture.md');
const walletDoc = read('docs/wallet.md');
const report = read('REPORT.md');

assertObjectMethods(providerPath, 'samsungWalletProvider', [
  'create',
  'update',
  'delete',
  'revoke',
  'generateAddLink',
  'generateQRCode',
  'detectSupport',
  'serialize',
  'deserialize',
  'mapping',
  'cardDataForInstance',
  'verifyPartnerServerAuthorization',
  'signAuthorizationToken'
]);

assertIncludesAll('Samsung Provider Data-Fetch/Auth', provider, [
  'https://a.swallet.link/atw/v3/',
  'pdata=',
  'SAMSUNG_WALLET_PARTNER_ID',
  'SAMSUNG_WALLET_CARD_ID',
  'SAMSUNG_WALLET_CARD_TYPE',
  'SAMSUNG_WALLET_CERTIFICATE_ID',
  'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
  'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH',
  'SAMSUNG_WALLET_RD_CLICK_URL',
  'SAMSUNG_WALLET_RD_IMPRESSION_URL',
  'SAMSUNG_WALLET_PARTNER_SERVER_URL',
  'SAMSUNG_AUTHORIZATION_PUBLIC_KEY_MISSING',
  'SAMSUNG_AUTHORIZATION_SIGNATURE_INVALID',
  'verifyPartnerServerAuthorization',
  'signAuthorizationToken',
  'buildSamsungLoyaltyAttributes',
  'buildSamsungGenericAttributes',
  'QRCODE',
  'detectSupport(userAgent',
  'hasSamsungDeviceHint',
  "'sm-'",
  "'galaxy'"
]);

assertIncludesAll('Samsung Add-Link Function', addLink, [
  'Deno.serve(async (request)',
  "request.method === 'OPTIONS'",
  'corsHeaders',
  'errorJson(error)',
  'SUPABASE_EDGE_CONFIG_MISSING',
  "enforcePublicClaimRateLimit(supabaseAdmin, request, 'samsung-wallet-add-link')",
  'samsungWalletProvider.randomRefId()',
  ".from('samsung_wallet_instances')",
  ".from('samsung_wallet_events')",
  'SAMSUNG_WALLET_CONFIG_MISSING',
  'TEMPLATE_NOT_FOUND',
  'SAMSUNG_INSTANCE_SAVE_FAILED',
  'add_link_created',
  'addUrl',
  'refId'
]);

assertIncludesAll('Samsung Partner Server Function', server, [
  'Deno.serve(async (request)',
  "request.method === 'OPTIONS'",
  "if (!['GET', 'POST'].includes(request.method))",
  'corsHeaders',
  'errorJson(error)',
  'SUPABASE_EDGE_CONFIG_MISSING',
  'samsungWalletProvider.verifyPartnerServerAuthorization',
  "parts[0] !== 'cards'",
  'SAMSUNG_ROUTE_NOT_FOUND',
  ".from('samsung_wallet_instances')",
  ".from('samsung_wallet_events')",
  'cardDataForInstance',
  'noContent(204)',
  'get_card_data',
  'send_card_state',
  'card_status',
  'samsung_callback_url'
]);

assertIncludesAll('Samsung Update Function', update, [
  'Deno.serve(async (request)',
  "request.method === 'OPTIONS'",
  'corsHeaders',
  'walletNotificationService.context(request)',
  ".from('samsung_wallet_instances')",
  ".from('samsung_wallet_events')",
  'samsungWalletProvider.update(instance, fields)',
  'samsungWalletProvider.delete(instance)',
  'samsungWalletProvider.revoke(instance)',
  'manual_update_requested',
  'manual_delete_requested',
  'manual_cancel_requested',
  'SAMSUNG_INSTANCE_NOT_FOUND',
  'SAMSUNG_INSTANCE_STATE_SAVE_FAILED',
  'publicWalletProviderResult',
  'publicWalletOperationPayload'
]);

assertIncludesAll('Samsung SQL Tabellen und RLS', schema, [
  'create table if not exists public.samsung_wallet_instances',
  'create table if not exists public.samsung_wallet_events',
  'samsung_wallet_instances_ref_id_format_check',
  'samsung_wallet_instances_add_flow_check',
  'samsung_wallet_instances_card_status_check',
  'samsung_wallet_events_event_type_format_check',
  'create index if not exists samsung_wallet_instances_owner_id_idx',
  'create index if not exists samsung_wallet_events_owner_id_idx',
  'alter table public.samsung_wallet_instances enable row level security',
  'alter table public.samsung_wallet_events enable row level security',
  'unlocked operators can read own samsung wallet instances',
  'unlocked operators can read own samsung wallet events',
  'revoke select, insert, update, delete on public.samsung_wallet_instances from authenticated',
  'revoke select, insert, update, delete on public.samsung_wallet_events from authenticated'
]);

assertIncludesAll('Samsung Deploy und JWT Policy', config, [
  '[functions.samsung-wallet-add-link]',
  '[functions.samsung-wallet-server]',
  'verify_jwt = false'
]);

assertIncludesAll('Samsung Deploy Script', deploy, [
  'samsung-wallet-add-link',
  'samsung-wallet-server',
  'update-samsung-wallet-pass'
]);

[
  'SAMSUNG_WALLET_PARTNER_ID',
  'SAMSUNG_WALLET_PARTNER_CODE',
  'SAMSUNG_WALLET_CARD_ID',
  'SAMSUNG_WALLET_CARD_TYPE',
  'SAMSUNG_WALLET_CARD_SUB_TYPE',
  'SAMSUNG_WALLET_CERTIFICATE_ID',
  'SAMSUNG_WALLET_COUNTRY_CODE',
  'SAMSUNG_WALLET_ENV',
  'SAMSUNG_WALLET_ADD_FLOW',
  'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
  'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
  'SAMSUNG_WALLET_RD_CLICK_URL',
  'SAMSUNG_WALLET_RD_IMPRESSION_URL',
  'SAMSUNG_WALLET_PARTNER_SERVER_URL',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH'
].forEach((secretName) => {
  assert(secrets.includes(`${secretName}=`), `supabase/secrets.example.env fehlt ${secretName}.`);
  assert(setupDoc.includes(secretName), `docs/samsung-wallet.md fehlt ${secretName}.`);
});

assertIncludesAll('Samsung Doku', `${setupDoc}\n${globalSetupDoc}\n${providerDoc}\n${walletDoc}\n${report}`, [
  'Data-Fetch-Link',
  'docs/setup.md',
  'Deployment Hinweise',
  'Rollback Strategie',
  'samsung-wallet-add-link',
  'samsung-wallet-server',
  'update-samsung-wallet-pass',
  'samsung_wallet_instances',
  'samsung_wallet_events',
  'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH=true',
  'keine Änderung an bestehenden `wallet_platform` Constraints'
]);

console.log('Samsung Wallet Contract ist für Provider, Edge Functions, SQL, Secrets und Doku statisch abgesichert.');
