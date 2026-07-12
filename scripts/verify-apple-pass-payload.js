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

function assertIncludes(content, needles, label) {
  for (const needle of needles) {
    assert(content.includes(needle), `${label} fehlt: ${needle}`);
  }
}

const appleProvider = read('supabase/functions/_shared/appleWalletProvider.ts');
const walletDesign = read('supabase/functions/_shared/walletDesign.ts');
const claimApplePass = read('supabase/functions/claim-apple-pass/index.ts');
const packageJson = read('package.json');

assertIncludes(appleProvider, [
  'function buildPassJson(template: Row, cardInstance: Row, fields: Row = {})',
  'passTypeIdentifier: config.passTypeIdentifier',
  'serialNumber',
  'teamIdentifier: config.teamId',
  'organizationName',
  'backgroundColor',
  'foregroundColor',
  'labelColor',
  'barcodes:',
  'PKBarcodeFormatQR',
  'authenticationToken',
  'webServiceURL',
  'configuredHttpsUrl(config.webServiceBaseUrl)'
], 'Apple Pass JSON Identität/Webservice');

assertIncludes(walletDesign, [
  "export type EditorBarcodeFormat = 'qr' | 'aztec' | 'pdf417' | 'code128'",
  'function appleBarcodeFormat(format: EditorBarcodeFormat)',
  'appleBarcodeFormat(editorDesign.barcodeFormat)',
  'PKBarcodeFormatQR',
  'PKBarcodeFormatAztec',
  'PKBarcodeFormatPDF417',
  'PKBarcodeFormatCode128'
], 'Apple Pass Barcodeformat Mapping');

assertIncludes(walletDesign, [
  'export type WalletLocation',
  'export type WalletBeacon',
  'function walletLocationsFor(template: Row, cardInstance: Row, options: Row)',
  'function walletBeaconsFor(template: Row, cardInstance: Row, options: Row)',
  'locations: editorDesign.locations',
  'beacons: editorDesign.beacons'
], 'Apple Pass Standort-/Beacon-Mapping');

assertIncludes(appleProvider, [
  'const passLocations = Array.isArray(fields.locations) && fields.locations.length',
  'const passBeacons = Array.isArray(fields.beacons) && fields.beacons.length',
  'passJson.locations = passLocations',
  'passJson.beacons = passBeacons'
], 'Apple Pass Standort-/Beacon-Payload');

assertIncludes(appleProvider, [
  'walletFeatureRows(template, cardInstance)',
  'current_stamps',
  'current_streak',
  'vip_level',
  'balance_cents',
  'cloakroom_active',
  'rewardVisible(template, cardInstance)',
  'latestMessage',
  'const visibleFieldKeys = new Set(primaryFields.concat(secondaryFields).map((field) => stringValue(field.key)))',
  '? featureRows.filter((row) => !visibleFieldKeys.has(row.key))',
  'changeMessage'
], 'Apple Pass sichtbare Statusfelder');

