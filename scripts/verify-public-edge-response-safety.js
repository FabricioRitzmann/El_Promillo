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

function bodyBetween(source, startNeedle, endNeedle, label) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);

  assert(start >= 0 && end > start, `${label} konnte nicht sauber eingegrenzt werden.`);

  return source.slice(start, end);
}

function bodyFrom(source, startNeedle, label) {
  const start = source.indexOf(startNeedle);

  assert(start >= 0, `${label} konnte nicht gefunden werden.`);

  return source.slice(start);
}

function assertIncludes(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

function assertExcludes(source, needles, label) {
  for (const needle of needles) {
    assert(!source.includes(needle), `${label} darf nicht enthalten: ${needle}`);
  }
}

const claimCard = read('supabase/functions/claim-card/index.ts');
const createTopup = read('supabase/functions/create-topup-payment-session/index.ts');
const publicResponses = read('supabase/functions/_shared/publicResponses.ts');
const confirmTopup = read('supabase/functions/confirm-topup-payment/index.ts');
const redeemBalance = read('supabase/functions/redeem-balance/index.ts');
const scannerActions = read('supabase/functions/scanner-actions/index.ts');
const appleWebservice = read('supabase/functions/apple-wallet-webservice/index.ts');
const appleProvider = read('supabase/functions/_shared/appleWalletProvider.ts');
const claimApplePass = read('supabase/functions/claim-apple-pass/index.ts');
const issueApplePass = read('supabase/functions/issue-apple-pass/index.ts');
const updateApplePass = read('supabase/functions/update-apple-pass/index.ts');
const sendAppleWalletUpdate = read('supabase/functions/send-apple-wallet-update/index.ts');
const issueGoogleWalletPass = read('supabase/functions/issue-google-wallet-pass/index.ts');
const updateGoogleWalletPass = read('supabase/functions/update-google-wallet-pass/index.ts');
const sendGoogleWalletMessage = read('supabase/functions/send-google-wallet-message/index.ts');
const googleWalletSaveLink = read('supabase/functions/google-wallet-save-link/index.ts');
const generateCardPdf = read('supabase/functions/generate-card-pdf/index.ts');
const processWalletUpdateQueue = read('supabase/functions/process-wallet-update-queue/index.ts');
const walletNotificationService = read('supabase/functions/_shared/walletNotificationService.ts');
const publicRateLimit = read('supabase/functions/_shared/publicRateLimit.ts');
const resolveWalletRecipients = read('supabase/functions/resolve-wallet-notification-recipients/index.ts');
const checkWalletNotificationLimits = read('supabase/functions/check-wallet-notification-limits/index.ts');
const localServer = read('server/index.js');
const schemaSql = read('supabase/schema.sql');
const readme = read('README.md');
const packageJson = read('package.json');

const publicClaimCardBody = bodyBetween(claimCard, 'function publicClaimCard(card: Row)', 'async function findExistingWalletCard', 'publicClaimCard');
assertIncludes(publicClaimCardBody, [
  'id: card.id',
  'wallet_platform: card.wallet_platform',
  'wallet_object_id: card.wallet_object_id',
  'metadata:'
], 'Öffentliche Claim-Kartenantwort');
assertExcludes(publicClaimCardBody, [
  'owner_id',
  'business_id',
  'pass_authentication_token'
], 'Öffentliche Claim-Kartenantwort');
assertIncludes(claimCard, [
  'const claimTemplateSelect = [',
  '.select(claimTemplateSelect)'
], 'Öffentliche claim-card muss Templates mit einer expliziten Feldliste laden');
assertExcludes(claimCard, [
  ".select('*')",
  '.select("*")'
], 'Öffentliche claim-card darf keine rohen Template-Wildcard-Selects laden');
assertIncludes(publicRateLimit, [
  'export async function enforcePublicClaimRateLimit',
  "Deno.env.get(options.limitEnv || 'WALLET_PUBLIC_CLAIM_RATE_LIMIT')",
  "Deno.env.get(options.windowSecondsEnv || 'WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS')",
  "supabaseAdmin.rpc('consume_public_edge_rate_limit'",
  'statusCode: 429',
  'clientFingerprintInput'
], 'Öffentliche Claim-Rate-Limits müssen über einen serverseitigen Shared Helper laufen');
assertIncludes(schemaSql, [
  'create table if not exists public.public_edge_rate_limits',
  'create or replace function public.consume_public_edge_rate_limit',
  'alter table public.public_edge_rate_limits enable row level security',
  'public_edge_rate_limits hat bewusst keine authenticated Policies',
  'revoke all on public.public_edge_rate_limits from public, anon, authenticated',
  'revoke execute on function public.consume_public_edge_rate_limit(text, text, integer, integer) from public, anon, authenticated',
  'grant execute on function public.consume_public_edge_rate_limit(text, text, integer, integer) to service_role'
], 'Supabase Schema muss öffentliche Claim-Rate-Limits serverseitig und ohne Browser-Grants speichern');
for (const [source, label, routeKey] of [
  [claimCard, 'claim-card', 'claim-card'],
  [claimApplePass, 'claim-apple-pass', 'claim-apple-pass'],
  [googleWalletSaveLink, 'google-wallet-save-link', 'google-wallet-save-link'],
  [createTopup, 'create-topup-payment-session', 'create-topup-payment-session']
]) {
  assertIncludes(source, [
    "import { enforcePublicClaimRateLimit } from '../_shared/publicRateLimit.ts'",
    `await enforcePublicClaimRateLimit(supabaseAdmin, request, '${routeKey}`
  ], `${label} muss vor öffentlichen Claim-/Installationszugriffen ein Rate Limit verbrauchen`);
}
assertIncludes(claimApplePass, [
  'const claimAppleTemplateSelect = [',
  'const claimAppleCustomerCardSelect = [',
  'const claimAppleCardInstanceSelect = [',
  'const claimApplePassVersionSelect = [',
  '.select(claimApplePassVersionSelect)',
  '.select(claimAppleCardInstanceSelect)'
], 'claim-apple-pass muss Pass-Versionen, Templates und Karten mit expliziten Select-Listen laden');
assertExcludes(claimApplePass, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*)')"
], 'claim-apple-pass darf keine rohen Wildcard-Selects im öffentlichen Claim-Pfad laden');
assertIncludes(googleWalletSaveLink, [
  'const googleTemplateSelect = [',
  'const googleCustomerCardSelect = [',
  'const googleClaimCardSelect = [',
  'const googleCardInstanceSelect = [',
  'const googleWalletObjectSelect = [',
  '.select(googleCardInstanceSelect)',
  '.select(googleWalletObjectSelect)',
  '.select(googleClaimCardSelect)'
], 'google-wallet-save-link muss Karten, Templates und Wallet-Objects mit expliziten Select-Listen laden');
assertExcludes(googleWalletSaveLink, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*)')"
], 'google-wallet-save-link darf keine rohen Wildcard-Selects im öffentlichen Claim-Pfad laden');
assertIncludes(generateCardPdf, [
  'const pdfTemplateSelect = [',
  '.select(pdfTemplateSelect)',
  'assertFeatureAllowed(template, \'qrPdf\')',
  '.eq(\'owner_id\', user.id)'
], 'generate-card-pdf muss Templates mit expliziter Feldliste laden und Betreiberzugriff prüfen');
assertExcludes(generateCardPdf, [
  ".select('*')",
  '.select("*")'
], 'generate-card-pdf darf Templates nicht per Wildcard-Select laden');
assertIncludes(appleWebservice, [
  'const appleWebserviceTemplateSelect = [',
  'const appleWebserviceCustomerCardSelect = [',
  'const appleWebserviceCardInstanceSelect = [',
  '.select(appleWebserviceCardInstanceSelect)',
  '.select(appleWebserviceCustomerCardSelect)'
], 'Apple Webservice muss Karten, Templates und Kundenkarten mit expliziten Select-Listen laden');
assertExcludes(appleWebservice, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*)')"
], 'Apple Webservice darf keine rohen Wildcard-Selects in öffentlichen ApplePass-Pfaden laden');
assertIncludes(appleProvider, [
  'const applePassVersionSelect = [',
  'const appleWalletRegistrationSelect = [',
  '.select(applePassVersionSelect)',
  '.select(appleWalletRegistrationSelect)'
], 'Apple Provider muss Pass-Versionen und Registrierungen mit expliziten Select-Listen laden');
assertExcludes(appleProvider, [
  ".select('*')",
  '.select("*")'
], 'Apple Provider darf keine rohen Wildcard-Selects für Pass-Versionen oder Registrierungen laden');

