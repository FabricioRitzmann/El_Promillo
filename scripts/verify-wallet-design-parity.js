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
  'supabase/functions/_shared/walletAssets.ts',
  'supabase/functions/_shared/walletAssetRenderer.ts',
  'supabase/functions/_shared/walletAssetFallbacks.ts',
  'supabase/functions/generate-wallet-asset/index.ts',
  'docs/wallet-design-parity.md',
  'docs/wallet-feature-limitations.md',
  'docs/wallet-design-parity-checklist.md'
].forEach(assertFile);

const walletDesign = read('supabase/functions/_shared/walletDesign.ts');
const walletAssets = read('supabase/functions/_shared/walletAssets.ts');
const walletAssetRenderer = read('supabase/functions/_shared/walletAssetRenderer.ts');
const walletAssetFallbacks = read('supabase/functions/_shared/walletAssetFallbacks.ts');
const appleProvider = read('supabase/functions/_shared/appleWalletProvider.ts');
const googleProvider = read('supabase/functions/_shared/googleWalletProvider.ts');
const samsungProvider = read('supabase/functions/_shared/samsungWalletProvider.ts');
const providerRegistry = read('supabase/functions/_shared/walletProviderRegistry.ts');
const walletNotificationService = read('supabase/functions/_shared/walletNotificationService.ts');
const generateWalletAsset = read('supabase/functions/generate-wallet-asset/index.ts');
const issueApplePass = read('supabase/functions/issue-apple-pass/index.ts');
const claimApplePass = read('supabase/functions/claim-apple-pass/index.ts');
const updateApplePass = read('supabase/functions/update-apple-pass/index.ts');
const sendAppleWalletUpdate = read('supabase/functions/send-apple-wallet-update/index.ts');
const issueGoogleWalletPass = read('supabase/functions/issue-google-wallet-pass/index.ts');
const googleWalletSaveLink = read('supabase/functions/google-wallet-save-link/index.ts');
const updateGoogleWalletPass = read('supabase/functions/update-google-wallet-pass/index.ts');
const sendGoogleWalletMessage = read('supabase/functions/send-google-wallet-message/index.ts');
const samsungWalletServer = read('supabase/functions/samsung-wallet-server/index.ts');
const scannerEdge = read('supabase/functions/scanner-actions/index.ts');
const serverFallback = read('server/index.js');
const deployScript = read('scripts/deploy-wallet-functions.sh');
const editorUi = read('public/js/ui.js');
const styles = read('public/styles.css');
const editor = read('public/js/editor.js');
const claim = read('public/js/claim.js');
const schema = read('supabase/schema.sql');
const parityDoc = read('docs/wallet-design-parity.md');
const limitationsDoc = read('docs/wallet-feature-limitations.md');
const checklistDoc = read('docs/wallet-design-parity-checklist.md');
const packageJson = read('package.json');

