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

function assertIncludes(label, source, needles) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listFiles(absolutePath);
    }

    return entry.isFile() ? [absolutePath] : [];
  });
}

[
  'supabase/functions/_shared/walletDesign.ts',
  'supabase/functions/generate-wallet-asset/index.ts',
  'docs/wallet-design-parity.md',
  'docs/wallet-feature-limitations.md'
].forEach(assertFile);

const walletDesign = read('supabase/functions/_shared/walletDesign.ts');
const appleProvider = read('supabase/functions/_shared/appleWalletProvider.ts');
const googleProvider = read('supabase/functions/_shared/googleWalletProvider.ts');
const samsungProvider = read('supabase/functions/_shared/samsungWalletProvider.ts');
const generateWalletAsset = read('supabase/functions/generate-wallet-asset/index.ts');
const deployScript = read('scripts/deploy-wallet-functions.sh');
const editorUi = read('public/js/ui.js');
const styles = read('public/styles.css');
const editor = read('public/js/editor.js');
const claim = read('public/js/claim.js');
const schema = read('supabase/schema.sql');
const parityDoc = read('docs/wallet-design-parity.md');
const limitationsDoc = read('docs/wallet-feature-limitations.md');
const packageJson = read('package.json');

assertIncludes('Wallet Design Abstraktion', walletDesign, [
  'export type EditorCardDesign',
  'export type EditorCardField',
  'export type WalletDesignWarning',
  "export type WalletPlatform = 'apple' | 'google' | 'samsung'",
  'activeFeaturesForTemplate',
  'featureEnabled(template, ' + "'stamps')",
  'featureEnabled(template, ' + "'streak')",
  'featureEnabled(template, ' + "'vip')",
  'featureEnabled(template, ' + "'balance')",
  'featureEnabled(template, ' + "'cloakroom')",
  'featureEnabled(template, ' + "'redemption')",
  'featureEnabled(template, ' + "'membership')",
  'supabaseCardEmblemUrl(cardInstance',
  "Deno.env.get('SUPABASE_URL')",
  'editorCardDesignFromTemplate',
  'mapEditorDesignToApplePass',
  'mapEditorDesignToGoogleWalletObject',
  'mapEditorDesignToSamsungWalletCard'
]);

assertIncludes('Wallet Fallbacks und Warnungen', walletDesign, [
  'platform-fonts',
  'background-image-template-limits',
  'stamp-grid-not-native',
  'streak-layout-not-native',
  'front-field-overflow',
  'missing-brand-asset',
  "assetType: 'stamp_grid'",
  "assetType: 'streak_badge'",
  "assetType: 'wallet_background'",
  "'asset'",
  "'details'",
  "'partial'",
  "'unsupported'"
]);

assertIncludes('Apple Provider Design Mapping', appleProvider, [
  "import { editorCardDesignFromTemplate, mapEditorDesignToApplePass } from './walletDesign.ts'",
  'const editorDesign = editorCardDesignFromTemplate(template, cardInstance',
  'const appleDesign = mapEditorDesignToApplePass(editorDesign, cardInstance)',
  'appleDesign.colors.backgroundColor',
  'appleDesign.colors.foregroundColor',
  'appleDesign.colors.labelColor',
  'const appleBarcodes = appleDesign.barcodes.length',
  'barcodes: appleBarcodes',
  '[appleDesign.passStyle]: generic',
  'appleDesign.fieldSets.headerFields',
  'appleDesign.fieldSets.primaryFields',
  'appleDesign.fieldSets.secondaryFields',
  'appleDesign.fieldSets.auxiliaryFields',
  'appleDesign.fieldSets.backFields'
]);