const localPublicClaimCardBody = bodyBetween(localServer, 'function publicClaimCard(card = {})', 'const sensitiveResponseKeys', 'Lokale publicClaimCard');
assertIncludes(localPublicClaimCardBody, [
  'id: card.id',
  'wallet_platform: card.wallet_platform',
  'wallet_object_id: card.wallet_object_id',
  'metadata:'
], 'Lokale öffentliche Claim-Kartenantwort');
assertExcludes(localPublicClaimCardBody, [
  'owner_id',
  'business_id',
  'pass_authentication_token'
], 'Lokale öffentliche Claim-Kartenantwort');
assert(
  localServer.includes('card: publicClaimCard(card)') && localServer.includes('card: publicClaimCard(reusedCard)'),
  'Lokaler /api/cards/claim-Fallback muss publicClaimCard für neue und wiederverwendete Claims verwenden.'
);
assertIncludes(localServer, [
  'const localPublicRateLimitBuckets = new Map()',
  'function localPublicRateLimitSubject(req, routeKey)',
  'function enforceLocalPublicClaimRateLimit(req, routeKey, options = {})',
  'deliveryRules.publicClaimRateLimit',
  'deliveryRules.publicClaimRateLimitWindowSeconds',
  "enforceLocalPublicClaimRateLimit(req, 'api-cards-claim')"
], 'Lokaler /api/cards/claim-Fallback muss ein lokales Claim-Rate-Limit verwenden');
assertIncludes(localServer, [
  'const localTemplatePublicSelect = [',
  'const localTemplateInternalSelect = [',
  'const localOperatorCardSelect = [',
  'function selectPublicTemplateByClaimKey(key, selectColumns = localTemplatePublicSelect)',
  '.select(selectColumns)',
  '.select(localTemplateInternalSelect)',
  '.select(localOperatorCardSelect)'
], 'Lokaler Fallback muss explizite sichere Select-Listen verwenden');
assertExcludes(localServer, [
  ".select('*')",
  ".select('*, card_templates(*)')",
  ".select('*,card_templates(*)')"
], 'Lokaler Fallback darf keine rohen Supabase-Zeilen mit Wildcard-Select laden');
assertIncludes(localServer, [
  'async function insertLocalClaimEvent(payload)',
  'CLAIM_CARD_EVENT_SAVE_FAILED',
  'async function insertLocalClaimCardInstance(payload)',
  'CLAIM_CARD_INSTANCE_SAVE_FAILED',
  '.from(\'card_instances\')',
  ".select('id')",
  '.maybeSingle()',
  'await insertLocalClaimCardInstance({',
  'await insertLocalClaimEvent({'
], 'Lokaler /api/cards/claim-Fallback muss card_instances und card_events Inserts prüfen');