assertIncludes('Wallet Design Abstraktion', walletDesign, [
  'export type EditorCardDesign',
  'export type EditorCardField',
  'export type WalletDesignWarning',
  "export type EditorBarcodeFormat = 'qr' | 'aztec' | 'pdf417' | 'code128'",
  'export type WalletLocation',
  'export type WalletBeacon',
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

assertIncludes('Wallet Location Mapping', walletDesign, [
  'function walletLocationsFor(template: Row, cardInstance: Row, options: Row)',
  'function walletBeaconsFor(template: Row, cardInstance: Row, options: Row)',
  'normalizeWalletLocation',
  'normalizeWalletBeacon',
  'locations,',
  'beacons,',
  'locations: editorDesign.locations',
  'beacons: editorDesign.beacons',
  'location-relevance-platform-limits'
]);

assertIncludes('Wallet Barcode Format Mapping', walletDesign, [
  'function normalizeBarcodeFormat(value: unknown)',
  'function barcodeFormatFor(template: Row, cardInstance: Row, options: Row)',
  'function barcodeValueFor(template: Row, cardInstance: Row, options: Row, fallback: string)',
  'options.barcodeFormat',
  'options.barcodeValue',
  'metadata.barcodeFormat',
  'metadata.barcodeValue',
  'settings.barcodeFormat',
  'settings.barcodeValue',
  'barcodeFormat,',
  'barcodeValueFor(template, cardInstance, options, cardInstanceNumber)',
  'function appleBarcodeFormat(format: EditorBarcodeFormat)',
  'appleBarcodeFormat(editorDesign.barcodeFormat)',
  "'PKBarcodeFormatAztec'",
  "'PKBarcodeFormatPDF417'",
  "'PKBarcodeFormatCode128'",
  'function googleBarcodeType(format: EditorBarcodeFormat)',
  'googleBarcodeType(editorDesign.barcodeFormat)',
  "'AZTEC'",
  "'PDF_417'",
  "'CODE_128'",
  'function samsungBarcodeAttributes(format: EditorBarcodeFormat)',
  'samsungBarcodeAttributes(editorDesign.barcodeFormat)',
  'barcode-format-template-limits'
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
  "assetType: 'club_module_badges'",
  "'asset'",
  "'details'",
  "'partial'",
  "'unsupported'"
]);

assertIncludes('Wallet Asset Pfadvertrag', walletAssets, [
  "export type WalletPlatform = 'apple' | 'google' | 'samsung'",
  "export type WalletAssetType = 'stamp_grid' | 'streak_badge' | 'wallet_background' | 'decorative_title' | 'club_module_badges'",
  "export const walletAssetBucket = 'wallet-assets'",
  'supportedWalletAssetTypes',
  'isWalletAssetType',
  'walletAssetFolderPath',
  'walletAssetStoragePath',
  'walletAssetPublicUrl',
  'walletAssetTypesForFallbacks',
  'existingWalletAssetPublicUrls',
  '/storage/v1/object/public/'
]);

assertIncludes('Wallet Asset Renderer', walletAssetRenderer, [
  'export const MAX_WALLET_ASSET_BYTES = 2 * 1024 * 1024',
  'export function renderWalletAsset',
  'export async function encodeWalletAssetPng',
  'renderStampGrid',
  'renderStreakBadge',
  'renderClubBadges',
  'renderBackground',
  'CompressionStream('
]);

assertIncludes('Wallet Asset Autogenerierung', walletAssetFallbacks, [
  "import { editorCardDesignFromTemplate } from './walletDesign.ts'",
  "import { walletAssetBucket, walletAssetStoragePath, walletAssetTypesForFallbacks } from './walletAssets.ts'",
  "import { encodeWalletAssetPng, MAX_WALLET_ASSET_BYTES, renderWalletAsset } from './walletAssetRenderer.ts'",
  'export async function ensureWalletAssetFallbacks',
  'walletAssetTypesForFallbacks(editorDesign.assetFallbacks, walletPlatform)',
  'renderWalletAsset(assetType as WalletAssetType, template, cardInstance, walletPlatform)',
  'encodeWalletAssetPng(rendered.width, rendered.height, rendered.rgba)',
  'generatedAssetUrls[assetType] = publicUrl',
  'generatedAssets.push'
]);

assertIncludes('Apple Provider Design Mapping', appleProvider, [
  "import { editorCardDesignFromTemplate, mapEditorDesignToApplePass } from './walletDesign.ts'",
  "import { walletAssetPublicUrl } from './walletAssets.ts'",
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
  'appleDesign.fieldSets.backFields',
  'appleDesign.locations',
  'appleDesign.beacons',
  'passJson.locations = passLocations',
  'passJson.beacons = passBeacons',
  'generatedAppleWalletAssetUrlsForTemplate',
  'generatedAssets.stamp_grid',
  'generatedAssets.streak_badge',
  'generatedAssets.wallet_background',
  'generatedAssets.club_module_badges',
  "files.set('background.png'"
]);

assertIncludes('Google Provider Design Mapping', googleProvider, [
  "import { editorCardDesignFromTemplate, mapEditorDesignToGoogleWalletObject } from './walletDesign.ts'",
  "import { existingWalletAssetPublicUrls, walletAssetTypesForFallbacks } from './walletAssets.ts'",
  'const googleDesign = mapEditorDesignToGoogleWalletObject(editorDesign, cardInstance)',
  'mergeTextModules(statusModules(template, cardInstance, extraRows), googleDesign.textModulesData)',
  'googleDesign.hexBackgroundColor',
  'googleDesign.barcode',
  'googleDesign.cardTitle',
  'googleDesign.header',
  'googleDesign.subheader',
  'googleDesign.logo',
  'googleDesign.heroImage',
  'googleDesign.imageModulesData',
  'generatedGoogleWalletAssetUrls',
  'applyGeneratedAssetImages',
  'existingWalletAssetPublicUrls(options.supabaseAdmin',
  "walletAssetTypesForFallbacks(editorDesign.assetFallbacks, 'google')",
  'statusPatch(template: Row, cardInstance: Row, objectType = objectTypeForTemplate(template), extraRows',
  'options.generatedAssetUrls',
  'mergeImageModules(payload.imageModulesData'
]);

assertIncludes('Apple Issue erzeugt Wallet Assets', issueApplePass, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'await ensureWalletAssetFallbacks({',
  "walletPlatform: 'apple'"
]);

assertIncludes('Apple Claim erzeugt Wallet Asset Fallbacks', claimApplePass, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'apple'",
  'appleWalletProvider.passVersionHasTemplateAssets(cardInstance.card_templates, data, cardInstance)',
  'generated_wallet_assets: options.generatedWalletAssets || []'
]);

