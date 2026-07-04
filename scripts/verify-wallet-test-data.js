import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const testData = fs.readFileSync(path.join(rootDir, 'supabase/test-data.sql'), 'utf8');
const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const context = fs.readFileSync(path.join(rootDir, 'docs/WALLET_INTEGRATION_CONTEXT.md'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, message) {
  assert(content.includes(needle), `${message}: ${needle}`);
}

[
  'Demo-Business',
  'Demo Stempelkarte',
  'Demo VIP Karte',
  'Demo Guthabenkarte',
  'Demo Garderobenkarte',
  'Demo Eventkarte',
  'Demo Couponkarte',
  'Demo Clubkarte Basis',
  'Demo Clubkarte VIP',
  'Demo Clubkarte Guthaben',
  'Demo Clubkarte Garderobe',
  'Demo Clubkarte Coupon',
  'Demo Clubkarte Mitgliedschaft',
  'Demo Clubkarte Alle Features',
  'WC-DEMO-APPLE',
  'WC-DEMO-GOOGLE',
  'WC-DEMO-BALANCE',
  'WC-DEMO-CLOAK',
  'WC-DEMO-EVENT',
  'WC-DEMO-COUPON',
  'WC-DEMO-CLUB-BASE',
  'WC-DEMO-CLUB-VIP',
  'WC-DEMO-CLUB-BALANCE',
  'WC-DEMO-CLUB-CLOAK',
  'WC-DEMO-CLUB-COUPON',
  'WC-DEMO-CLUB-MEMBER',
  'WC-DEMO-CLUB-ALL',
  '"club_test_case": "A"',
  '"club_test_case": "G"',
  '"coupon_status": "unused"',
  '"membership_number": "M-DEMO-999"',
  'apple_wallet_devices',
  'apple_wallet_registrations',
  'apple_pass_versions',
  "encode(digest('demo-apple-auth-token', 'sha256'), 'hex')",
  '"authenticationToken": "demo-apple-auth-token"',
  '"webServiceURL": "https://example.com/functions/v1/apple-wallet-webservice"',
  '"PKBarcodeFormatQR"',
  '"message": "WC-DEMO-APPLE"',
  '"locations"',
  'on conflict (card_instance_id, version) do update',
  'wallet_notification_recipients',
  'Demo Sofortnachricht',
  'Demo geplante Nachricht',
  'Demo Garderoben-Erinnerung'
].forEach((needle) => assertIncludes(testData, needle, 'Wallet-Testdaten decken den geforderten Demo-Seed nicht ab'));

[
  'scan_events',
  'demographics_collected = true',
  "'male'",
  "'female'",
  "'18_plus'",
  "'25_plus'",
  "'30_plus'",
  'is_first_scan',
  'demographics_were_collected',
  'active_club_features',
  'scan_event_id',
  'customer_gender',
  'customer_age_group'
].forEach((needle) => assertIncludes(testData, needle, 'Wallet-Testdaten müssen Erstscan-Demografie und Besucherstatistik abdecken'));

[
  'genericObject',
  'loyaltyObject',
  'offerObject',
  'eventTicketObject'
].forEach((objectType) => assertIncludes(testData, objectType, 'Wallet-Testdaten müssen alle gewünschten Google-Wallet-Object-Typen enthalten'));

[
  "'stamp_card'",
  "'vip_card'",
  "'balance_card'",
  "'cloakroom_card'",
  "'event_card'",
  "'coupon_card'",
  "'club_card'"
].forEach((templateType) => assertIncludes(testData, templateType, 'Wallet-Testdaten müssen die MVP-/Google-Demo-Template-Typen enthalten'));

[
  '"vip": false, "balance": false, "cloakroom": false, "coupon": false, "membership": false',
  '"vip": true, "balance": false, "cloakroom": false, "coupon": false, "membership": false',
  '"vip": false, "balance": true, "cloakroom": false, "coupon": false, "membership": false',
  '"vip": false, "balance": false, "cloakroom": true, "coupon": false, "membership": false',
  '"vip": false, "balance": false, "cloakroom": false, "coupon": true, "membership": false',
  '"vip": false, "balance": false, "cloakroom": false, "coupon": false, "membership": true',
  '"vip": true, "balance": true, "cloakroom": true, "coupon": true, "membership": true'
].forEach((clubFeatureSet) => assertIncludes(testData, clubFeatureSet, 'Wallet-Testdaten müssen alle Clubkarten-Feature-Kombinationen A-G enthalten'));

[
  "wallet_platform,\n    wallet_object_id,\n    wallet_serial_number",
  "case when c.wallet_platform = 'apple' then c.pass_serial_number else null end",
  "case when c.wallet_platform = 'google' then c.wallet_object_id else null end",
  'on conflict (card_instance_id) do update'
].forEach((needle) => assertIncludes(testData, needle, 'Wallet-Testdaten müssen card_instances und Google-Objekte idempotent vorbereiten'));

assertIncludes(readme, 'Event-, Coupon- und Clubkarten-Templates', 'README muss die erweiterten Testdaten erwähnen');
assertIncludes(readme, '`genericObject`, `loyaltyObject`, `offerObject` und `eventTicketObject`', 'README muss die Google-Wallet-Testtypen dokumentieren');
assertIncludes(context, 'Event-, Coupon- und Clubkarten-Templates', 'Wallet-Kontext muss die erweiterten Testdaten erwähnen');
assertIncludes(context, '`genericObject`, `loyaltyObject`, `offerObject` und `eventTicketObject`', 'Wallet-Kontext muss die Google-Wallet-Testtypen dokumentieren');

console.log('Wallet-Testdaten decken Demo-Business, Karten, Kampagnen und Google-Object-Typen ab.');