const publicTopupBody = bodyBetween(createTopup, 'function publicTopupPaymentSession(session: Row)', 'async function loadCard', 'publicTopupPaymentSession');
assertIncludes(publicTopupBody, [
  'id: session.id',
  'amount_cents: session.amount_cents',
  'currency: session.currency',
  'status: session.status',
  'checkout_url: session.checkout_url',
  'provider_setup_required: Boolean(session.metadata?.provider_setup_required)',
  'created_at: session.created_at'
], 'Öffentliche Topup-Session-Antwort');
assertExcludes(publicTopupBody, [
  'owner_id',
  'business_id',
  'customer_card_id',
  'card_instance_id',
  'provider_session_id',
  'metadata: session.metadata'
], 'Öffentliche Topup-Session-Antwort');

assert(
  createTopup.includes('topup_payment_session: publicTopupPaymentSession(session)'),
  'create-topup-payment-session muss die öffentliche Topup-Session-Antwort verwenden.'
);
assertIncludes(createTopup, [
  'const topupTemplateSelect = [',
  'const topupCardSelect = [',
  'const topupPaymentSessionSelect = [',
  '.select(topupCardSelect)',
  '.select(topupPaymentSessionSelect)',
  'validateTopupClaimKey(walletObjectId)',
  'TOPUP_CLAIM_KEY_REQUIRED',
  'TOPUP_CLAIM_KEY_INVALID',
  'assertTopupClaimKey(card, walletObjectId)',
  'TOPUP_CLAIM_KEY_MISMATCH',
  'loadTopupCardInstance(supabaseAdmin, card)',
  'TOPUP_CARD_INSTANCE_LOOKUP_FAILED',
  'TOPUP_CARD_INSTANCE_REQUIRED',
  'TOPUP_SESSION_SAVE_FAILED',
  'card_instance_id: instance.id',
  'metadata.google_wallet_claim_key',
  'card.wallet_object_id',
  'card.wallet_serial_number'
], 'Öffentliche Topup-Claim-Key-Prüfung');
assertExcludes(createTopup, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*)')",
  'const select ='
], 'create-topup-payment-session darf Karten/Templates/Sessions nicht per Wildcard-Select laden');
assertIncludes(read('public/js/claim.js'), [
  'walletObjectId: result.card?.metadata?.google_wallet_claim_key',
  '|| result.card?.wallet_object_id',
  '|| result.card?.wallet_serial_number'
], 'Claim-Seite muss Topup-Claim-Key senden');
assert(
  !createTopup.includes('topup_payment_session: session'),
  'create-topup-payment-session darf keine rohe topup_payment_sessions-Zeile an den Browser zurückgeben.'
);

const publicOperatorCardBody = bodyFrom(publicResponses, 'export function publicOperatorCard(card: Row = {})', 'publicOperatorCard');
assertIncludes(publicOperatorCardBody, [
  'id: card.id',
  'template_id: card.template_id',
  'wallet_platform: card.wallet_platform',
  'metadata: sanitizeMetadata(card.metadata || {})',
  'card_templates:'
], 'Browsernahe Operator-Kartenantwort');
assertExcludes(publicOperatorCardBody, [
  'owner_id',
  'business_id',
  'pass_authentication_token'
], 'Browsernahe Operator-Kartenantwort');
assertIncludes(publicResponses, [
  'SENSITIVE_RESPONSE_KEYS',
  'SENSITIVE_KEY_PATTERN',
  'sanitizeMetadata',
  'publicWalletOperationPayload',
  'publicWalletProviderResult',
  'publicGoogleWalletIssuePayload',
  'publicGoogleMessageOperationPayload',
  'publicAppleSigningResult',
  'publicApplePushResult',
  'publicApplePushOperationPayload',
  'publicApplePassVersion',
  'publicCardTemplateResponse'
], 'Shared publicResponses muss Metadaten und Templates redigieren');

