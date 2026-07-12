import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const contextDoc = fs.readFileSync(path.join(rootDir, 'docs', 'WALLET_INTEGRATION_CONTEXT.md'), 'utf8');
const cronSql = fs.readFileSync(path.join(rootDir, 'supabase', 'cron.example.sql'), 'utf8');
const configExample = JSON.parse(fs.readFileSync(path.join(rootDir, 'config.example.json'), 'utf8'));
const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');

const requiredSecrets = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_PUBLIC_BASE_URL',
  'WALLET_CRON_SECRET',
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
  'GOOGLE_WALLET_CLASS_SUFFIX',
  'GOOGLE_WALLET_ORIGINS',
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
  'SAMSUNG_WALLET_ALLOW_UNVERIFIED_AUTH',
  'PAYMENT_PROVIDER',
  'PAYMENT_CHECKOUT_BASE_URL',
  'PAYMENT_WEBHOOK_SECRET',
  'WALLET_BUSINESS_DAILY_LIMIT',
  'WALLET_CUSTOMER_DAILY_LIMIT',
  'WALLET_CARD_DAILY_LIMIT',
  'WALLET_GOOGLE_TEXT_AND_NOTIFY_LIMIT_PER_PASS_24H',
  'WALLET_DUPLICATE_WINDOW_MINUTES',
  'WALLET_PUBLIC_CLAIM_RATE_LIMIT',
  'WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS',
  'WALLET_RECIPIENT_PROCESSING_TIMEOUT_MINUTES',
  'WALLET_QUEUE_PROCESSING_TIMEOUT_MINUTES'
];

const requiredSecretSetExamples = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_PUBLIC_BASE_URL',
  'WALLET_CRON_SECRET',
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
  'SAMSUNG_WALLET_PARTNER_ID',
  'SAMSUNG_WALLET_CARD_ID',
  'SAMSUNG_WALLET_CERTIFICATE_ID',
  'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
  'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
  'PAYMENT_WEBHOOK_SECRET',
  'WALLET_PUBLIC_CLAIM_RATE_LIMIT',
  'WALLET_PUBLIC_CLAIM_RATE_LIMIT_WINDOW_SECONDS'
];

const requiredWalletDeployFunctions = [
  'claim-card',
  'claim-apple-pass',
  'create-topup-payment-session',
  'confirm-topup-payment',
  'redeem-balance',
  'apple-wallet-webservice',
  'issue-apple-pass',
  'update-apple-pass',
  'send-apple-wallet-update',
  'google-wallet-save-link',
  'samsung-wallet-add-link',
  'samsung-wallet-server',
  'issue-google-wallet-pass',
  'update-google-wallet-pass',
  'send-google-wallet-message',
  'generate-card-pdf',
  'create-wallet-notification-campaign',
  'send-wallet-notification',
  'resolve-wallet-notification-recipients',
  'check-wallet-notification-limits',
  'process-scheduled-wallet-notifications',
  'process-wallet-update-queue',
  'scanner-actions',
  'get-business-scan-statistics'
];

const configPaths = [
  ['app', 'baseUrl'],
  ['app', 'apiBaseUrl'],
  ['publicUrls', 'webAppDomain'],
  ['publicUrls', 'supabaseFunctionBaseUrl'],
  ['publicUrls', 'walletInstallPage'],
  ['publicUrls', 'appPublicBaseUrl'],
  ['automation', 'walletCronSecret'],
  ['automation', 'scheduledNotificationsFunction'],
  ['automation', 'walletUpdateQueueFunction'],
  ['supabase', 'url'],
  ['supabase', 'anonKey'],
  ['supabase', 'serviceRoleKey'],
  ['payment', 'provider'],
  ['payment', 'checkoutBaseUrl'],
  ['payment', 'webhookSecret'],
  ['googleWallet', 'issuerId'],
  ['googleWallet', 'serviceAccountJson'],
  ['googleWallet', 'classSuffix'],
  ['googleWallet', 'origins'],
  ['googleWallet', 'desiredPassTypes'],
  ['appleWalletDirect', 'teamId'],
  ['appleWalletDirect', 'passTypeId'],
  ['appleWalletDirect', 'wwdrCert'],
  ['appleWalletDirect', 'passCert'],
  ['appleWalletDirect', 'passKey'],
  ['appleWalletDirect', 'passKeyPassword'],
  ['appleWalletDirect', 'webServiceBaseUrl'],
  ['appleWalletDirect', 'apnsKeyId'],
  ['appleWalletDirect', 'apnsTeamId'],
  ['appleWalletDirect', 'apnsAuthKey'],
  ['deliveryRules', 'businessDailyLimit'],
  ['deliveryRules', 'customerDailyLimit'],
  ['deliveryRules', 'cardDailyLimit'],
  ['deliveryRules', 'googleTextAndNotifyLimitPerPass24h'],
  ['deliveryRules', 'duplicateWindowMinutes'],
  ['deliveryRules', 'publicClaimRateLimit'],
  ['deliveryRules', 'publicClaimRateLimitWindowSeconds'],
  ['deliveryRules', 'recipientProcessingTimeoutMinutes'],
  ['deliveryRules', 'queueProcessingTimeoutMinutes'],
  ['deliveryRules', 'defaultTitle'],
  ['deliveryRules', 'defaultMessage'],
  ['deliveryRules', 'allowedTargets']
];

