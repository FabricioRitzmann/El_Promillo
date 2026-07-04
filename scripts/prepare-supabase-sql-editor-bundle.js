import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const writeFile = argSet.has('--write');
const force = argSet.has('--force');
const jsonOutput = argSet.has('--json');
const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
const outputPath = path.join(rootDir, 'tmp', 'supabase-schema-sql-editor-bundle.sql');

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/prepare-supabase-sql-editor-bundle.js
  node scripts/prepare-supabase-sql-editor-bundle.js --write
  node scripts/prepare-supabase-sql-editor-bundle.js --write --force
  node scripts/prepare-supabase-sql-editor-bundle.js --json

Options:
  --write  Create tmp/supabase-schema-sql-editor-bundle.sql.
  --force  Overwrite an existing bundle file.
  --json   Print a machine-readable summary.

The bundle contains supabase/schema.sql plus a PostgREST schema-cache reload
statement. It does not read or print any Secrets.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function statementCount(sql) {
  return sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .length;
}

function buildBundle(schemaSql) {
  return [
    '-- Supabase SQL Editor bundle for El_Promillo.',
    '-- Generated from supabase/schema.sql.',
    '-- Run this in the Supabase SQL Editor for the target project.',
    '-- After the schema statements, PostgREST is asked to reload its schema cache.',
    '',
    schemaSql.trim(),
    '',
    '-- Refresh Supabase REST/PostgREST schema cache after DDL changes.',
    "notify pgrst, 'reload schema';",
    ''
  ].join('\n');
}

if (!fs.existsSync(schemaPath)) {
  throw new Error('supabase/schema.sql fehlt.');
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const bundleSql = buildBundle(schemaSql);
const summary = {
  schemaPath,
  outputPath,
  wroteFile: writeFile,
  schemaBytes: Buffer.byteLength(schemaSql),
  bundleBytes: Buffer.byteLength(bundleSql),
  schemaStatements: statementCount(schemaSql),
  includesReload: bundleSql.includes("notify pgrst, 'reload schema';"),
  containsSecrets: false
};

if (writeFile) {
  if (fs.existsSync(outputPath) && !force) {
    throw new Error('tmp/supabase-schema-sql-editor-bundle.sql existiert bereits. Nutze --force zum Ueberschreiben.');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bundleSql, 'utf8');
}

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('Supabase SQL Editor Bundle Preparation');
  console.log(`Schema: ${schemaPath}`);
  console.log(`Bundle: ${outputPath}`);
  console.log(`Statements: ${summary.schemaStatements}`);
  console.log(`PostgREST reload: ${summary.includesReload ? 'enthalten' : 'fehlt'}`);
  console.log(writeFile ? 'Status: Bundle geschrieben.' : 'Status: Dry-run; nutze --write zum Schreiben.');
}