assertIncludes('Apple manuelle Updates erzeugen Wallet Asset Fallbacks', updateApplePass, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'apple'",
  'appleWalletProvider.updatePassFields(context.supabaseAdmin, cardInstance, cardInstance.card_templates, passFields',
  'generated_wallet_assets: generatedAssetFallbacks.generatedAssets'
]);

assertIncludes('Apple Push Updates erzeugen Wallet Asset Fallbacks', sendAppleWalletUpdate, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'apple'",
  'appleWalletProvider.updatePassFields(context.supabaseAdmin, cardInstance, cardInstance.card_templates, passFields',
  'generated_wallet_assets: generatedAssetFallbacks.generatedAssets'
]);

assertIncludes('Google Issue Asset Optionen', issueGoogleWalletPass, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'google'",
  'const googleWalletAssetOptions = {',
  'supabaseAdmin: context.supabaseAdmin',
  'generatedAssetUrls: generatedAssetFallbacks.generatedAssetUrls',
  'googleWalletProvider.createObject(cardInstance.card_templates, cardInstance, googleWalletAssetOptions)',
  'googleWalletProvider.generateSaveLink(cardInstance.card_templates, cardInstance, googleWalletAssetOptions)'
]);

assertIncludes('Public Google Save-Link nutzt zentrale Design- und Asset-Pipeline', googleWalletSaveLink, [
  "import { googleWalletProvider } from '../_shared/googleWalletProvider.ts'",
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'function googleProviderCardInstance(cardInstance',
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'google'",
  'googleWalletProvider.generateSaveLink(card.card_templates, providerCardInstance',
  'generatedAssetUrls: generatedAssetFallbacks.generatedAssetUrls',
  'generated_wallet_assets'
]);

assertIncludes('Google manuelle Refresh Updates erzeugen Wallet Asset Fallbacks', updateGoogleWalletPass, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const refreshesStatusPatch = !Object.keys(patch).length',
  'generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'google'",
  'googleWalletProvider.statusPatch(resolved.cardInstance.card_templates, resolved.cardInstance, resolved.objectType, [], {',
  'generatedAssetUrls: generatedAssetFallbacks.generatedAssetUrls',
  'generated_wallet_assets: generatedAssetFallbacks.generatedAssets'
]);