const publicAppleSigningResultBody = bodyBetween(publicResponses, 'export function publicAppleSigningResult(signing: Row = {})', 'export function publicGoogleWalletIssuePayload', 'publicAppleSigningResult');
assertIncludes(publicAppleSigningResultBody, [
  'ok: Boolean(signing.ok)',
  'status: signing.status || null',
  'error_code: signing.error_code || null',
  'error_message: signing.error_message || null'
], 'Browsernahe Apple-Signing-Antwort');
assertExcludes(publicAppleSigningResultBody, [
  'error_reason',
  'pkpass',
  'fileName',
  'contentType'
], 'Browsernahe Apple-Signing-Antwort');
assertIncludes(issueApplePass, [
  'publicAppleSigningResult',
  'signing: publicAppleSigningResult(signing)'
], 'issue-apple-pass muss Apple-Signing-Fehler für Browserantworten minimieren.');
assertIncludes(claimApplePass, [
  'publicAppleSigningResult',
  'signing: publicAppleSigningResult(signing)'
], 'claim-apple-pass muss Apple-Signing-Fehler für öffentliche Browserantworten minimieren.');

const publicWalletOperationPayloadBody = bodyBetween(publicResponses, 'export function publicWalletOperationPayload(payload: unknown)', 'export function publicCardTemplateResponse', 'publicWalletOperationPayload');
assertIncludes(publicWalletOperationPayloadBody, [
  'sanitizeWalletOperationValue(payload)',
  'isPlainObject(sanitized) ? sanitized : {}'
], 'Browsernahe Wallet-Operation-Payloads');
assertIncludes(publicResponses, [
  'isSensitiveOperationKey(key)',
  'Authorization:',
  'https://pay.google.com/gp/v/save/',
  'JWT_PATTERN',
  'LONG_TOKEN_PATTERN',
  'pass_json',
  'pkpass',
  'save_url'
], 'Wallet-Operation-Redaction muss Tokens, Save-URLs und Pass-Rohdaten redigieren');

const publicWalletProviderResultBody = bodyBetween(publicResponses, 'export function publicWalletProviderResult(result: Row = {})', 'export function publicGoogleWalletIssuePayload', 'publicWalletProviderResult');
assertIncludes(publicWalletProviderResultBody, [
  'publicWalletOperationPayload({',
  'objectId: result.objectId || result.object_id || null',
  'classId: result.classId || result.class_id || null',
  'objectType: result.objectType || result.object_type || null',
  'error_code: result.error_code || null',
  'warning_code: result.warning_code || null'
], 'Browsernahe Provider-Ergebnisse');
assertExcludes(publicWalletProviderResultBody, [
  'response:',
  'fallback_response:',
  'saveUrl:'
], 'Browsernahe Provider-Ergebnisse');

const publicGoogleIssuePayloadBody = bodyBetween(publicResponses, 'export function publicGoogleWalletIssuePayload(objectResult: Row = {}, saveLink: Row = {})', 'export function publicCardTemplateResponse', 'publicGoogleWalletIssuePayload');
assertIncludes(publicGoogleIssuePayloadBody, [
  'objectResult: publicWalletProviderResult(objectResult)',
  '...publicWalletProviderResult(saveLink)',
  'saveUrl: saveLink.saveUrl || null',
  'save_url_present: Boolean(saveLink.saveUrl || saveLink.save_url_present)',
  'save_url_length:'
], 'Google Issue Browser Payload');

const publicApplePassVersionBody = bodyBetween(publicResponses, 'export function publicApplePassVersion(passVersion: Row = {})', 'export function publicOperatorCard', 'publicApplePassVersion');
assertIncludes(publicApplePassVersionBody, [
  'id: passVersion.id',
  'version: passVersion.version',
  'serial_number: passVersion.serial_number',
  'pass_type_identifier: passVersion.pass_type_identifier'
], 'Browsernahe Apple-Pass-Version');
assertExcludes(publicApplePassVersionBody, [
  'owner_id',
  'business_id',
  'pass_json',
  'assets',
  'authenticationToken',
  'pass_authentication_token'
], 'Browsernahe Apple-Pass-Version');

assertIncludes(confirmTopup, [
  'const confirmTopupTemplateSelect = [',
  'const confirmTopupSessionCardSelect = [',
  'const confirmTopupSessionSelect = [',
  'const confirmTopupUpdatedCardSelect = [',
  '.select(confirmTopupSessionSelect)',
  '.select(confirmTopupUpdatedCardSelect)',
  'MIN_PAYMENT_WEBHOOK_SECRET_LENGTH',
  'paymentWebhookSecretMatches(configuredSecret, receivedSecret)',
  'PAYMENT_WEBHOOK_SECRET_MISSING',
  'card: publicOperatorCard(updatedCard)'
], 'confirm-topup-payment muss Sessions und aktualisierte Karten mit expliziten Select-Listen laden');
assertExcludes(confirmTopup, [
  ".select('*')",
  '.select("*")',
  ".select('*, customer_cards(*, card_templates(*))')",
  ".select('*, card_templates(*)')"
], 'confirm-topup-payment darf keine rohen Session-/Karten-Wildcard-Selects laden');

