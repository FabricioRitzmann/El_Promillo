import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig, looksConfigured } from '../server/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const jsonOutput = argSet.has('--json');
const strict = argSet.has('--strict');
const skipRemote = argSet.has('--skip-remote');

const bundlePath = path.join(rootDir, 'tmp', 'supabase-schema-sql-editor-bundle.sql');
const chunksDir = path.join(rootDir, 'tmp', 'supabase-schema-sql-editor-chunks');

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/wallet-sql-editor-apply-report.js
  node scripts/wallet-sql-editor-apply-report.js --json
  node scripts/wallet-sql-editor-apply-report.js --skip-remote
  node scripts/wallet-sql-editor-apply-report.js --strict

Options:
  --json         Print a machine-readable summary.
  --skip-remote  Do not call the live Supabase REST schema check.
  --strict       Exit non-zero while SQL files or remote schema are missing.

This report is a redacted helper for the Supabase SQL Editor. It lists the
generated bundle/chunks and the current remote schema status. It never prints
Supabase keys, Apple certificates, APNS tokens, Google service-account JSON or
Wallet Save JWTs.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

function fileSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  return {
    path: relativePath(filePath),
    bytes: Buffer.byteLength(sql),
    includesReload: sql.includes("notify pgrst, 'reload schema';"),
    containsSecrets: false
  };
}

function chunkSummaries() {
  if (!fs.existsSync(chunksDir)) {
    return [];
  }

  return fs.readdirSync(chunksDir)
    .filter((fileName) => /^\d{2,3}-.*\.sql$/.test(fileName))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName, index) => {
      const summary = fileSummary(path.join(chunksDir, fileName));

      return {
        order: index + 1,
        ...summary
      };
    });
}

function projectHost() {
  const config = loadConfig();

  if (!looksConfigured(config.supabase?.url)) {
    return 'nicht konfiguriert';
  }

  try {
    return new URL(config.supabase.url).host;
  } catch {
    return 'ungültige SUPABASE_URL';
  }
}

function runRemoteSchemaCheck() {
  if (skipRemote) {
    return {
      status: 'skipped',
      skipped: true,
      missing: [],
      summary: null
    };
  }

  try {
    const stdout = execFileSync(process.execPath, [
      path.join(rootDir, 'scripts', 'wallet-remote-schema-check.js'),
      '--json'
    ], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const data = JSON.parse(stdout);
    const status = (data.summary?.fail || 0) > 0
      ? 'fail'
      : (data.summary?.warn || 0) > 0
        ? 'warn'
        : 'ok';

    return {
      status,
      skipped: false,
      projectHost: data.projectHost,
      summary: data.summary,
      missing: data.missing || [],
      secretsPrinted: false
    };
  } catch (error) {
    return {
      status: 'fail',
      skipped: false,
      error: error?.message || 'Remote-Schema-Check konnte nicht ausgeführt werden.',
      missing: [],
      secretsPrinted: false
    };
  }
}

function buildReport() {
  const bundle = fileSummary(bundlePath);
  const chunks = chunkSummaries();
  const remoteSchema = runRemoteSchemaCheck();
  const hasSqlInput = Boolean(bundle) || chunks.length > 0;
  const recommendedMode = bundle ? 'bundle' : chunks.length > 0 ? 'chunks' : 'generate';
  const nextCommands = [];

  if (!bundle) {
    nextCommands.push('node scripts/prepare-supabase-sql-editor-bundle.js --write --force');
  }

  if (chunks.length === 0) {
    nextCommands.push('node scripts/prepare-supabase-sql-editor-chunks.js --write --force');
  }

  if (recommendedMode === 'bundle') {
    nextCommands.push('Supabase SQL Editor: tmp/supabase-schema-sql-editor-bundle.sql komplett ausführen.');
  } else if (recommendedMode === 'chunks') {
    nextCommands.push('Supabase SQL Editor: alle Dateien in tmp/supabase-schema-sql-editor-chunks/ numerisch nacheinander ausführen.');
  }

  nextCommands.push('node scripts/wallet-remote-schema-check.js --strict');

  return {
    strict,
    secretsPrinted: false,
    projectHost: remoteSchema.projectHost || projectHost(),
    recommendedMode,
    hasSqlInput,
    bundle,
    chunks,
    remoteSchema,
    nextCommands,
    readyForRemoteWalletTests: hasSqlInput && (remoteSchema.status === 'ok' || remoteSchema.status === 'skipped')
  };
}

function printHuman(report) {
  console.log('Wallet SQL Editor Apply Report');
  console.log('Secrets, Zertifikate, Tokens und Save-JWTs werden nicht ausgegeben.');
  console.log(`Remote-Projekt: ${report.projectHost}`);
  console.log(`Empfohlener SQL-Editor-Weg: ${report.recommendedMode}`);

  if (report.bundle) {
    console.log(`Bundle: ${report.bundle.path} (${report.bundle.bytes} Bytes, reload: ${report.bundle.includesReload ? 'ja' : 'nein'})`);
  } else {
    console.log('Bundle: fehlt');
  }

  if (report.chunks.length > 0) {
    console.log('Chunks:');
    for (const chunk of report.chunks) {
      console.log(`  ${chunk.order}. ${chunk.path} (${chunk.bytes} Bytes, reload: ${chunk.includesReload ? 'ja' : 'nein'})`);
    }
  } else {
    console.log('Chunks: fehlen');
  }

  console.log(`Remote-Schema: ${report.remoteSchema.status}`);

  if (report.remoteSchema.missing?.length) {
    console.log(`Remote-Schema offen: ${report.remoteSchema.missing.join(', ')}`);
  }

  console.log('\nNächste Schritte:');
  report.nextCommands.forEach((command, index) => {
    console.log(`${index + 1}. ${command}`);
  });
}

const report = buildReport();

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report);
}

if (strict && (!report.hasSqlInput || report.remoteSchema.status === 'fail')) {
  process.exitCode = 1;
}