assertIncludes('Google Message Fallback erzeugt Wallet Asset Fallbacks', sendGoogleWalletMessage, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'google'",
  'const fallbackPatch = googleWalletProvider.statusPatch(cardInstance.card_templates, cardInstance, objectType, [',
  'generatedAssetUrls: generatedAssetFallbacks.generatedAssetUrls',
  'generated_wallet_assets: generatedAssetFallbacks.generatedAssets'
]);

assert(
  !googleWalletSaveLink.includes('buildGoogleWalletPayload') && !googleWalletSaveLink.includes('async function signJwt'),
  'google-wallet-save-link darf keinen eigenen Google-Wallet-JWT/Payload-Builder mehr enthalten.'
);

assertIncludes('Samsung Provider Design Mapping', samsungProvider, [
  "import { editorCardDesignFromTemplate, mapEditorDesignToSamsungWalletCard } from './walletDesign.ts'",
  "import { existingWalletAssetPublicUrls, walletAssetTypesForFallbacks } from './walletAssets.ts'",
  'const editorDesign = editorCardDesignFromTemplate(template, instance)',
  'const samsungDesign = mapEditorDesignToSamsungWalletCard(editorDesign, instance)',
  'const mappedAttributes = samsungDesign.attributes',
  'mappedAttributes.title',
  'mappedAttributes.noticeDesc',
  "mappedAttributes['barcode.value']",
  "mappedAttributes['barcode.serialType']",
  "mappedAttributes['barcode.ptFormat']",
  "mappedAttributes['barcode.ptSubFormat']",
  'mappedAttributes.bgColor',
  'mappedAttributes.fontColor',
  'generatedSamsungWalletAssetUrls',
  "walletAssetTypesForFallbacks(editorDesign.assetFallbacks, 'samsung')",
  'samsungGeneratedMainImage',
  'cardDataForInstanceWithAssets'
]);

assertIncludes('Samsung Server Asset Optionen', samsungWalletServer, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'samsung'",
  'generatedAssetUrls: generatedAssetFallbacks.generatedAssetUrls',
  'await samsungWalletProvider.cardDataForInstanceWithAssets(template, instance',
  'supabaseAdmin,',
  'fields: new URL(request.url).searchParams.get'
]);

assertIncludes('Wallet Provider Registry nutzt Asset-Fallbacks', providerRegistry, [
  "import { ensureWalletAssetFallbacks } from './walletAssetFallbacks.ts'",
  'async function withWalletAssetFallbacks',
  "withWalletAssetFallbacks('apple'",
  "withWalletAssetFallbacks('google'",
  "withWalletAssetFallbacks('samsung'",
  'generatedAssetUrls',
  'googleWalletProvider.createObject(template, instance, assetOptions)',
  'googleWalletProvider.generateSaveLink(template, instance, assetOptions)',
  'googleWalletProvider.statusPatch(template, instance, objectType, [], assetOptions)',
  'samsungWalletProvider.cardDataForInstanceWithAssets(template, instance, assetOptions)'
]);

assertIncludes('Serverseitige Wallet Asset Generierung', generateWalletAsset, [
  "import { isWalletAssetType, supportedWalletAssetTypes, walletAssetStoragePath } from '../_shared/walletAssets.ts'",
  "import { encodeWalletAssetPng, MAX_WALLET_ASSET_BYTES, renderWalletAsset } from '../_shared/walletAssetRenderer.ts'",
  'Deno.serve(async (request)',
  'walletNotificationService.context(request)',
  'card_instance_id',
  'wallet_platform',
  'asset_type',
  'isWalletAssetType(assetType)',
  'supportedWalletAssetTypes.join',
  'walletAssetStoragePath({',
  '.eq(' + "'owner_id', context.ownerId)",
  '.eq(' + "'business_id', context.business.id)",
  "from('wallet-assets')",
  "contentType: 'image/png'",
  'MAX_WALLET_ASSET_BYTES',
  'renderWalletAsset(assetType, template, cardInstance, walletPlatform)',
  'encodeWalletAssetPng(rendered.width, rendered.height, rendered.rgba)',
  'asset_url',
  'asset_path'
]);