assertIncludes(redeemBalance, [
  'const redeemBalanceTemplateSelect = [',
  'const redeemBalanceCardSelect = [',
  '.select(redeemBalanceCardSelect)',
  'card: publicOperatorCard(updatedCard)'
], 'redeem-balance muss Karten/Templates mit expliziten Select-Listen laden');
assertExcludes(redeemBalance, [
  ".select('*')",
  '.select("*")',
  "const select = '*, card_templates(*)'",
  ".select('*, card_templates(*)')"
], 'redeem-balance darf keine rohen Karten-/Template-Wildcard-Selects laden');

assertIncludes(scannerActions, [
  'const scannerActionsTemplateSelect = [',
  'const scannerActionsCardSelect = [',
  '.select(scannerActionsCardSelect)',
  'card: publicOperatorCard(updatedCard)'
], 'scanner-actions muss Karten/Templates mit expliziten Select-Listen laden');
assertExcludes(scannerActions, [
  ".select('*')",
  '.select("*")',
  "const select = '*, card_templates(*)'",
  ".select('*, card_templates(*)')"
], 'scanner-actions darf keine rohen Karten-/Template-Wildcard-Selects laden');

for (const [source, label] of [
  [confirmTopup, 'confirm-topup-payment'],
  [redeemBalance, 'redeem-balance'],
  [scannerActions, 'scanner-actions']
]) {
  assertIncludes(source, [
    "import { publicOperatorCard } from '../_shared/publicResponses.ts';",
    'card: publicOperatorCard(updatedCard)'
  ], `${label} muss publicOperatorCard verwenden`);
  assert(
    !source.includes('card: updatedCard'),
    `${label} darf keine rohe customer_cards-Zeile an den Browser zurückgeben.`
  );
}

assertIncludes(scannerActions, [
  'SCANNER_CARD_INSTANCE_SYNC_FAILED',
  'SCANNER_BALANCE_TRANSACTION_SAVE_FAILED',
  'SCANNER_CARD_EVENT_SAVE_FAILED',
  'async function insertScannerBalanceTransaction',
  'async function insertScannerEvent',
  "select('id')",
  '.maybeSingle()',
  'await insertScannerBalanceTransaction(supabaseAdmin, {',
  'await insertScannerEvent(supabaseAdmin, {'
], 'Edge Scanner muss kritische Persistenzwrites prüfen');

const localPublicOperatorCardBody = bodyBetween(localServer, 'function publicOperatorCard(card = {})', 'const claimCustomerCardSelect', 'Lokale publicOperatorCard');
assertIncludes(localPublicOperatorCardBody, [
  'id: card.id',
  'template_id: card.template_id',
  'wallet_platform: card.wallet_platform',
  'metadata: sanitizeBrowserMetadata(card.metadata || {})',
  'card_templates:'
], 'Lokale browsernahe Operator-Kartenantwort');
assertExcludes(localPublicOperatorCardBody, [
  'owner_id',
  'business_id',
  'pass_authentication_token'
], 'Lokale browsernahe Operator-Kartenantwort');
assert(
  localServer.includes('card: publicOperatorCard(updatedCard)'),
  'Lokaler Scanner-Fallback muss publicOperatorCard für aktualisierte Karten verwenden.'
);
assertIncludes(localServer, [
  'SCANNER_CARD_INSTANCE_SYNC_FAILED',
  'SCANNER_BALANCE_TRANSACTION_SAVE_FAILED',
  'SCANNER_CARD_EVENT_SAVE_FAILED',
  'async function insertLocalScannerBalanceTransaction',
  'async function insertLocalScannerEvent',
  "select('id')",
  '.maybeSingle()',
  'await insertLocalScannerBalanceTransaction({',
  'await insertLocalScannerEvent({'
], 'Lokaler Scanner-Fallback muss kritische Persistenzwrites prüfen');

assertIncludes(issueApplePass, [
  'const issueApplePassTemplateSelect = [',
  'const issueApplePassCustomerCardSelect = [',
  'const issueApplePassCardInstanceSelect = [',
  'const issueApplePassVersionSelect = [',
  '.select(issueApplePassVersionSelect)',
  '.select(issueApplePassCardInstanceSelect)'
], 'issue-apple-pass muss Pass-Versionen, Karteninstanzen, Templates und Kundenkarten mit expliziten Select-Listen laden');
assertExcludes(issueApplePass, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*)')"
], 'issue-apple-pass darf keine rohen Apple-Pass-/Karten-Wildcard-Selects laden');

assertIncludes(sendAppleWalletUpdate, [
  'const sendAppleTemplateSelect = [',
  'const sendAppleCustomerCardSelect = [',
  'const sendAppleCardInstanceSelect = [',
  '.select(sendAppleCardInstanceSelect)',
  'publicApplePushOperationPayload',
  'publicApplePushResult'
], 'send-apple-wallet-update muss Karteninstanzen, Templates und Kundenkarten mit expliziten Select-Listen laden und Push-Antworten minimieren');
assertExcludes(sendAppleWalletUpdate, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*)')"
], 'send-apple-wallet-update darf keine rohen Apple-Send-Wildcard-Selects laden');

assertIncludes(updateApplePass, [
  'const updateAppleTemplateSelect = [',
  'const updateAppleCustomerCardSelect = [',
  'const updateAppleCardInstanceSelect = [',
  '.select(updateAppleCardInstanceSelect)',
  'publicWalletOperationPayload'
], 'update-apple-pass muss Karteninstanzen, Templates und Kundenkarten mit expliziten Select-Listen laden und Replay-Payloads redigieren');
assertExcludes(updateApplePass, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*)')"
], 'update-apple-pass darf keine rohen Apple-Update-Wildcard-Selects laden');

