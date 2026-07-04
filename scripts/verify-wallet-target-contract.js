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

function extractStringArray(source, variableName) {
  const match = source.match(new RegExp(`const\\s+${variableName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));

  assert(match, `${variableName} wurde nicht gefunden.`);

  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function assertSameSet(left, right, label) {
  const leftSorted = sorted(left);
  const rightSorted = sorted(right);

  assert(
    JSON.stringify(leftSorted) === JSON.stringify(rightSorted),
    `${label} weicht ab.\nLinks: ${leftSorted.join(', ')}\nRechts: ${rightSorted.join(', ')}`
  );
}

const service = read('supabase/functions/_shared/walletNotificationService.ts');
const schema = read('supabase/schema.sql');
const editorJs = read('public/js/editor.js');
const editorHtml = read('public/editor.html');
const readme = read('README.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');
const configExample = JSON.parse(read('config.example.json'));

const backendTargets = extractStringArray(service, 'ALLOWED_TARGET_TYPES');
const configTargets = configExample.deliveryRules.allowedTargets;
const requiredTargets = [
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

assertSameSet(backendTargets, requiredTargets, 'Backend-Zielgruppen');
assertSameSet(configTargets, requiredTargets, 'config.example.json deliveryRules.allowedTargets');

for (const target of requiredTargets) {
  assertIncludes(schema, `'${target}'`, 'SQL target_type Constraint muss Zielgruppe erlauben');
  assertIncludes(editorJs, `'${target}'`, 'Editor muss Zielgruppe kennen');
}

const featureTargets = {
  stamp_count: 'stamps',
  streak_count: 'streak',
  vip_level: 'vip',
  balance_range: 'balance',
  cloakroom_open: 'cloakroom',
  event: 'checkin',
  coupon_unredeemed: 'redemption',
  membership_status: 'membership'
};

for (const [target, feature] of Object.entries(featureTargets)) {
  assertIncludes(service, `${target}: '${feature}'`, 'Backend targetRequiresFeature muss Zielgruppe auf Feature mappen');
  assertIncludes(schema, `when '${target}' then '${feature}'`, 'SQL Campaign-Trigger muss Zielgruppe auf Feature mappen');
}

[
  "options.splice(1, 0, ['template'",
  "featureEnabled(template, 'stamps')",
  "featureEnabled(template, 'streak')",
  "featureEnabled(template, 'vip')",
  "featureEnabled(template, 'balance')",
  "featureEnabled(template, 'cloakroom')",
  "featureEnabled(template, 'checkin')",
  "featureEnabled(template, 'redemption')",
  "featureEnabled(template, 'membership')",
  "allowedWalletNotificationTargets()",
  "options.filter(([value]) => allowedTargets.includes(value))"
].forEach((needle) => assertIncludes(editorJs, needle, 'Editor-Zielgruppen müssen matrix- und configgesteuert bleiben'));

[
  'data-target-filter="stamp_count streak_count"',
  'data-target-filter="vip_level"',
  'data-target-filter="balance_range"',
  'data-target-filter="membership_status"',
  'data-target-filter="event"',
  'name="target_active_from"',
  'name="target_active_until"'
].forEach((needle) => assertIncludes(editorHtml, needle, 'Editor muss passende Zielgruppenfilterfelder bereitstellen'));

[
  'dateFilterKeys',
  'targetSpecificKeys',
  "'min'",
  "'max'",
  "'minCents'",
  "'min_cents'",
  "'maxCents'",
  "'max_cents'",
  "'activeFrom'",
  "'active_from'",
  "'activeUntil'",
  "'active_until'",
  "'createdAfter'",
  "'created_after'",
  "'createdBefore'",
  "'created_before'",
  "'vipLevel'",
  "'vip_level'",
  "'membershipStatus'",
  "'membership_status'",
  "'status'",
  "'eventId'",
  "'event_id'",
  "'eventName'",
  "'event_name'",
  'TARGET_FILTER_FIELD_NOT_ALLOWED_FOR_TARGET',
  'const forbiddenForTarget = Object.keys(targetFilter).find((key) => !allowedKeys.has(key))'
].forEach((needle) => assertIncludes(service, needle, 'Backend muss erlaubte target_filter Felder kennen'));

[
  'CAMPAIGN_TARGET_FILTER_FIELD_FORBIDDEN',
  "new.target_type in ('stamp_count', 'streak_count')",
  "new.target_type = 'balance_range'",
  "new.target_type = 'vip_level'",
  "new.target_type = 'membership_status'",
  "new.target_type = 'event'",
  'CAMPAIGN_TARGET_FILTER_TOO_LARGE',
  'CAMPAIGN_TARGET_FILTER_RANGE_INVALID',
  'CAMPAIGN_TARGET_FILTER_DATE_RANGE_INVALID',
  'CAMPAIGN_TARGET_FILTER_TEXT_TOO_LONG',
  'CAMPAIGN_TEMPLATE_REQUIRED',
  'CAMPAIGN_TARGET_FEATURE_FORBIDDEN',
  'CAMPAIGN_NOTIFICATIONS_DISABLED'
].forEach((needle) => assertIncludes(schema, needle, 'SQL muss Zielgruppenfilter und Template-Feature serverseitig validieren'));

[
  'validateTargetAgainstTemplate',
  'validateTargetFilter',
  'targetFilterObject',
  'cardMatchesTarget',
  "featureEnabled(instance.card_templates, 'notifications')",
  'TEMPLATE_REQUIRED_FOR_TARGET',
  'TARGET_NOT_ALLOWED_FOR_TEMPLATE',
  'NOTIFICATIONS_DISABLED_FOR_TEMPLATE'
].forEach((needle) => assertIncludes(service, needle, 'Backend muss Zielgruppen serverseitig validieren und anwenden'));

assertIncludes(readme, 'scripts/verify-wallet-target-contract.js', 'README muss den Wallet Target Contract Check nennen');
assertIncludes(context, 'scripts/verify-wallet-target-contract.js', 'Wallet-Kontext muss den Wallet Target Contract Check nennen');
assertIncludes(packageJson, 'verify-wallet-target-contract.js', 'pnpm check muss den Wallet Target Contract prüfen');

console.log('Wallet-Zielgruppenvertrag ist zwischen Config, Editor, Edge Backend und SQL synchron.');