assertIncludes('Queue erzeugt Wallet Asset Fallbacks', walletNotificationService, [
  "import { ensureWalletAssetFallbacks } from './walletAssetFallbacks.ts'",
  'const walletAssetGeneration = await ensureWalletAssetFallbacks({',
  'generatedAssetUrls: walletAssetGeneration.generatedAssetUrls',
  'generated_wallet_assets'
]);

assertIncludes('Wallet Asset Deploy', deployScript, [
  'generate-wallet-asset'
]);

assertIncludes('Editor Wallet Warnungen', editorUi, [
  'function walletPlatformWarnings(template, card',
  'function walletPlatformWarningsHtml(template, card',
  'function walletPlatformPreviewsHtml(template, card',
  'function normalizeWalletBarcodeFormat(value)',
  'function walletBarcodeFormat(template, card, context = {})',
  'function walletBarcodeValue(template, card, context = {})',
  'function walletHasLocationRelevance(template, context = {})',
  'settings.barcodeFormat',
  'settings.barcodeValue',
  'metadata.barcodeFormat',
  'metadata.barcodeValue',
  'barcodeFormat.key !== ' + "'qr'",
  'Barcode-Format',
  'Samsung muss das Format im Partner-Template erlauben',
  'Standort-Hinweis',
  'Apple Wallet nutzt Standorte oder Beacons',
  '${escapeHtml(barcodeFormat.label)} · ${escapeHtml(barcodeValue)}',
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
  'old_barcode_signature jsonb',
  'new_barcode_signature jsonb',
  'old_settings_without_barcode jsonb',
  'new_settings_without_barcode jsonb',
  "old.settings->>'barcodeFormat'",
  "old.settings->>'barcodeValue'",
  "new.settings->>'barcode_format'",
  "new.settings->>'barcode_value'",
  "changed_fields := array_append(changed_fields, 'barcode')",
  "update_reason := 'barcode_changed'",
  "update_reason := 'asset_changed'",
  "update_reason := 'field_changed'",
  "update_reason := 'feature_changed'",
  "update_type = 'emblem_changed'",
  "legacy_update_type', 'emblem_update'",
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

assertIncludes('Initial-Scan Emblem Update Queue', scannerEdge, [
  "update_type: 'emblem_changed'",
  "source: 'scanner_actions_edge_function'",
  "update_type: 'emblem_changed'",
  'previous_emblem_key',
  'resolved_emblem_key'
]);

assertIncludes('Lokaler Initial-Scan Emblem Update Queue', serverFallback, [
  "update_type: 'emblem_changed'",
  "source: 'scanner_demographics'",
  "update_type: 'emblem_changed'",
  'previous_emblem_key',
  'resolved_emblem_key'
]);

assertIncludes('Wallet Design Parity Doku', parityDoc, [
  '# Wallet Design Parity',
  'Apple Wallet Pass Design and Creation',
  'Google Wallet Classes and Objects',
  'Samsung Wallet Cards API',
  'Editor Design Elements',
  '| Editor-Element | Editor-Darstellung | Apple Wallet | Google Wallet | Samsung Wallet | 1:1 moeglich | Problem | Alternative | Implementierungsstatus |',
  'Custom Font',
  'Standort / Beacon',
  '`locations` und `beacons` im `pass.json`',
  'Barcode / QR-Code',
  'PKBarcodeFormatAztec',
  'PDF_417',
  'CODE_128',
  'Samsung Barcode-Attribute',
  'Stempelraster',
  'Clubkarte',
  'club_module_badges',
  'generate-wallet-asset',
  'Implementiert fuer PNG-Fallbacks',
  'emblem_changed',
  'Initial-Scan-Queue-Update',
  'Implementiert fuer sichtbare Info/Warning/Critical Hinweise',
  'Implementiert fuer Apple/Google/Samsung Vorschau-Skizzen im Editor inklusive Barcodeformat-Beschriftung',
  'Implementiert fuer Apple/Google Queue-Jobs inklusive `emblem_changed`, automatische PNG-Fallbacks vor Updates und Samsung Update-Vorbereitung',
  'Keine Apple-, Google- oder Samsung-Secrets im Browser'
]);

assertIncludes('Wallet Feature Limitations Doku', limitationsDoc, [
  '# Wallet Feature Limitations',
  '## Apple Wallet',
  '## Google Wallet',
  '## Samsung Wallet',
  '## Unterschiede Zwischen Plattformen',
  '### Funktioniert Nur Bei Apple',
  'Native Pass-Relevanz ueber `locations` und `beacons`',
  '### Funktioniert Nur Bei Google',
  '### Funktioniert Nur Bei Samsung',
  '### Funktioniert Bei Apple + Google, Aber Nicht Samsung',
  '### Funktioniert Bei Google + Samsung, Aber Nicht Apple',
  '### Funktioniert Bei Apple + Samsung, Aber Nicht Google',
  '## Clubkarte',
  '## Asset-Fallbacks',
  'club_module_badges',
  'generate-wallet-asset` ist implementiert',
  '## Update Queue',
  'enqueue_wallet_update_after_template_design_change()',
  'Reine Barcodewert- oder Barcodeformat-Aenderungen',
  'template_design_update_prepared',
  '## Editor-Warnungen',
  'Editor-UI zeigt plattformbezogene Hinweise',
  'separate Apple-, Google- und Samsung-Vorschau-Skizzen',
  'Plattformvorschau zeigt das normalisierte Barcodeformat',
  'Standort-/Beacon-Konfiguration wird als Apple-native Relevanz markiert',
  'QR ist Samsung-Default',
  '## Security'
]);

assertIncludes('Wallet Design Parity Checkliste', checklistDoc, [
  '# Wallet Design Parity Checklist',
  '## Abgeschlossen Im Repository',
  '## Remote Nachweise',
  '## Verifizierte Commands',
  '## Externe Abnahme Noch Noetig',
  'mapEditorDesignToApplePass',
  'mapEditorDesignToGoogleWalletObject',
  'mapEditorDesignToSamsungWalletCard',
  'Barcodeformat-Parity',
  'Apple Standort-/Beacon-Relevanz',
  'Initial-Scan-Emblemwechsel',
  'generate-wallet-asset',
  'Apple `.pkpass` nimmt generierte PNG-Fallbacks',
  'Provider Registry bleibt auf derselben Pipeline',
  'Google Issue/Save-Link nutzt die zentrale Design- und Asset-Pipeline',
  'Google Guthabenkarte nutzt Gift Card Mapping',
  'Manuelle Apple/Google Wallet Updates nutzen dieselbe Asset-Fallback-Pipeline',
  'Samsung Partner-Server nutzt vorhandene PNG-Fallbacks',
  'enqueue_wallet_update_after_template_design_change',
  'barcode_changed',
  'emblem_changed',
  'pnpm run check',
  'node scripts/wallet-remote-schema-check.js --strict',
  'Echte Apple-Wallet-Karte',
  'Echte Google-Wallet-Karte',
  'Samsung Add-to-Wallet-Test',
  'vollstaendige Zielerfuellung bleibt erst nach echter Apple-/Google-/Samsung-Endgeraeteabnahme beweisbar'
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