for (const [source, label] of [
  [issueApplePass, 'issue-apple-pass'],
  [updateApplePass, 'update-apple-pass'],
  [sendAppleWalletUpdate, 'send-apple-wallet-update']
]) {
  assertIncludes(source, [
    'passVersion: publicApplePassVersion(passVersion)'
  ], `${label} muss Apple-Pass-Versionen für Browserantworten minimieren`);
  assert(
    /import\s+\{[^}]*publicApplePassVersion[^}]*\}\s+from '\.\.\/_shared\/publicResponses\.ts';/.test(source),
    `${label} muss publicApplePassVersion aus publicResponses importieren.`
  );
  assert(
    !source.includes('...passVersion'),
    `${label} darf keine rohe apple_pass_versions-Zeile spreaden.`
  );
}

const appleWebserviceDownloadBody = bodyBetween(
  appleWebservice,
  'async function handleGetPass',
  'async function handleAppleLog',
  'Apple Webservice Pass-Download'
);
assertIncludes(appleWebserviceDownloadBody, [
  'passVersion: publicApplePassVersion(latestPass)',
  'signing: {',
  'error_code: signing.error_code || null',
  'error_message: signing.error_message || null'
], 'Apple Webservice Pass-Download muss Fehlerantworten minimieren');
assert(
  /import\s+\{[^}]*publicApplePassVersion[^}]*\}\s+from '\.\.\/_shared\/publicResponses\.ts';/.test(appleWebservice),
  'apple-wallet-webservice muss publicApplePassVersion aus publicResponses importieren.'
);
const appleWebserviceFailureResponse = bodyBetween(
  appleWebserviceDownloadBody,
  'return json({',
  '}, signingHttpStatus(signing));',
  'Apple Webservice Signatur-Fehlerantwort'
);
assertExcludes(appleWebserviceFailureResponse, [
  'pass_json',
  'latestPass.pass_json',
  'assets',
  'authenticationToken',
  'pass_authentication_token'
], 'Apple Webservice Signatur-Fehlerantwort');

for (const [source, label] of [
  [issueApplePass, 'issue-apple-pass'],
  [updateApplePass, 'update-apple-pass'],
  [updateGoogleWalletPass, 'update-google-wallet-pass']
]) {
  assertIncludes(source, [
    'publicWalletOperationPayload'
  ], `${label} muss Idempotency-Replay-Payloads redigieren`);
  assert(
    !source.includes('...payloadObject(existingResult.response_payload)'),
    `${label} darf alte wallet_push_logs.response_payload nicht unredigiert in Browserantworten spreaden.`
  );
}

assertIncludes(sendAppleWalletUpdate, [
  'publicApplePushOperationPayload',
  '...publicApplePushOperationPayload(existingResult.response_payload)',
  '...publicApplePushOperationPayload(duplicateResult.response_payload)'
], 'send-apple-wallet-update muss Idempotency-Replays mit APNS-Payloads minimieren');
assertIncludes(sendGoogleWalletMessage, [
  'publicGoogleMessageOperationPayload',
  '...publicGoogleMessageOperationPayload(existingResult.response_payload)',
  '...publicGoogleMessageOperationPayload(duplicateResult.response_payload)'
], 'send-google-wallet-message muss Idempotency-Replays mit Google-Providerpayloads minimieren');
assertIncludes(sendGoogleWalletMessage, [
  'const sendGoogleTemplateSelect = [',
  'const sendGoogleCustomerCardSelect = [',
  'const sendGoogleWalletObjectSelect = [',
  'const sendGoogleCardInstanceSelect = [',
  '.select(sendGoogleCardInstanceSelect)',
  'publicGoogleMessageOperationPayload',
  'publicWalletProviderResult'
], 'send-google-wallet-message muss Karteninstanzen, Templates, Kundenkarten und Google-Objects mit expliziten Select-Listen laden und Antworten minimieren');
assertExcludes(sendGoogleWalletMessage, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*), google_wallet_objects(*)')"
], 'send-google-wallet-message darf keine rohen Google-Message-Wildcard-Selects laden');
assertIncludes(updateGoogleWalletPass, [
  'const updateGoogleTemplateSelect = [',
  'const updateGoogleCustomerCardSelect = [',
  'const updateGoogleWalletObjectSelect = [',
  'const updateGoogleCardInstanceSelect = [',
  '.select(updateGoogleCardInstanceSelect)',
  '.select(updateGoogleWalletObjectSelect)',
  'publicWalletOperationPayload',
  'publicWalletProviderResult'
], 'update-google-wallet-pass muss Karteninstanzen, Templates, Kundenkarten und Google-Objects mit expliziten Select-Listen laden und Antworten minimieren');
assertExcludes(updateGoogleWalletPass, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*), google_wallet_objects(*)')"
], 'update-google-wallet-pass darf keine rohen Google-Update-Wildcard-Selects laden');
assert(
  !sendAppleWalletUpdate.includes('...publicWalletOperationPayload(existingResult.response_payload)')
    && !sendAppleWalletUpdate.includes('...publicWalletOperationPayload(duplicateResult.response_payload)'),
  'send-apple-wallet-update darf APNS-Replay-Payloads nicht nur generisch redigieren.'
);
assert(
  !sendGoogleWalletMessage.includes('...publicWalletOperationPayload(existingResult.response_payload)')
    && !sendGoogleWalletMessage.includes('...publicWalletOperationPayload(duplicateResult.response_payload)'),
  'send-google-wallet-message darf Google-Replay-Payloads nicht nur generisch redigieren.'
);

