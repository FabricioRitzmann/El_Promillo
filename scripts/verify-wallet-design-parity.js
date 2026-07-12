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
  'docs/wallet-design-parity.md',
  'docs/wallet-feature-limitations.md'
].forEach(assertFile);

const walletDesign = read('supabase/functions/_shared/walletDesign.ts');
const appleProvider = read('supabase/functions/_shared/appleWalletProvider.ts');
const googleProvider = read('supabase/functions/_shared/googleWalletProvider.ts');
const samsungProvider = read('supabase/functions/_shared/samsungWalletProvider.ts');
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
  '## Update Queue',
  '## Editor-Warnungen',
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
