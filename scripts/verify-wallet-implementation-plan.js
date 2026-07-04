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

const plan = read('docs/WALLET_IMPLEMENTATION_PLAN.md');
const readme = read('README.md');
const packageJson = read('package.json');

[
  '# Wallet Implementation Plan',
  '1. Analyse der bestehenden Dateien',
  '2. Dateien und Verantwortungen',
  '3. Supabase SQL Migrationsplan',
  '4. Edge-Function-Plan',
  '5. Implementierung Schritt für Schritt',
  '6. Abschliessende Secrets- und Extern-Checkliste',
  '7. Lokale Abnahme',
  'kein React, kein Vite, kein Next.js',
  'Legacy-Routen liefern `LEGACY_PASSKIT_ROUTE_DISABLED`',
  '`operator_profiles.unlock default false`',
  '`supabase/schema.sql`',
  '`supabase/acceptance-queries.sql`',
  '`walletNotificationService.createCampaign()`',
  '`supabase/functions/_shared/appleWalletProvider.ts`',
  '`supabase/functions/_shared/googleWalletProvider.ts`',
  '`wallet_update_queue`',
  '`wallet-assets`',
  'docs/WALLET_EXTERNAL_ACCEPTANCE.md',
  'verify-wallet-external-acceptance.js',
  'wallet-readiness-report.js',
  'verify_jwt=false',
  'walletNotificationService.context(request)',
  'pnpm check'
].forEach((needle) => assertIncludes(plan, needle, 'Wallet Implementation Plan ist unvollständig'));

[
  'issue-apple-pass',
  'apple-wallet-webservice',
  'update-apple-pass',
  'send-apple-wallet-update',
  'claim-apple-pass',
  'issue-google-wallet-pass',
  'update-google-wallet-pass',
  'send-google-wallet-message',
  'google-wallet-save-link',
  'create-wallet-notification-campaign',
  'send-wallet-notification',
  'resolve-wallet-notification-recipients',
  'check-wallet-notification-limits',
  'process-scheduled-wallet-notifications',
  'process-wallet-update-queue',
  'create-topup-payment-session',
  'confirm-topup-payment',
  'redeem-balance',
  'scanner-actions',
  'get-business-scan-statistics',
  'generate-card-pdf'
].forEach((functionName) => assertIncludes(plan, functionName, 'Wallet Implementation Plan muss alle Edge Functions nennen'));

[
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_PUBLIC_BASE_URL',
  'PAYMENT_PROVIDER',
  'PAYMENT_CHECKOUT_BASE_URL',
  'PAYMENT_WEBHOOK_SECRET',
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
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'
].forEach((secretName) => assertIncludes(plan, secretName, 'Wallet Implementation Plan muss externe Secrets nennen'));

[
  'Apple Pass auf iPhone speichern',
  'Apple Device Registration',
  'Google Save-Link speichern',
  'Business-A/B Isolation',
  'Supabase Cron'
].forEach((gate) => assertIncludes(plan, gate, 'Wallet Implementation Plan muss externe Abnahmegates nennen'));

assertIncludes(readme, 'docs/WALLET_IMPLEMENTATION_PLAN.md', 'README muss auf den Wallet Implementation Plan verweisen');
assertIncludes(packageJson, 'verify-wallet-implementation-plan.js', 'pnpm check muss den Wallet Implementation Plan prüfen');

console.log('Wallet Implementation Plan deckt Analyse, Dateirollen, SQL, Edge Functions, Secrets und Abnahme ab.');