assertIncludes(updateGoogleWalletPass, [
  'publicWalletProviderResult',
  '...publicWalletProviderResult(result)',
  'objectId: resolved.objectId',
  'cardInstanceId: resolved.cardInstance.id'
], 'update-google-wallet-pass muss frische Providerantworten minimieren');
assert(
  !updateGoogleWalletPass.includes('...result,'),
  'update-google-wallet-pass darf rohe Google Providerantworten nicht an den Browser spreaden.'
);

assertIncludes(sendGoogleWalletMessage, [
  'publicWalletProviderResult',
  '...publicWalletProviderResult(notificationResult)',
  'notificationResult: publicWalletProviderResult(notificationResult)',
  'fallbackResult: publicWalletProviderResult(fallbackResult)'
], 'send-google-wallet-message muss frische Providerantworten minimieren');
assert(
  !sendGoogleWalletMessage.includes('...notificationResult,'),
  'send-google-wallet-message darf rohe Google TEXT_AND_NOTIFY-Antworten nicht an den Browser spreaden.'
);

const publicApplePushResultBody = bodyBetween(publicResponses, 'export function publicApplePushResult(result: Row = {})', 'export function publicGoogleWalletIssuePayload', 'publicApplePushResult');
assertIncludes(publicApplePushResultBody, [
  'sent_count:',
  'failed_count:',
  'skipped_count:',
  'warning_code:',
  'warning_message:'
], 'Browsernahe Apple-Push-Antwort');
assertExcludes(publicApplePushResultBody, [
  'device_library_identifier',
  'push_token_suffix',
  'response:'
], 'Browsernahe Apple-Push-Antwort');
assertIncludes(sendAppleWalletUpdate, [
  'publicApplePushResult',
  '...publicApplePushResult(pushResult)'
], 'send-apple-wallet-update muss APNS-Providerantworten für Browser minimieren');
assert(
  !sendAppleWalletUpdate.includes('...pushResult,'),
  'send-apple-wallet-update darf rohe APNS-Providerantworten nicht an den Browser spreaden.'
);

const publicApplePushOperationPayloadBody = bodyBetween(publicResponses, 'export function publicApplePushOperationPayload(payload: unknown)', 'export function publicGoogleWalletIssuePayload', 'publicApplePushOperationPayload');
assertIncludes(publicApplePushOperationPayloadBody, [
  'publicWalletOperationPayload(payload)',
  'output.push = publicApplePushResult(original.push)'
], 'Apple-Push-Replay-Payload muss APNS-Ergebnisse zusammenfassen');
assertExcludes(publicApplePushOperationPayloadBody, [
  'device_library_identifier',
  'push_token_suffix',
  'response:'
], 'Apple-Push-Replay-Payload');

const publicGoogleMessageOperationPayloadBody = bodyBetween(publicResponses, 'export function publicGoogleMessageOperationPayload(payload: unknown)', 'export function publicCardTemplateResponse', 'publicGoogleMessageOperationPayload');
assertIncludes(publicGoogleMessageOperationPayloadBody, [
  'publicWalletProviderResult(original)',
  'output.notificationResult = publicWalletProviderResult(notificationResult)',
  'output.fallbackResult = publicWalletProviderResult(fallbackResult)',
  'delete output.notification',
  'delete output.response',
  'delete output.fallback_response'
], 'Google-Message-Replay-Payload muss Providerantworten zusammenfassen');

assertIncludes(processWalletUpdateQueue, [
  'processWalletUpdateQueue(context)'
], 'process-wallet-update-queue muss den zentralen Queue-Service verwenden');
const processQueueBody = bodyBetween(walletNotificationService, 'async processWalletUpdateQueue(context: Row)', '\n  }\n};', 'processWalletUpdateQueue');
assertIncludes(walletNotificationService, [
  'publicApplePushResult',
  'publicWalletProviderResult',
  'function publicQueueProviderResult',
  'provider_result: publicQueueProviderResult(job.wallet_platform, result)'
], 'Queue-Processor muss Providerantworten für Edge-Responses minimieren');
assertExcludes(processQueueBody, [
  'result\n        });'
], 'Queue-Processor darf rohe Provider-Results nicht in die Edge-Response schreiben');

