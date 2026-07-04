import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const sourceRoots = [
  '.',
  'public',
  'server',
  'supabase',
  'docs',
  'scripts'
];

const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'tmp'
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function relative(filePath) {
  return path.relative(rootDir, filePath) || '.';
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        return [];
      }

      return listFiles(absolutePath);
    }

    return [absolutePath];
  });
}

const files = [];

for (const sourceRoot of sourceRoots) {
  const absoluteRoot = path.join(rootDir, sourceRoot);

  if (fs.existsSync(absoluteRoot)) {
    files.push(...listFiles(absoluteRoot));
  }
}

const dsStoreFiles = [...new Set(files.filter((filePath) => path.basename(filePath) === '.DS_Store'))]
  .map(relative)
  .sort((a, b) => a.localeCompare(b));

assert(
  dsStoreFiles.length === 0,
  `.DS_Store Dateien dürfen nicht in Quell-/Deploy-Verzeichnissen liegen: ${dsStoreFiles.join(', ')}`
);

assert(
  !fs.existsSync(path.join(rootDir, 'supabase', 'functions', 'passkit')),
  'Legacy-Ordner supabase/functions/passkit darf nicht vorhanden sein.'
);

assert(
  fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8').includes('.DS_Store'),
  '.gitignore muss .DS_Store ausschliessen.'
);

console.log('Deploy-Cleanliness ist für Quell- und Supabase-Verzeichnisse abgesichert.');
