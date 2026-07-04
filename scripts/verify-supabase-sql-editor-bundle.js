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

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), `${message}: ${needle}`);
}

const bundleScript = read('scripts/prepare-supabase-sql-editor-bundle.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');
const gitignore = read('.gitignore');

[
  'Supabase SQL Editor Bundle Preparation',
  '--write',
  '--force',
  '--json',
  'supabase/schema.sql',
  'tmp/supabase-schema-sql-editor-bundle.sql',
  "notify pgrst, 'reload schema';",
  'statementCount',
  'buildBundle',
  'containsSecrets: false',
  'It does not read or print any Secrets'
].forEach((needle) => assertIncludes(bundleScript, needle, 'SQL-Editor-Bundle-Script ist unvollständig'));

assertIncludes(gitignore, 'tmp/', '.gitignore muss tmp/ ignorieren');

[
  'prepare-supabase-sql-editor-bundle.js',
  'tmp/supabase-schema-sql-editor-bundle.sql',
  "notify pgrst, 'reload schema';"
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss SQL-Editor-Bundle dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss SQL-Editor-Bundle dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss SQL-Editor-Bundle dokumentieren');
});

assertIncludes(packageJson, 'node --check scripts/prepare-supabase-sql-editor-bundle.js', 'pnpm check muss SQL-Editor-Bundle-Syntax prüfen');
assertIncludes(packageJson, 'verify-supabase-sql-editor-bundle.js', 'pnpm check muss SQL-Editor-Bundle-Vertrag prüfen');

console.log('Supabase SQL-Editor-Bundle ist dokumentiert und statisch abgesichert.');
