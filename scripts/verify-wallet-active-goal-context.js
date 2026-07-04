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

function hasPath(object, segments) {
  let current = object;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  return true;
}

const doc = read('docs/WALLET_ACTIVE_GOAL_CONTEXT.md');
const readme = read('README.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const audit = read('docs/WALLET_GOAL_COMPLETION_AUDIT.md');
const plan = read('docs/WALLET_IMPLEMENTATION_PLAN.md');
const schema = read('supabase/schema.sql');
const packageJsonRaw = read('package.json');
const packageJson = JSON.parse(packageJsonRaw);
const configExample = JSON.parse(read('config.example.json'));

[
  '# Wallet Active Goal Context',
  '1. Verwendetes Frontend-Framework',
  'Kein React',
  'Kein Vite',
  'Kein Next.js',
  'HTML, CSS und Vanilla JavaScript',
  '2. Aktuelle Supabase Tabellen',
  'operator_profiles',
  'auth.users',
  'businesses',
  'card_templates',
  'card_instances',
  'card_events',
  'profiles',
  'users',
  'scan_events',
  '3. Apple Developer Daten',
  'Team ID',
  'Pass Type ID',
  'Pass Certificate',
  'WWDR Certificate',
  'Private Key',
  'Key Passwort',
  'APNs Key ID',
  'APNs Auth Key',
  '4. Google Wallet Daten',
  'Issuer ID',
  'Service Account JSON',
  'Generic',
  'Loyalty',
  'Offer',
  'Event Ticket',
  '5. Public URLs',
  'Domain deiner Webapp',
  'Supabase Function Base URL',
  'Wallet Installationsseite',
  '6. Design',
  'Logo-Felder',
  'Kartenvorschau-Komponenten',
  'Template-Typen',
  'QR/PDF-Komponenten',
  '7. Versandregeln',
  'Max. Nachrichten pro Kunde/Tag',
  'Max. Nachrichten pro Karte/Tag',
  'Standardtexte',
  'Erlaubte Zielgruppen'
].forEach((needle) => assertIncludes(doc, needle, 'Active Goal Context ist unvollständig'));

[
  'react',
  'vite',
  'next',
  '@vitejs',
  'vue',
  'angular'
].forEach((dependencyName) => {
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  };

  assert(
    !(dependencyName in dependencies),
    `Frontend-Framework-Dependency darf im MVP nicht vorhanden sein: ${dependencyName}`
  );
});

[
  'operator_profiles',
  'businesses',
  'card_templates',
  'customer_cards',
  'card_instances',
  'card_events',
  'apple_wallet_devices',
  'apple_wallet_registrations',
  'apple_pass_versions',
  'google_wallet_objects',
  'wallet_notification_campaigns',
  'wallet_notification_recipients',
  'wallet_push_logs',
  'wallet_update_queue'
].forEach((tableName) => {
  assertIncludes(schema, tableName, `supabase/schema.sql muss Tabelle oder Referenz enthalten`);
  assertIncludes(doc, tableName, `Active Goal Context muss Tabelle führen`);
});

[
  ['publicUrls', 'webAppDomain'],
  ['publicUrls', 'supabaseFunctionBaseUrl'],
  ['publicUrls', 'walletInstallPage'],
  ['publicUrls', 'appPublicBaseUrl'],
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
  ['googleWallet', 'issuerId'],
  ['googleWallet', 'serviceAccountJson'],
  ['googleWallet', 'desiredPassTypes'],
  ['deliveryRules', 'businessDailyLimit'],
  ['deliveryRules', 'customerDailyLimit'],
  ['deliveryRules', 'cardDailyLimit'],
  ['deliveryRules', 'googleTextAndNotifyLimitPerPass24h'],
  ['deliveryRules', 'duplicateWindowMinutes'],
  ['deliveryRules', 'defaultTitle'],
  ['deliveryRules', 'defaultMessage'],
  ['deliveryRules', 'allowedTargets']
].forEach((segments) => {
  assert(hasPath(configExample, segments), `config.example.json fehlt aktiven Goal-Wert: ${segments.join('.')}`);
});

[
  'generic',
  'loyalty',
  'offer',
  'eventTicket'
].forEach((type) => {
  assert(
    configExample.googleWallet.desiredPassTypes.includes(type),
    `config.example.json googleWallet.desiredPassTypes fehlt ${type}`
  );
});

[
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
].forEach((target) => {
  assert(
    configExample.deliveryRules.allowedTargets.includes(target),
    `config.example.json deliveryRules.allowedTargets fehlt ${target}`
  );
});

[
  'docs/WALLET_ACTIVE_GOAL_CONTEXT.md',
  'Frontend',
  'Tabellen',
  'Apple',
  'Google',
  'Public URLs',
  'Design',
  'Versandregeln'
].forEach((needle) => {
  assertIncludes(readme, needle, `README muss Active Goal Context erwähnen`);
});

[
  'docs/WALLET_ACTIVE_GOAL_CONTEXT.md',
  'Aktiver Goal-Kontext'
].forEach((needle) => {
  assertIncludes(context, needle, `Wallet Integration Context muss Active Goal Context verlinken`);
});

assertIncludes(audit, 'docs/WALLET_ACTIVE_GOAL_CONTEXT.md', 'Goal Audit muss Active Goal Context verlinken');
assertIncludes(plan, 'docs/WALLET_ACTIVE_GOAL_CONTEXT.md', 'Implementation Plan muss Active Goal Context verlinken');
assertIncludes(packageJsonRaw, 'verify-wallet-active-goal-context.js', 'pnpm check muss Active Goal Context prüfen');

console.log('Wallet Active Goal Context ist dokumentiert und gegen Config, Schema und Package abgesichert.');
