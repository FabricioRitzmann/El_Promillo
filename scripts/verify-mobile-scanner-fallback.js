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

assertIncludes('public/js/scanner.js', [
  'JSQR_CDN_URL',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'loadJsQrDecoder',
  'decodeFrameWithJsQr',
  'window.jsQR',
  'inversionAttempts',
  'cameraErrorMessage',
  'navigator.mediaDevices?.getUserMedia',
  'BarcodeDetector',
  'scannerMode',
  'requestAnimationFrame',
  'loadCardByCode(rawValue)'
]);

assertIncludes('public/scanner.html', [
  'scanner-camera-hint',
  'Kamera-Zugriff erlauben',
  'autocapitalize="characters"',
  'spellcheck="false"'
]);

assertIncludes('README.md', [
  'mobilem `jsQR`-Fallback'
]);

assertIncludes('package.json', [
  'node --check scripts/verify-mobile-scanner-fallback.js',
  'node scripts/verify-mobile-scanner-fallback.js'
]);

console.log('Mobile Scanner Fallback Contract: OK');
