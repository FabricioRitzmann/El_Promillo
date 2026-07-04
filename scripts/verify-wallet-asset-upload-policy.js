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

function assertExcludes(source, needles, label) {
  for (const needle of needles) {
    assert(!source.includes(needle), `${label} darf nicht enthalten: ${needle}`);
  }
}

const editorSource = read('public/js/editor.js');
const schemaSource = read('supabase/schema.sql');
const readmeSource = read('README.md');

assertIncludes(editorSource, [
  'const maxAssetFileBytes = 2 * 1024 * 1024',
  'const allowedAssetMimeTypes = new Map',
  "['image/png', 'png']",
  "['image/jpeg', 'jpg']",
  "['image/webp', 'webp']",
  '!allowedAssetMimeTypes.has(mimeType)',
  'file.size > maxAssetFileBytes',
  'SVG und andere Dateitypen sind für Wallet-Assets deaktiviert'
], 'Editor-Asset-Upload muss Dateityp und Grösse vor dem Upload begrenzen');

assertExcludes(editorSource, [
  "file.type.startsWith('image/')",
  'image/svg+xml'
], 'Editor-Asset-Upload darf keine allgemeinen image/* oder SVG-Uploads erlauben');

assertIncludes(schemaSource, [
  "insert into storage.buckets (id, name, public)",
  "values ('wallet-assets', 'wallet-assets', true)",
  "lower(name) ~ '\\.(png|jpg|jpeg|webp)$'",
  "coalesce(metadata->>'mimetype', '') in ('image/png', 'image/jpeg', 'image/webp')",
  "metadata ? 'size'",
  "(metadata->>'size') ~ '^[0-9]+$'",
  "(metadata->>'size')::bigint <= 2097152",
  'unlocked operators can upload own wallet assets',
  'unlocked operators can update own wallet assets'
], 'Storage-Policies müssen Wallet-Assets auf sichere Bildtypen und 2 MB begrenzen');

assertExcludes(schemaSource, [
  "not (metadata ? 'size')"
], 'Storage-Policies müssen Grössen-Metadaten für Wallet-Assets verlangen');

assertIncludes(readmeSource, [
  'PNG, JPEG oder WebP',
  'maximal 2 MB',
  'SVG ist für Wallet-Assets bewusst deaktiviert'
], 'README muss die Wallet-Asset-Upload-Grenzen dokumentieren');

console.log('Wallet-Asset-Uploads sind auf sichere Bildtypen, Betreiberordner und 2 MB begrenzt.');
