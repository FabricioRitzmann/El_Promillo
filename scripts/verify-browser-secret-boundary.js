import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const publicDir = path.join(rootDir, 'public');
const serverConfigPath = path.join(rootDir, 'server', 'config.js');

const forbiddenNeedles = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'serviceRoleKey',
  'service_role',
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
  'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_WALLET_PRIVATE_KEY',
  'serviceAccountJson',
  'serviceAccountEmail',
  'privateKey',
  'wwdrCert',
  'passCert',
  'passKey',
  'apnsAuthKey',
  'signerCertPath',
  'signerKeyPath',
  'signerKeyPassphrase'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listFiles(absolutePath);
    }

    return absolutePath;
  });
}

function relative(filePath) {
  return path.relative(rootDir, filePath);
}

function assertNoForbiddenNeedles(label, content, filePath) {
  for (const needle of forbiddenNeedles) {
    assert(
      !content.includes(needle),
      `${label} enthält serverseitiges Secret-Feld "${needle}": ${filePath}`
    );
  }
}

for (const filePath of listFiles(publicDir)) {
  const content = fs.readFileSync(filePath, 'utf8');
  assertNoForbiddenNeedles('Browser-Bundle', content, relative(filePath));
  assert(
    !/select\s*:\s*['"]\*['"]/.test(content),
    `Browser-Bundle darf keine breiten Supabase Selects mit select: '*' verwenden: ${relative(filePath)}`
  );
}

const serverConfig = fs.readFileSync(serverConfigPath, 'utf8');
const publicConfigMatch = serverConfig.match(/export function getPublicConfig\(config\) \{[\s\S]*?\n\}/);

assert(publicConfigMatch, 'server/config.js muss getPublicConfig(config) enthalten.');

const publicConfigBlock = publicConfigMatch[0];

assert(publicConfigBlock.includes('anonKey: config.supabase.anonKey'), 'Public Config darf nur den Supabase Anon Key ausliefern.');
assert(publicConfigBlock.includes('url: config.supabase.url'), 'Public Config muss die Supabase URL ausliefern.');
assert(!publicConfigBlock.includes('passkit'), 'Public Config darf keinen PassKit-Status oder PassKit-Felder mehr an den Browser ausliefern.');
assert(publicConfigBlock.includes('deliveryRules'), 'Public Config muss nicht-sensitive Wallet-Versandregeln ausliefern dürfen.');
assert(publicConfigBlock.includes('businessDailyLimit: positiveInteger(deliveryRules.businessDailyLimit'), 'Public Config muss das nicht-sensitive Business-Tageslimit ausliefern.');
assert(publicConfigBlock.includes('customerDailyLimit: positiveInteger(deliveryRules.customerDailyLimit'), 'Public Config muss das nicht-sensitive Kunden-Tageslimit ausliefern.');
assert(publicConfigBlock.includes('cardDailyLimit: positiveInteger(deliveryRules.cardDailyLimit'), 'Public Config muss das nicht-sensitive Karten-Tageslimit ausliefern.');
assert(publicConfigBlock.includes('googleTextAndNotifyLimitPerPass24h: positiveInteger(deliveryRules.googleTextAndNotifyLimitPerPass24h'), 'Public Config muss das nicht-sensitive Google-Wallet-Limit ausliefern.');
assert(publicConfigBlock.includes('duplicateWindowMinutes: positiveInteger(deliveryRules.duplicateWindowMinutes'), 'Public Config muss das nicht-sensitive Deduplizierungsfenster ausliefern.');
assert(publicConfigBlock.includes('publicClaimRateLimit: positiveInteger(deliveryRules.publicClaimRateLimit'), 'Public Config muss das nicht-sensitive öffentliche Claim-Limit ausliefern.');
assert(publicConfigBlock.includes('publicClaimRateLimitWindowSeconds: positiveInteger(deliveryRules.publicClaimRateLimitWindowSeconds'), 'Public Config muss das nicht-sensitive Claim-Limit-Zeitfenster ausliefern.');
assert(publicConfigBlock.includes('defaultTitle: deliveryRules.defaultTitle'), 'Public Config muss den Standardtitel für Wallet-Nachrichten ausliefern.');
assert(publicConfigBlock.includes('defaultMessage: deliveryRules.defaultMessage'), 'Public Config muss den Standardtext für Wallet-Nachrichten ausliefern.');
assert(publicConfigBlock.includes('allowedTargets: Array.isArray(deliveryRules.allowedTargets)'), 'Public Config muss erlaubte Wallet-Zielgruppen ausliefern.');
assertNoForbiddenNeedles('/api/config Public Config', publicConfigBlock, 'server/config.js#getPublicConfig');

console.log('Browser-Secret-Grenze ist statisch abgesichert.');
