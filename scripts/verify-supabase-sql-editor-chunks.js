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

const chunksScript = read('scripts/prepare-supabase-sql-editor-chunks.js');
const goLive = read('scripts/wallet-go-live-report.js');
const readme = read('README.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const packageJson = read('package.json');
const gitignore = read('.gitignore');

[
  'Supabase SQL Editor Chunks Preparation',
  '--write',
  '--force',
  '--max-bytes',
  '--json',
  'splitSqlStatements',
  'matchDollarQuote',
  'chunkStatements',
  'tmp/supabase-schema-sql-editor-chunks',
  "notify pgrst, 'reload schema';",
  'statements are never split',
  'containsSecrets: false'
].forEach((needle) => assertIncludes(chunksScript, needle, 'SQL-Editor-Chunk-Script ist unvollständig'));

assertIncludes(gitignore, 'tmp/', '.gitignore muss tmp/ ignorieren');

[
  'prepare-supabase-sql-editor-chunks.js',
  'tmp/supabase-schema-sql-editor-chunks',
  'SQL-Editor-Chunks'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss SQL-Editor-Chunks dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss SQL-Editor-Chunks dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss SQL-Editor-Chunks dokumentieren');
});

[
  'sqlChunks',
  'tmp/supabase-schema-sql-editor-chunks',
  'prepare-supabase-sql-editor-chunks.js --write --force'
].forEach((needle) => assertIncludes(goLive, needle, 'Go-Live-Report muss SQL-Editor-Chunks integrieren'));

assertIncludes(packageJson, 'node --check scripts/prepare-supabase-sql-editor-chunks.js', 'pnpm check muss SQL-Editor-Chunk-Syntax prüfen');
assertIncludes(packageJson, 'verify-supabase-sql-editor-chunks.js', 'pnpm check muss SQL-Editor-Chunk-Vertrag prüfen');

console.log('Supabase SQL-Editor-Chunks sind dokumentiert und statisch abgesichert.');
