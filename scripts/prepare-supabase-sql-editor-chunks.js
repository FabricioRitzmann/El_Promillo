import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const writeFiles = argSet.has('--write');
const force = argSet.has('--force');
const jsonOutput = argSet.has('--json');
const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
const outputDir = path.join(rootDir, 'tmp', 'supabase-schema-sql-editor-chunks');
const defaultMaxBytes = 30000;

function optionValue(name) {
  const prefix = `${name}=`;
  const withEquals = rawArgs.find((arg) => arg.startsWith(prefix));

  if (withEquals) {
    return withEquals.slice(prefix.length);
  }

  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : '';
}

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/prepare-supabase-sql-editor-chunks.js
  node scripts/prepare-supabase-sql-editor-chunks.js --write
  node scripts/prepare-supabase-sql-editor-chunks.js --write --force
  node scripts/prepare-supabase-sql-editor-chunks.js --max-bytes 30000
  node scripts/prepare-supabase-sql-editor-chunks.js --json

Options:
  --write              Create chunk files in tmp/supabase-schema-sql-editor-chunks/.
  --force              Remove existing chunk files before writing.
  --max-bytes <bytes>  Approximate max bytes per chunk; statements are never split.
  --json               Print machine-readable metadata.

The chunks contain only supabase/schema.sql statements plus a final PostgREST
schema-cache reload statement. No Secrets are read or printed.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function normalizeMaxBytes() {
  const rawValue = optionValue('--max-bytes');
  const value = rawValue ? Number(rawValue) : defaultMaxBytes;

  return Number.isFinite(value) && value >= 10000 ? Math.floor(value) : defaultMaxBytes;
}

function buildSql() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error('supabase/schema.sql fehlt.');
  }

  return [
    fs.readFileSync(schemaPath, 'utf8').trim(),
    '',
    "notify pgrst, 'reload schema';",
    ''
  ].join('\n');
}

function matchDollarQuote(sql, index) {
  const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
  return match ? match[0] : '';
}

function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let index = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let lineComment = false;
  let blockComment = false;
  let dollarQuote = '';

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }

      index += 1;
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        index += dollarQuote.length;
        dollarQuote = '';
        continue;
      }

      index += 1;
      continue;
    }

    if (singleQuote) {
      if (char === "'" && next === "'") {
        index += 2;
        continue;
      }

      if (char === "'") {
        singleQuote = false;
      }

      index += 1;
      continue;
    }

    if (doubleQuote) {
      if (char === '"' && next === '"') {
        index += 2;
        continue;
      }

      if (char === '"') {
        doubleQuote = false;
      }

      index += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      lineComment = true;
      index += 2;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 2;
      continue;
    }

    const dollar = char === '$' ? matchDollarQuote(sql, index) : '';

    if (dollar) {
      dollarQuote = dollar;
      index += dollar.length;
      continue;
    }

    if (char === "'") {
      singleQuote = true;
      index += 1;
      continue;
    }

    if (char === '"') {
      doubleQuote = true;
      index += 1;
      continue;
    }

    if (char === ';') {
      const statement = sql.slice(start, index + 1).trim();

      if (statement) {
        statements.push(statement);
      }

      start = index + 1;
    }

    index += 1;
  }

  const trailing = sql.slice(start).trim();

  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

function chunkStatements(statements, maxBytes) {
  const chunks = [];
  let current = [];
  let currentBytes = 0;

  for (const statement of statements) {
    const statementBytes = Buffer.byteLength(`${statement}\n\n`);

    if (current.length > 0 && currentBytes + statementBytes > maxBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(statement);
    currentBytes += statementBytes;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function renderChunk(statements, index, total) {
  return [
    `-- Supabase SQL Editor chunk ${index + 1} of ${total}.`,
    '-- Run chunks in numeric order for the target Supabase project.',
    '-- Generated from supabase/schema.sql. No Secrets are included.',
    '',
    statements.join('\n\n'),
    ''
  ].join('\n');
}

function removeExistingChunks() {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  for (const fileName of fs.readdirSync(outputDir)) {
    if (/^\d{2,3}-.*\.sql$/.test(fileName)) {
      fs.unlinkSync(path.join(outputDir, fileName));
    }
  }
}

function writeChunks(chunks) {
  if (fs.existsSync(outputDir) && !force) {
    const existing = fs.readdirSync(outputDir).filter((fileName) => /^\d{2,3}-.*\.sql$/.test(fileName));

    if (existing.length > 0) {
      throw new Error('SQL-Chunk-Dateien existieren bereits. Nutze --force zum Ueberschreiben.');
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  removeExistingChunks();

  chunks.forEach((statements, index) => {
    const suffix = index === chunks.length - 1 ? 'final-reload' : 'schema';
    const fileName = `${String(index + 1).padStart(2, '0')}-${suffix}.sql`;
    fs.writeFileSync(path.join(outputDir, fileName), renderChunk(statements, index, chunks.length), 'utf8');
  });
}

const maxBytes = normalizeMaxBytes();
const sql = buildSql();
const statements = splitSqlStatements(sql);
const chunks = chunkStatements(statements, maxBytes);
const chunkMetadata = chunks.map((statements, index) => ({
  file: `${String(index + 1).padStart(2, '0')}-${index === chunks.length - 1 ? 'final-reload' : 'schema'}.sql`,
  statements: statements.length,
  bytes: Buffer.byteLength(renderChunk(statements, index, chunks.length))
}));
const summary = {
  outputDir,
  wroteFiles: writeFiles,
  maxBytes,
  statements: statements.length,
  chunks: chunks.length,
  includesReload: statements.some((statement) => statement.includes("notify pgrst, 'reload schema'")),
  containsSecrets: false,
  chunkMetadata
};

if (writeFiles) {
  writeChunks(chunks);
}

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('Supabase SQL Editor Chunks Preparation');
  console.log(`Output: ${outputDir}`);
  console.log(`Statements: ${summary.statements}`);
  console.log(`Chunks: ${summary.chunks}`);
  console.log(`PostgREST reload: ${summary.includesReload ? 'enthalten' : 'fehlt'}`);
  console.log(writeFiles ? 'Status: Chunk-Dateien geschrieben.' : 'Status: Dry-run; nutze --write zum Schreiben.');
}