const requiredActiveContextNeedles = [
  'Aktive Abgleichliste für die weitere Umsetzung',
  'Frontend-Framework',
  'Kein React, kein Vite, kein Next.js',
  'Supabase Tabellen',
  'businesses',
  'card_templates',
  'card_instances',
  'operator_profiles',
  'auth.users',
  'card_events',
  'Apple Developer Daten',
  'Team ID',
  'Pass Type ID',
  'Pass Certificate',
  'WWDR Certificate',
  'Private Key',
  'Key Passwort',
  'APNs Key ID',
  'APNs Auth Key',
  'Google Wallet Daten',
  'Issuer ID',
  'Service Account JSON',
  'Generic',
  'Loyalty',
  'Offer',
  'Event Ticket',
  'Public URLs',
  'Webapp-Domain',
  'Supabase Function Base URL',
  'Wallet-Installationsseite',
  'Design',
  'Logo-Felder',
  'Kartenvorschau',
  'Template-Typen',
  'QR/PDF-Komponenten',
  'Versandregeln',
  'Kunde/Tag',
  'Karte/Tag',
  'Standardtexte',
  'erlaubte Zielgruppen'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasPath(object, segments) {
  return segments.reduce((current, segment) => {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }

    return current[segment];
  }, object) !== undefined;
}

for (const secret of requiredSecrets) {
  assert(readme.includes(secret), `README.md muss das Supabase/Wallet Secret ${secret} dokumentieren.`);
  assert(contextDoc.includes(secret), `docs/WALLET_INTEGRATION_CONTEXT.md muss das Secret ${secret} im aktiven Kontext führen.`);
}

for (const secret of requiredSecretSetExamples) {
  assert(
    readme.includes(`supabase secrets set ${secret}`),
    `README.md muss ein supabase secrets set Beispiel für ${secret} enthalten.`
  );
}

for (const functionName of requiredWalletDeployFunctions) {
  assert(
    fs.existsSync(path.join(rootDir, 'supabase', 'functions', functionName, 'index.ts')),
    `Edge Function fehlt: supabase/functions/${functionName}/index.ts`
  );
  assert(
    readme.includes(`supabase functions deploy ${functionName}`),
    `README.md muss den Deploy-Befehl für ${functionName} enthalten.`
  );
}

for (const segments of configPaths) {
  assert(hasPath(configExample, segments), `config.example.json fehlt ${segments.join('.')}.`);
}

for (const needle of requiredActiveContextNeedles) {
  assert(
    contextDoc.includes(needle),
    `docs/WALLET_INTEGRATION_CONTEXT.md muss den aktiven Nutzerkontext enthalten: ${needle}`
  );
}

assert(
  configExample.publicUrls.supabaseFunctionBaseUrl.includes('/functions/v1'),
  'config.example.json muss publicUrls.supabaseFunctionBaseUrl auf die Supabase Functions Base URL vorbereiten.'
);
assert(
  configExample.appleWalletDirect.webServiceBaseUrl.includes('APPLE_WEB_SERVICE_BASE_URL'),
  'config.example.json muss appleWalletDirect.webServiceBaseUrl als serverseitiges Apple Secret markieren.'
);
assert(
  configExample.googleWallet.desiredPassTypes.includes('generic')
    && configExample.googleWallet.desiredPassTypes.includes('loyalty')
    && configExample.googleWallet.desiredPassTypes.includes('offer')
    && configExample.googleWallet.desiredPassTypes.includes('eventTicket')
    && configExample.googleWallet.desiredPassTypes.includes('giftCard'),
  'config.example.json muss Google Wallet Generic, Loyalty, Offer, Event Ticket und Gift Card vorbereiten.'
);
assert(
  configExample.deliveryRules.allowedTargets.includes('event')
    && configExample.deliveryRules.allowedTargets.includes('coupon_unredeemed')
    && configExample.deliveryRules.allowedTargets.includes('membership_status'),
  'config.example.json muss die Wallet-Zielgruppen für Event, Coupon und Membership vorbereiten.'
);
assert(/(^|\n)config\.json(\n|$)/.test(gitignore), '.gitignore muss config.json ausschliessen.');
assert(readme.includes('docs/WALLET_CRON_SETUP.md'), 'README.md muss die Cron-Setup-Doku verlinken.');
assert(readme.includes('supabase/cron.example.sql'), 'README.md muss die Supabase-Cron-SQL-Vorlage nennen.');
assert(contextDoc.includes('supabase/cron.example.sql'), 'Wallet-Kontext muss die Supabase-Cron-SQL-Vorlage nennen.');
assert(cronSql.includes('process-scheduled-wallet-notifications'), 'Cron SQL muss den Scheduled-Processor aufrufen.');
assert(cronSql.includes('process-wallet-update-queue'), 'Cron SQL muss den Queue-Processor aufrufen.');
assert(cronSql.includes('x-cron-secret'), 'Cron SQL muss den Cron-Secret-Header setzen.');

console.log('Wallet Deploy- und Secret-Checkliste ist dokumentiert und maschinenprüfbar.');
