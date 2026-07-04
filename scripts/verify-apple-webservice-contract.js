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

function assertIncludes(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

const appleWebservice = read('supabase/functions/apple-wallet-webservice/index.ts');
const appleProvider = read('supabase/functions/_shared/appleWalletProvider.ts');
const schema = read('supabase/schema.sql');
const contextDoc = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const readme = read('README.md');
const packageJson = read('package.json');

assertIncludes(appleWebservice, [
  "request.method === 'POST' && parts[0] === 'v1' && parts[1] === 'devices' && parts[3] === 'registrations' && parts.length === 6",
  "request.method === 'DELETE' && parts[0] === 'v1' && parts[1] === 'devices' && parts[3] === 'registrations' && parts.length === 6",
  "request.method === 'GET' && parts[0] === 'v1' && parts[1] === 'devices' && parts[3] === 'registrations' && parts.length === 5",
  "request.method === 'GET' && parts[0] === 'v1' && parts[1] === 'passes' && parts.length === 4",
  "['GET', 'POST'].includes(request.method) && parts[0] === 'v1' && parts[1] === 'log'",
  'APPLE_ROUTE_NOT_FOUND'
], 'Apple Webservice Routen');

assertIncludes(appleWebservice, [
  'function applePassToken(request: Request)',
  'async function timingSafeTokenMatches',
  'sha256(expectedText)',
  'sha256(candidateText)',
  "request.headers.get('authorization')",
  'Authorization: ApplePass <authenticationToken>',
  'APPLE_PASS_AUTH_REQUIRED',
  'APPLE_PASS_AUTH_INVALID',
  'const tokenMatches = card',
  'await timingSafeTokenMatches(card.pass_authentication_token, authenticationToken)',
  'function uuidLike(value: unknown)',
  'loadAppleInstanceBySerial',
  ".eq('apple_serial_number', serialNumber)",
  ".eq('id', serialNumber)",
  ".eq('wallet_platform', 'apple')",
  'APPLE_CARD_CONTEXT_MISMATCH',
  'assertApplePassIdentity',
  'APPLE_PASS_SERIAL_MISMATCH',
  'APPLE_PASS_TYPE_MISMATCH'
], 'Apple Webservice Auth und Identität');

assertIncludes(appleWebservice, [
  'const pushToken = stringValue(body.pushToken)',
  'PUSH_TOKEN_REQUIRED',
  'existingRegistration ? 200 : 201',
  'has_push_token: Boolean(pushToken)',
  'apple_device_registered',
  'apple_device_unregistered',
  'const unregisterResult = await appleWalletProvider.unregisterDevice',
  'ownerId: instance.owner_id',
  'businessId: instance.business_id',
  'templateId: instance.template_id',
  'cardInstanceId: instance.id',
  'removed: Boolean(unregisterResult.removed)'
], 'Apple Device Registration');

assertIncludes(appleWebservice, [
  "url.searchParams.get('passesUpdatedSince')",
  'registrationKeys',
  'registeredCardInstanceIds',
  ".in('card_instance_id', registeredCardInstanceIds)",
  'if (!registrationKeys.has(registrationKey))',
  'versionQuery = versionQuery.gt',
  'latestChangedVersionBySerial',
  'changedLatestVersions',
  'return new Response(null, { status: 204, headers: corsHeaders })',
  'response_last_updated: lastUpdated',
  'apple_changed_serials_listed'
], 'Apple Changed Serials');

assertIncludes(appleWebservice, [
  "request.headers.get('if-modified-since')",
  'const latestPass = await appleWalletProvider.getUpdatedPass',
  'ownerId: instance.owner_id',
  'businessId: instance.business_id',
  'templateId: instance.template_id',
  'cardInstanceId: instance.id',
  'return notModifiedResponse(latestPass.last_updated_at)',
  'status: 304',
  'pkpassResponse(signing, latestPass.last_updated_at)',
  'passVersion: publicApplePassVersion(latestPass)',
  'error_code: signing.error_code || null',
  'error_message: signing.error_message || null',
  'apple_pass_downloaded',
  'apple_pass_not_modified',
  'apple_pass_download_failed',
  "'Cache-Control': 'no-cache'"
], 'Apple Pass Download Cache');

assert(
  /import\s+\{[^}]*publicApplePassVersion[^}]*\}\s+from '\.\.\/_shared\/publicResponses\.ts';/.test(appleWebservice),
  'apple-wallet-webservice muss publicApplePassVersion für minimierte Fehlerantworten importieren.'
);

assertIncludes(appleProvider, [
  'async registerDevice(supabaseAdmin: any, params: Row)',
  'const authenticationTokenHash = await sha256(stringValue(params.authenticationToken))',
  'authentication_token_hash: authenticationTokenHash',
  'push_token: params.pushToken',
  'APPLE_WALLET_DEVICE_SAVE_FAILED',
  'APPLE_WALLET_REGISTRATION_CONTEXT_MISMATCH',
  ".select('owner_id,business_id,template_id,card_instance_id')",
  'registrationContextMismatch',
  "onConflict: 'device_library_identifier,pass_type_identifier,serial_number'",
  ".select('device_library_identifier, apple_wallet_devices(push_token)')",
  ".eq('owner_id', cardInstance.owner_id)",
  ".eq('business_id', cardInstance.business_id)",
  ".eq('template_id', cardInstance.template_id)",
  ".eq('card_instance_id', cardInstance.id)",
  'push_token_suffix',
  'APPLE_APNS_UNREGISTERED',
  'stale_registration_removed',
  'staleRegistrationRemoveError',
  'stale_registration_remove_error'
], 'Apple Provider Registration und APNS Redaction');

assertIncludes(schema, [
  'create table if not exists public.apple_wallet_devices',
  'device_library_identifier text not null unique',
  'push_token text not null',
  'create table if not exists public.apple_wallet_registrations',
  'authentication_token_hash text not null',
  'unique (device_library_identifier, pass_type_identifier, serial_number)',
  'alter table public.apple_wallet_devices enable row level security',
  'apple_wallet_devices hat bewusst keine authenticated Policies',
  'unlocked operators can read own apple registrations'
], 'Apple Webservice SQL');

assertIncludes(contextDoc, [
  'Apple-Webservice-Contract',
  'passesUpdatedSince',
  'If-Modified-Since',
  'push_token_suffix'
], 'Kontextdoku Apple Webservice Contract');

assertIncludes(readme, [
  'verify-apple-webservice-contract.js',
  'Apple Wallet Web Service'
], 'README Apple Webservice Contract Check');

assert(
  packageJson.includes('verify-apple-webservice-contract.js'),
  'package.json muss verify-apple-webservice-contract.js in pnpm check ausführen.'
);

console.log('Apple Wallet Web Service Contract ist für Routen, Auth, Updates und Push-Token-Redaction abgesichert.');
