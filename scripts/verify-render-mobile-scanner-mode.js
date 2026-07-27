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

function assertIncludes(relativePath, needles) {
  const source = read(relativePath);

  for (const needle of needles) {
    assert(source.includes(needle), `${relativePath} muss enthalten: ${needle}`);
  }
}

assertIncludes('public/js/appMode.js', [
  'CUSTOMER_RENDER_HOSTS',
  "'el-promillo.ch'",
  "'www.el-promillo.ch'",
  "'el-promillo-j1n0.onrender.com'",
  "host.endsWith('.onrender.com')",
  'isGitHubDeveloperFrontend',
  "host.endsWith('github.io')",
  "pathname.includes('/El_Promillo/')",
  'isHandheldPhone',
  'isTabletLikeDevice',
  'isRenderPhoneScannerMode',
  'scanner-only-mode'
]);

assertIncludes('public/js/guards.js', [
  "import { isRenderPhoneScannerMode } from './appMode.js';",
  'SCANNER_ONLY_ALLOWED_PAGES',
  "'scanner.html'",
  "pagePath(isMobileScannerOnly() ? 'scanner.html' : 'dashboard.html')",
  'shouldRedirectToScannerOnlyPage',
  'window.location.replace(pagePath(\'scanner.html\'))'
]);

assertIncludes('public/scanner.html', [
  'scannerOnlyLogoutButton',
  'scanner-only-logout',
  'desktop-only-link'
]);

assertIncludes('public/js/scanner.js', [
  "import { pagePath } from './path.js';",
  'scannerOnlyLogoutButton',
  'state.client.signOut()',
  "window.location.replace(pagePath('index.html'))"
]);

assertIncludes('public/styles.css', [
  '.scanner-only-logout',
  '.scanner-only-mode .scanner-only-logout',
  '.scanner-only-mode .app-tab-account',
  '.desktop-only-link'
]);

assertIncludes('package.json', [
  'node --check public/js/appMode.js',
  'node --check scripts/verify-render-mobile-scanner-mode.js',
  'node scripts/verify-render-mobile-scanner-mode.js'
]);

console.log('Render Mobile Scanner Mode Contract: OK');
