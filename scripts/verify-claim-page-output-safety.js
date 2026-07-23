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

function assertIncludes(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} fehlt: ${needle}`);
  }
}

const claim = read('public/js/claim.js');
const contextDoc = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const readme = read('README.md');
const packageJson = read('package.json');

assertIncludes(claim, [
  'import { byId, escapeHtml, showMessage, walletPreviewHtml } from \'./ui.js\';',
  'import { detectWalletDevice } from \'./walletDeviceDetection.js\';',
  'async function claimPreferredWallet()',
  "claimCard('apple')",
  "claimCard('google')",
  'function safeGoogleWalletSaveUrl(saveUrl)',
  "url.origin === 'https://pay.google.com'",
  "url.pathname.startsWith('/gp/v/save/')",
  'throw new Error(\'Google-Wallet-Link ist ungültig.\')'
], 'Google Save-Link Validierung');


assertIncludes(claim, [
  'const cardCode = result.card?.card_instance_number || result.card?.customer_code || \'\';',
  '<p class="customer-code">${escapeHtml(cardCode)}</p>',
  'resultPanel.insertAdjacentHTML(\'beforeend\'',
  '<a class="button primary" href="${escapeHtml(saveUrl)}">In Google Wallet speichern</a>',
], 'Claim Result Escaping');

assertIncludes(claim, [
  'function amountInputValue(value, fallback = \'\')',
  '${escapeHtml((currentBalance / 100).toFixed(2))}',
  '${escapeHtml(currency)}',
  'min="${escapeHtml(minAmount)}"',
  'max="${escapeHtml(maxAmount)}"',
  'value="${escapeHtml(defaultAmount)}"'
], 'Topup HTML Escaping');

assert(
  !claim.includes('href="${walletResult.saveUrl}"'),
  'Google Save-Link darf nicht ungeprüft und unescaped in href geschrieben werden.'
);

assert(
  !claim.includes('href="${walletResult.addUrl}"'),
  'Samsung Add-Link darf nicht ungeprüft und unescaped in href geschrieben werden.'
);

assertIncludes(read('public/claim.html'), [
  'id="walletPrimaryButton"',
  'Zu Wallet hinzufügen',
  'id="claimButton"',
  'id="googleWalletButton"'
], 'Claim Wallet Haupt- und Provider-Buttons');

assertIncludes(contextDoc, [
  'Claim-Seite',
  'safeGoogleWalletSaveUrl',
  'escapeHtml'
], 'Kontextdoku Claim Output Safety');

assertIncludes(readme, [
  'verify-claim-page-output-safety.js',
  'Claim-Seite'
], 'README Claim Output Safety Check');

assert(
  packageJson.includes('verify-claim-page-output-safety.js'),
  'package.json muss verify-claim-page-output-safety.js in pnpm check ausführen.'
);

console.log('Claim-Seite escaped öffentliche Ausgabe und validiert Google-Wallet-Links.');