assertIncludes(appleProvider, [
  'function appleTemplateAssetUrls(template: Row, cardInstance: Row = {})',
  'function safeAppleAssetUrl(value: unknown)',
  "Deno.env.get('SUPABASE_URL')",
  '/storage/v1/object/public/wallet-assets/',
  '/storage/v1/object/public/wallet-emblems/',
  '/storage/v1/object/public/business-logos/',
  'supabaseCardEmblemUrl(cardInstance',
  'const APPLE_ASSET_MAX_BYTES = 2 * 1024 * 1024',
  "const APPLE_ASSET_ALLOWED_MIME_TYPES = new Set(['image/png'])",
  'APPLE_ASSET_ALLOWED_MIME_TYPES.has(contentType)',
  'function isPngBytes(bytes: Uint8Array | null)',
  'function dataUriMimeType(value: string)',
  'async function firstApplePngAssetBytes(...values: unknown[])',
  'return isPngBytes(bytes) ? bytes : null',
  'fetch(assetUrl)',
  'function appleAssetsForTemplate(template: Row, explicitAssets: Row = {}, cardInstance: Row = {})',
  'function passVersionHasTemplateAssets(template: Row',
  'const generatedAssets = generatedAppleWalletAssetUrlsForTemplate(template, cardInstance)',
  'generatedAssets.wallet_background',
  'generatedAssets.stamp_grid',
  'generatedAssets.streak_badge',
  'generatedAssets.combined_emblem',
  'generatedAssets.decorative_title',
  'generatedAssets.club_module_badges',
  'generatedAssets.wallet_background && !stringValue(assets.backgroundPng || assets.stripPng)',
  'generatedAssets.stamp_grid && !stringValue(assets.stripPng || assets.thumbnailPng)',
  'generatedAssets.streak_badge && !stringValue(assets.thumbnailPng)',
  'generatedAssets.club_module_badges && !stringValue(assets.stripPng)',
  'generatedAssets.combined_emblem && !stringValue(assets.stripPng || assets.thumbnailPng)',
  'generatedAssets.decorative_title && !stringValue(assets.logoPng || assets.logoPngBase64)',
  'template.logo_url',
  'settings.iconUrl',
  'templateAssets.logo',
  'templateAssets.icon',
  'templateAssets.thumbnail',
  'templateAssets.strip',
  'assets = appleAssetsForTemplate(template, options.assets || {}, ensuredCardInstance)',
  'passVersionHasTemplateAssets(template: Row, passVersion: Row | null, cardInstance: Row = {})'
], 'Apple Pass Template-Assets');

assert(
  !appleProvider.includes("'image/jpeg'") && !appleProvider.includes("'image/webp'"),
  'Apple Pass Assets duerfen JPEG/WebP nicht als .png Pass-Dateien akzeptieren.'
);

assertIncludes(walletDesign, [
  "id: 'apple-logo-png-format'",
  'function likelyPngAssetUrl(value: unknown)',
  'Apple Pass-Bildslots brauchen echte PNG-Bytes',
  "platforms: ['apple']"
], 'Apple PNG-Fallback-Warnung');

assert(
  !appleProvider.includes('fetch(text)'),
  'Apple Provider darf Template-Asset-URLs nicht ungeprüft serverseitig fetchen.'
);

assertIncludes(appleProvider, [
  "files.set('pass.json'",
  "files.set('icon.png'",
  "files.set('icon@2x.png'",
  "files.set('logo.png'",
  "files.set('logo@2x.png'",
  "files.set('thumbnail.png'",
  "files.set('strip.png'",
  "files.set('background.png'",
  'generatedAppleWalletAssetUrlsForTemplate',
  'walletAssetPublicUrl',
  "files.set('manifest.json'",
  "files.set('signature'",
  'buildPassPackage(passJson, assets)',
  'application/vnd.apple.pkpass'
], 'Apple pkpass Paket');

assertIncludes(claimApplePass, [
  "import { ensureWalletAssetFallbacks } from '../_shared/walletAssetFallbacks.ts'",
  'const generatedAssetFallbacks = await ensureWalletAssetFallbacks({',
  "walletPlatform: 'apple'",
  'passJsonHasAppleWebServiceFields(data.pass_json)',
  'appleWalletProvider.passVersionHasTemplateAssets(cardInstance.card_templates, data, cardInstance)',
  'appleWalletProvider.updatePassFields',
  'appleWalletProvider.signPass',
  'generated_wallet_assets: options.generatedWalletAssets || []'
], 'Apple Claim Pass Wiederverwendung');

assert(
  packageJson.includes('verify-apple-pass-payload.js'),
  'package.json muss verify-apple-pass-payload.js in pnpm check ausführen.'
);

console.log('Apple-Pass-Payload enthält Identität, Webservice-Felder, Statusfelder und Template-Assets.');