assertIncludes('Google Provider Design Mapping', googleProvider, [
  "import { editorCardDesignFromTemplate, mapEditorDesignToGoogleWalletObject } from './walletDesign.ts'",
  'const googleDesign = mapEditorDesignToGoogleWalletObject(editorDesign, cardInstance)',
  'mergeTextModules(statusModules(template, cardInstance, extraRows), googleDesign.textModulesData)',
  'googleDesign.hexBackgroundColor',
  'googleDesign.barcode',
  'googleDesign.cardTitle',
  'googleDesign.header',
  'googleDesign.subheader',
  'googleDesign.logo',
  'googleDesign.heroImage',
  'googleDesign.imageModulesData'
]);

assertIncludes('Samsung Provider Design Mapping', samsungProvider, [
  "import { editorCardDesignFromTemplate, mapEditorDesignToSamsungWalletCard } from './walletDesign.ts'",
  'const editorDesign = editorCardDesignFromTemplate(template, instance)',
  'const samsungDesign = mapEditorDesignToSamsungWalletCard(editorDesign, instance)',
  'const mappedAttributes = samsungDesign.attributes',
  'mappedAttributes.title',
  'mappedAttributes.noticeDesc',
  "mappedAttributes['barcode.value']",
  'mappedAttributes.bgColor',
  'mappedAttributes.fontColor'
]);

assertIncludes('Serverseitige Wallet Asset Generierung', generateWalletAsset, [
  'Deno.serve(async (request)',
  'walletNotificationService.context(request)',
  'card_instance_id',
  'wallet_platform',
  'asset_type',
  "supportedAssetTypes = new Set(['stamp_grid', 'streak_badge', 'wallet_background', 'decorative_title', 'club_module_badges'])",
  '.eq(' + "'owner_id', context.ownerId)",
  '.eq(' + "'business_id', context.business.id)",
  "from('wallet-assets')",
  "contentType: 'image/png'",
  'MAX_WALLET_ASSET_BYTES = 2 * 1024 * 1024',
  'encodePng(rendered.width, rendered.height, rendered.rgba)',
  'asset_url',
  'asset_path'
]);

assertIncludes('Wallet Asset Deploy', deployScript, [
  'generate-wallet-asset'
]);

assertIncludes('Editor Wallet Warnungen', editorUi, [
  'function walletPlatformWarnings(template, card',
  'function walletPlatformWarningsHtml(template, card',
  'function walletPlatformPreviewsHtml(template, card',
  'function walletPlatformStyleLabels(template)',
  'Wallet-Hinweise',
  'Plattform-Vorschau',
  'wallet-platform-apple',
  'wallet-platform-google',
  'wallet-platform-samsung',
  'wallet-warning-${escapeHtml(warning.level)}',
  "level: 'info'",
  "level: 'warning'",
  "level: 'critical'",
  'Stempelraster',
  'Streak-Anzeige',
  'Hintergrundbild',
  'Viele Felder',
  'Bild-URL',
  'walletPreviewHtml(template, card = null, options = {})',
  'options.showWalletInsights === true',
  'const platformWarnings = walletPlatformWarningsHtml(template, card'
]);

assertIncludes('Editor Wallet Warnstyles', styles, [
  '.wallet-preview-stack',
  '.wallet-platform-previews',
  '.wallet-platform-preview-grid',
  '.wallet-platform-preview-card',
  '.wallet-platform-apple',
  '.wallet-platform-google',
  '.wallet-platform-samsung',
  '.wallet-platform-warnings',
  '.wallet-warning-item',
  '.wallet-warning-info',
  '.wallet-warning-warning',
  '.wallet-warning-critical',
  '.wallet-warning-platforms'
]);

assertIncludes('Editor aktiviert Wallet Insights', editor, [
  'walletPreviewHtml({',
  'showWalletInsights: true'
]);

assert(
  !claim.includes('showWalletInsights: true'),
  'Die öffentliche Claim-Seite darf keine internen Wallet-Insights aktivieren.'
);