const scheduledProcessorBody = bodyBetween(walletNotificationService, 'async processScheduledWalletNotifications(context: Row)', 'async processWalletUpdateQueue(context: Row)', 'processScheduledWalletNotifications');
assertIncludes(walletNotificationService, [
  'function compactScheduledSendResult',
  'const sendResult = await this.sendNow(contextForCampaign(context, campaign), campaign.id)',
  'results.push(compactScheduledSendResult(sendResult))'
], 'Scheduled-Processor muss Cron-Responses auf Kampagnen-Zusammenfassungen reduzieren');
assertExcludes(scheduledProcessorBody, [
  'results.push(await this.sendNow(contextForCampaign(context, campaign), campaign.id))'
], 'Scheduled-Processor darf keine vollständigen sendNow-Detailantworten an Cron/Browser zurückgeben');
assertIncludes(walletNotificationService, [
  'const OPERATOR_PROFILE_SELECT =',
  'const BUSINESS_SELECT =',
  'const CARD_TEMPLATE_SELECT =',
  'const CUSTOMER_CARD_SELECT =',
  'const GOOGLE_WALLET_OBJECT_SELECT =',
  'const CARD_INSTANCE_SELECT =',
  'const CARD_INSTANCE_WITH_WALLET_RELATIONS_SELECT =',
  'const WALLET_QUEUE_WITH_CARD_SELECT =',
  '.select(OPERATOR_PROFILE_SELECT)',
  '.select(BUSINESS_SELECT)',
  '.select(CARD_TEMPLATE_SELECT)',
  '.select(WALLET_CAMPAIGN_SELECT)',
  '.select(WALLET_RECIPIENT_SELECT)',
  '.select(CARD_INSTANCE_WITH_WALLET_RELATIONS_SELECT)',
  '.select(WALLET_QUEUE_WITH_CARD_SELECT)'
], 'walletNotificationService muss interne Datenbankzeilen mit expliziten Select-Listen laden');
assertExcludes(walletNotificationService, [
  ".select('*')",
  '.select("*")',
  'card_templates(*)',
  'customer_cards(*)',
  'google_wallet_objects(*)',
  'businesses(*)'
], 'walletNotificationService darf keine rohen Wildcard- oder Relation-Wildcard-Selects verwenden');

const googleIssueBrowserResponse = bodyBetween(
  issueGoogleWalletPass,
  "return json({\n      ok: issueStatus === 'sent'",
  '}, issueHttpStatus(issueStatus, objectResult, saveLink));',
  'issue-google-wallet-pass Browserantwort'
);
assertIncludes(issueGoogleWalletPass, [
  'const issueGoogleTemplateSelect = [',
  'const issueGoogleCustomerCardSelect = [',
  'const issueGoogleWalletObjectSelect = [',
  'const issueGoogleCardInstanceSelect = [',
  '.select(issueGoogleCardInstanceSelect)'
], 'issue-google-wallet-pass muss Karteninstanzen, Templates, Kundenkarten und Google-Objects mit expliziten Select-Listen laden');
assertExcludes(issueGoogleWalletPass, [
  ".select('*')",
  '.select("*")',
  ".select('*, card_templates(*), customer_cards(*), google_wallet_objects(*)')"
], 'issue-google-wallet-pass darf keine rohen Google-Issue-Wildcard-Selects laden');
assertIncludes(googleIssueBrowserResponse, [
  '...publicPayload',
  'status: issueStatus'
], 'issue-google-wallet-pass muss Google Issue Antworten minimieren');
assertExcludes(googleIssueBrowserResponse, [
  'objectResult,',
  'saveLink,'
], 'issue-google-wallet-pass Browserantwort');

assertIncludes(resolveWalletRecipients, [
  'const resolveCampaignSelect = [',
  '.select(resolveCampaignSelect)',
  'function recipientSummary',
  'recipient_summary: summary',
  'recipients_count: summary.total',
  'status_counts',
  'platform_counts'
], 'resolve-wallet-notification-recipients muss eine minimierte Empfänger-Zusammenfassung liefern');
assertExcludes(resolveWalletRecipients, [
  ".select('*')",
  '.select("*")'
], 'resolve-wallet-notification-recipients darf Kampagnen nicht per Wildcard-Select laden');
assert(
  !resolveWalletRecipients.includes('recipients,'),
  'resolve-wallet-notification-recipients darf keine rohen wallet_notification_recipients-Zeilen an den Browser zurückgeben.'
);
assertIncludes(checkWalletNotificationLimits, [
  'const limitCardInstanceSelect = [',
  '.select(limitCardInstanceSelect)',
  'return json(await walletNotificationService.previewNotificationLimits(context, body))',
  'return json(await walletNotificationService.checkPlatformLimits(context, cardInstance, walletPlatform))'
], 'check-wallet-notification-limits muss einzelne Karteninstanzen mit einer expliziten Feldliste laden');
assertExcludes(checkWalletNotificationLimits, [
  ".select('*')",
  '.select("*")'
], 'check-wallet-notification-limits darf Karteninstanzen nicht per Wildcard-Select laden');

assert(
  readme.includes('create-topup-payment-session') && readme.includes('pending Session'),
  'README muss den öffentlichen Topup-Session-Pfad dokumentieren.'
);
assert(
  packageJson.includes('verify-public-edge-response-safety.js'),
  'package.json muss verify-public-edge-response-safety.js in pnpm check ausführen.'
);

console.log('Öffentliche und browsernahe Wallet-Responses geben nur minimierte Daten zurück.');
