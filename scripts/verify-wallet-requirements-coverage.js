import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertAll(relativePath, label, needles) {
  const source = read(relativePath);

  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt in ${relativePath}: ${needle}`);
  }
}

function assertNone(relativePath, label, needles) {
  const source = read(relativePath);

  for (const needle of needles) {
    assert(!source.includes(needle), `${label} darf nicht in ${relativePath} enthalten sein: ${needle}`);
  }
}

const requiredWalletFunctions = [
  'issue-apple-pass',
  'apple-wallet-webservice',
  'update-apple-pass',
  'send-apple-wallet-update',
  'issue-google-wallet-pass',
  'update-google-wallet-pass',
  'send-google-wallet-message',
  'create-wallet-notification-campaign',
  'send-wallet-notification',
  'process-scheduled-wallet-notifications',
  'process-wallet-update-queue',
  'resolve-wallet-notification-recipients',
  'check-wallet-notification-limits'
];

const requiredSecrets = [
  'APPLE_TEAM_ID',
  'APPLE_PASS_TYPE_ID',
  'APPLE_WWDR_CERT',
  'APPLE_PASS_CERT',
  'APPLE_PASS_KEY',
  'APPLE_PASS_KEY_PASSWORD',
  'APPLE_WEB_SERVICE_BASE_URL',
  'APPLE_APNS_KEY_ID',
  'APPLE_APNS_TEAM_ID',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_PUBLIC_BASE_URL'
];

const targetTypes = [
  'all_active',
  'template',
  'platform_apple',
  'platform_google',
  'stamp_count',
  'streak_count',
  'vip_level',
  'balance_range',
  'cloakroom_open',
  'event',
  'coupon_unredeemed',
  'membership_status'
];

assert(!exists('server/passkit.js'), 'Aktiver Wallet-Pfad darf server/passkit.js nicht enthalten.');
assert(!exists('supabase/functions/passkit'), 'Aktiver Wallet-Pfad darf keinen supabase/functions/passkit Legacy-Ordner enthalten.');
assertNone('package.json', 'Aktiver Wallet-Pfad ohne PassKit Dependency', ['passkit-generator']);
assertAll('README.md', 'README muss den direkten Wallet-Pfad statt PassKit dokumentieren', [
  '## Kein PassKit im aktiven Wallet-Pfad',
  'LEGACY_PASSKIT_ROUTE_DISABLED',
  'Supabase Edge Functions',
  'Google Wallet API',
  'docs/WALLET_GOAL_COMPLETION_AUDIT.md'
]);
assertAll('docs/PASSKIT_KONFIGURATION.md', 'Legacy-PassKit-Doku muss als Archiv markiert sein', [
  '# Archiv: alte PassKit-Konfiguration',
  'Diese Anleitung ist nicht mehr der aktive Projektweg.',
  'keine `passkit-generator` Dependency'
]);
assertAll('docs/AKTUELLER_PASSKIT_WEG_CHECKLISTE.md', 'Legacy-PassKit-Checkliste muss als Archiv markiert sein', [
  '# Archiv: alter PassKit-Weg',
  'nicht mehr aktiv',
  'LEGACY_PASSKIT_ROUTE_DISABLED'
]);

assertAll('supabase/functions/_shared/walletNotificationService.ts', 'Zentraler walletNotificationService', [
  'async createCampaign',
  'async resolveRecipients',
  'async sendNow',
  'async schedule',
  'async sendToApplePass',
  'async sendToGoogleWallet',
  'async logResult',
  'async checkPlatformLimits',
  'walletLimitConfig',
  'WALLET_BUSINESS_DAILY_LIMIT',
  'WALLET_CUSTOMER_DAILY_LIMIT',
  'WALLET_CARD_DAILY_LIMIT',
  'WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H',
  'WALLET_DUPLICATE_WINDOW_MINUTES',
  'location_based',
  'GOOGLE_TEXT_AND_NOTIFY_LIMIT_REACHED',
  'wallet_notification_campaigns',
  'wallet_notification_recipients',
  'wallet_push_logs',
  'wallet_update_queue',
  'owner_id',
  'business_id'
]);

assertAll('supabase/functions/_shared/appleWalletProvider.ts', 'Direkter Apple Wallet Provider', [
  'async issuePass',
  'async signPass',
  'async registerDevice',
  'async unregisterDevice',
  'async getUpdatedPass',
  'async sendPushUpdate',
  'async updatePassFields',
  'passTypeIdentifier',
  'teamIdentifier',
  'authenticationToken',
  'webServiceURL',
  'application/vnd.apple.pkpass',
  'APPLE_APNS_AUTH_KEY'
]);

assertAll('supabase/functions/apple-wallet-webservice/index.ts', 'Apple Wallet Web Service', [
  "parts[0] === 'v1' && parts[1] === 'devices'",
  "parts[0] === 'v1' && parts[1] === 'passes'",
  "parts[0] === 'v1' && parts[1] === 'log'",
  'applePassToken(request)',
  'Authorization: ApplePass <authenticationToken>',
  "request.headers.get('if-modified-since')",
  'appleWalletProvider.registerDevice',
  'appleWalletProvider.unregisterDevice',
  'apple_changed_serials_listed'
]);

assertAll('supabase/functions/_shared/googleWalletProvider.ts', 'Direkter Google Wallet Provider', [
  'async createClass',
  'async createObject',
  'async generateSaveLink',
  'async updateObject',
  'async addMessage',
  'async sendTextAndNotify',
  'TEXT_AND_NOTIFY',
  'genericObject',
  'loyaltyObject',
  'offerObject',
  'eventTicketObject',
  'giftCardObject',
  'walletobjects.googleapis.com/walletobjects/v1'
]);

for (const functionName of requiredWalletFunctions) {
  assert(exists(`supabase/functions/${functionName}/index.ts`), `Geforderte Wallet Edge Function fehlt: ${functionName}`);
}

assertAll('supabase/schema.sql', 'Supabase Wallet Datenmodell', [
  'create table if not exists public.wallet_notification_campaigns',
  'create table if not exists public.wallet_notification_recipients',
  'create table if not exists public.wallet_push_logs',
  'create table if not exists public.wallet_update_queue',
  'create table if not exists public.apple_wallet_devices',
  'create table if not exists public.apple_wallet_registrations',
  'create table if not exists public.apple_pass_versions',
  'create table if not exists public.google_wallet_objects',
  'add column if not exists apple_serial_number',
  'add column if not exists google_object_id',
  'add column if not exists push_enabled',
  'add column if not exists last_wallet_update_at',
  'add column if not exists last_notification_at',
  'add column if not exists notification_count_24h',
  'alter table public.wallet_notification_campaigns enable row level security',
  'public.current_operator_unlocked()',
  'validate_wallet_notification_campaigns_consistency',
  'validate_wallet_notification_recipients_consistency',
  'validate_wallet_push_logs_consistency',
  'validate_wallet_update_queue_consistency'
]);

for (const targetType of targetTypes) {
  assertAll('supabase/schema.sql', `SQL-Zielgruppe ${targetType}`, [targetType]);
  assertAll('supabase/functions/_shared/walletNotificationService.ts', `Backend-Zielgruppe ${targetType}`, [targetType]);
  assertAll('public/js/editor.js', `Editor-Zielgruppe ${targetType}`, [targetType]);
}

assertAll('public/editor.html', 'Editor Wallet-Benachrichtigungen UI', [
  'Wallet Benachrichtigungen',
  'walletNotificationForm',
  'target_active_from',
  'target_active_until',
  'Apple Wallet',
  'Google Wallet',
  'walletReachableCount',
  'walletUnreachableCount',
  'walletNotificationLimitWarnings',
  'max="100000"',
  'Versandhistorie'
]);

assertAll('public/js/editor.js', 'Editor Preflight, Warnungen und Historie', [
  'check-wallet-notification-limits',
  'create-wallet-notification-campaign',
  'allowed_count',
  'unreachable_count',
  'limited_count',
  'apple_unregistered_count',
  'NICHT_ERREICHBAR',
  'APPLE_NO_REGISTERED_DEVICES',
  'loadWalletNotificationHistory',
  'Fehlerlogs und Audit-Status anzeigen',
  "select: 'id,status,wallet_platform,error_code,error_message,created_at,sent_at'",
  "select: 'id,status,wallet_platform,action,error_message,created_at'"
]);

for (const secret of requiredSecrets) {
  assertAll('README.md', `README Secret ${secret}`, [secret]);
  assertAll('config.example.json', `config.example Secret ${secret}`, [secret]);
}

assertAll('scripts/verify-browser-secret-boundary.js', 'Browser Secret Boundary', [
  'SUPABASE_SERVICE_ROLE_KEY',
  'APPLE_PASS_KEY',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'
]);
assertAll('scripts/verify-edge-secret-boundary.js', 'Edge Secret Boundary', [
  'APPLE_PASS_KEY',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'
]);
assertAll('scripts/verify-edge-function-contracts.js', 'Edge Function Contract Tests', [
  'walletNotificationService.context(request)',
  'walletNotificationService.automationContext(request)',
  'SUPABASE_SERVICE_ROLE_KEY',
  'idempotency-key'
]);

assertAll('supabase/test-data.sql', 'Wallet Testdaten laut Prompt', [
  'Demo-Business',
  'WC-DEMO-APPLE',
  'WC-DEMO-GOOGLE',
  'Demo Stempelkarte',
  'Demo VIP Karte',
  'Demo Guthabenkarte',
  'Demo Garderobenkarte',
  'Demo Clubkarte Basis',
  'Demo Clubkarte Alle Features',
  'WC-DEMO-CLUB-BASE',
  'WC-DEMO-CLUB-ALL',
  "'club_card'",
  'club_features',
  'cloakroom_active',
  'Demo Sofortnachricht',
  'Demo geplante Nachricht',
  'Demo Garderoben-Erinnerung',
  'genericObject',
  'loyaltyObject',
  'offerObject',
  'eventTicketObject',
  'giftCardObject'
]);

assertAll('package.json', 'pnpm check muss Prompt-Coverage absichern', [
  'verify-deploy-cleanliness.js',
  'verify-browser-secret-boundary.js',
  'verify-edge-secret-boundary.js',
  'verify-supabase-edge-jwt-policy.js',
  'verify-edge-typescript-syntax.js',
  'verify-edge-function-imports.js',
  'verify-edge-function-contracts.js',
  'verify-wallet-target-contract.js',
  'verify-wallet-limit-accounting.js',
  'verify-editor-campaign-idempotency.js',
  'verify-claim-page-output-safety.js',
  'verify-public-edge-response-safety.js',
  'verify-apple-webservice-contract.js',
  'verify-google-wallet-contract.js',
  'verify-wallet-requirements-coverage.js',
  'verify-wallet-goal-audit.js',
  'verify-wallet-implementation-plan.js',
  'verify-wallet-cron-setup.js',
  'verify-wallet-external-acceptance.js',
  'verify-wallet-readiness-report.js',
  'verify-wallet-test-data.js',
  'verify-responsive-layout.js'
]);

console.log('Wallet-Prompt-Coverage ist gegen Code, SQL, UI, Secrets, Testdaten und Doku abgesichert.');