assertIncludes('Wallet Design Update Queue', schema, [
  'create or replace function public.enqueue_wallet_update_after_template_design_change()',
  "update_reason text := 'design_changed'",
  "update_reason := 'asset_changed'",
  "update_reason := 'field_changed'",
  "update_reason := 'feature_changed'",
  "insert into public.wallet_update_queue",
  "'source', 'card_templates_update_trigger'",
  "ci.wallet_platform in ('apple', 'google')",
  "existing.payload->>'source' = 'card_templates_update_trigger'",
  'insert into public.samsung_wallet_events',
  "'template_design_update_prepared'",
  "'next_action', 'update-samsung-wallet-pass'",
  'drop trigger if exists enqueue_wallet_update_jobs_after_template_update on public.card_templates',
  'create trigger enqueue_wallet_update_jobs_after_template_update'
]);

assertIncludes('Wallet Design Parity Doku', parityDoc, [
  '# Wallet Design Parity',
  'Apple Wallet Pass Design and Creation',
  'Google Wallet Classes and Objects',
  'Samsung Wallet Cards API',
  'Editor Design Elements',
  '| Editor-Element | Editor-Darstellung | Apple Wallet | Google Wallet | Samsung Wallet | 1:1 moeglich | Problem | Alternative | Implementierungsstatus |',
  'Custom Font',
  'Stempelraster',
  'Clubkarte',
  'generate-wallet-asset',
  'Implementiert fuer PNG-Fallbacks',
  'Implementiert fuer sichtbare Info/Warning/Critical Hinweise',
  'Implementiert fuer Apple/Google/Samsung Vorschau-Skizzen im Editor',
  'Implementiert fuer Apple/Google Queue-Jobs und Samsung Update-Vorbereitung',
  'Keine Apple-, Google- oder Samsung-Secrets im Browser'
]);

assertIncludes('Wallet Feature Limitations Doku', limitationsDoc, [
  '# Wallet Feature Limitations',
  '## Apple Wallet',
  '## Google Wallet',
  '## Samsung Wallet',
  '## Unterschiede Zwischen Plattformen',
  '### Funktioniert Nur Bei Apple',
  '### Funktioniert Nur Bei Google',
  '### Funktioniert Nur Bei Samsung',
  '### Funktioniert Bei Apple + Google, Aber Nicht Samsung',
  '### Funktioniert Bei Google + Samsung, Aber Nicht Apple',
  '### Funktioniert Bei Apple + Samsung, Aber Nicht Google',
  '## Clubkarte',
  '## Asset-Fallbacks',
  'generate-wallet-asset` ist implementiert',
  '## Update Queue',
  'enqueue_wallet_update_after_template_design_change()',
  'template_design_update_prepared',
  '## Editor-Warnungen',
  'Editor-UI zeigt plattformbezogene Hinweise',
  'separate Apple-, Google- und Samsung-Vorschau-Skizzen',
  '## Security'
]);

const publicSources = listFiles(path.join(rootDir, 'public'))
  .filter((file) => /\.(js|html|css)$/.test(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

[
  'APPLE_PASS_TYPE_IDENTIFIER',
  'APPLE_TEAM_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
  'GOOGLE_WALLET_PRIVATE_KEY',
  'SAMSUNG_WALLET_PRIVATE_KEY_PEM',
  'SAMSUNG_WALLET_SAMSUNG_PUBLIC_KEY_PEM',
  'SAMSUNG_WALLET_PARTNER_ID'
].forEach((secretName) => {
  assert(!publicSources.includes(secretName), `Frontend darf ${secretName} nicht referenzieren.`);
});

assert(
  !publicSources.includes("from './walletDesign.ts'") && !publicSources.includes('walletDesign.ts'),
  'Die serverseitige Wallet-Design-Abstraktion darf nicht ins Frontend importiert werden.'
);

assert(
  packageJson.includes('verify-wallet-design-parity.js'),
  'package.json muss verify-wallet-design-parity.js in pnpm check ausfuehren.'
);

console.log('Wallet Design Parity ist fuer zentrale Mapper, Provider-Anbindung, Doku, Fallbacks und Secret-Grenzen statisch abgesichert.');
