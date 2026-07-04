import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const functionsDir = path.join(rootDir, 'supabase', 'functions');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(absolutePath);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [absolutePath] : [];
  });
}

function relative(filePath) {
  return path.relative(rootDir, filePath);
}

function resolveRelativeImport(fromFile, specifier) {
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    resolved,
    `${resolved}.ts`,
    path.join(resolved, 'index.ts')
  ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function importSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:type\s+)?[^'"]+\s+from\s+['"]([^'"]+)['"]/g,
    /\bawait\s+import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(source))) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

const files = listTypeScriptFiles(functionsDir);

assert(files.length >= 20, `Unerwartet wenige Supabase TypeScript-Dateien gefunden: ${files.length}.`);
assert(
  !fs.existsSync(path.join(functionsDir, 'passkit')),
  'Der direkte Wallet-Pfad darf keinen Legacy-Ordner supabase/functions/passkit enthalten.'
);

for (const filePath of files) {
  const source = fs.readFileSync(filePath, 'utf8');
  const fileLabel = relative(filePath);

  assert(!/passkit/i.test(source), `${fileLabel} darf im direkten Wallet-Pfad keine PassKit-Referenz enthalten.`);

  for (const specifier of importSpecifiers(source)) {
    if (specifier.startsWith('.')) {
      const resolved = resolveRelativeImport(filePath, specifier);

      assert(resolved, `${fileLabel} importiert eine fehlende lokale Datei: ${specifier}`);
      assert(
        resolved.startsWith(functionsDir),
        `${fileLabel} darf keine Datei ausserhalb von supabase/functions importieren: ${specifier}`
      );
      assert(!/passkit/i.test(resolved), `${fileLabel} darf keine PassKit-Datei importieren: ${specifier}`);
      continue;
    }

    if (specifier.startsWith('https://')) {
      assert(
        specifier.startsWith('https://esm.sh/'),
        `${fileLabel} nutzt einen unerwarteten Remote-Import. Erlaubt ist im MVP nur esm.sh: ${specifier}`
      );
      continue;
    }

    assert(false, `${fileLabel} nutzt einen nicht deploybaren Edge-Import: ${specifier}`);
  }
}

console.log('Supabase Edge-Function-Imports sind lokal auflösbar und bleiben im direkten Wallet-Pfad.');
