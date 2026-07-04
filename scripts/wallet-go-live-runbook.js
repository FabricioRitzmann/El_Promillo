import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const jsonOutput = argSet.has('--json');
const writeFile = argSet.has('--write');
const force = argSet.has('--force');
const skipRemote = argSet.has('--skip-remote');
const defaultOutputPath = path.join(rootDir, 'tmp', 'wallet-go-live-runbook.md');
const expectedExternalSecrets = [
  'APPLE_APNS_KEY_ID',
  'APPLE_APNS_AUTH_KEY',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'
];

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
  node scripts/wallet-go-live-runbook.js
  node scripts/wallet-go-live-runbook.js --write
  node scripts/wallet-go-live-runbook.js --write --force
  node scripts/wallet-go-live-runbook.js --json
  node scripts/wallet-go-live-runbook.js --skip-remote

Options:
  --write          Write tmp/wallet-go-live-runbook.md.
  --force          Overwrite an existing output file.
  --output <path>  Custom Markdown output path.
  --skip-remote    Skip live Supabase REST/Edge Function checks.
  --json           Print machine-readable metadata and markdown.

This runbook combines existing redacted reports. It never prints Supabase keys,
Apple certificates, APNS tokens, Google service-account JSON or Wallet Save
JWTs.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function runJsonScript(script, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(rootDir, script), '--json', ...args], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    return { ok: true, data: JSON.parse(stdout) };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || `${script} konnte nicht ausgeführt werden.`
    };
  }
}

function commandBlock(commands) {
  return [
    '```bash',
    ...commands,
    '```'
  ].join('\n');
}

function listItems(items) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join('\n')
    : '- Keine offenen Punkte in diesem Abschnitt.';
}

function checkboxItems(items) {
  return items.length > 0
    ? items.map((item) => `- [ ] ${item}`).join('\n')
    : '- [x] Keine offenen Punkte in diesem Abschnitt.';
}

function statusLine(status) {
  return status === 'ok' ? 'OK' : status === 'skipped' ? 'übersprungen' : 'offen';
}

function buildMarkdown({ goLive, sqlEditor, edgeFunctions }) {
  const go = goLive.data || {};
  const sql = sqlEditor.data || {};
  const edge = edgeFunctions.data || {};
  const missingSecrets = go.readiness?.missingSecrets || [];
  const credentialFailures = go.credentialFiles?.failures || [];
  const missingTables = go.remoteSchema?.missing || [];
  const failedFunctions = go.edgeFunctions?.failed || [];
  const nextActions = go.nextActions || [];
  const projectHost = go.remoteSchema?.projectHost || sql.projectHost || 'nicht geprüft';
  const functionsBaseUrl = go.edgeFunctions?.functionsBaseUrl || edge.functionsBaseUrl || 'nicht geprüft';
  const deployTool = go.deployTool || {};
  const chunks = sql.chunks || [];
  const generatedAt = new Date().toISOString();

  return [
    '# Wallet Go-Live Runbook',
    '',
    `Generiert: ${generatedAt}`,
    '',
    'Dieses Runbook ist redigiert. Es enthält keine Supabase Keys, Apple-Zertifikate, APNS Tokens, Google Service-Account-JSON oder Wallet Save JWTs.',
    '',
    '## Status',
    '',
    `- Go-Live Ready: ${go.goLiveReady ? 'ja' : 'nein'}`,
    `- Readiness: ${statusLine(go.readiness?.status)}`,
    `- Credential-Dateien: ${statusLine(go.credentialFiles?.status)}`,
    `- Remote-Schema: ${statusLine(go.remoteSchema?.status)}`,
    `- Edge Functions: ${statusLine(go.edgeFunctions?.status)}`,
    `- Cron-SQL lokal: ${go.files?.cronSql ? 'vorhanden' : 'fehlt'}`,
    `- Supabase Deploy CLI: ${deployTool.source || 'nicht geprüft'} (${statusLine(deployTool.status)})`,
    `- Supabase CLI Auth: ${deployTool.loginMayBeRequired ? 'supabase login oder SUPABASE_ACCESS_TOKEN prüfen' : 'SUPABASE_ACCESS_TOKEN gesetzt oder Login nicht erforderlich'}`,
    `- Supabase Projekt: ${projectHost}`,
    `- Functions Base URL: ${functionsBaseUrl}`,
    '',
    '## 1. Externe Secrets',
    '',
    'Fehlende Secrets:',
    '',
    checkboxItems(missingSecrets),
    '',
    'Credential-Dateien oder Werte offen:',
    '',
    checkboxItems(credentialFailures),
    '',
    'Bekannte externe Secret-Gates für direkten Wallet-Go-Live:',
    '',
    checkboxItems(expectedExternalSecrets),
    '',
    'Befehle nach dem Eintragen:',
    '',
    commandBlock([
      'node scripts/prepare-supabase-secrets-local.js --write --force',
      'node scripts/wallet-credential-files-check.js --strict',
      'bash scripts/set-supabase-secrets.sh --dry-run',
      'bash scripts/set-supabase-secrets.sh',
      'node scripts/wallet-readiness-report.js --strict'
    ]),
    '',
    '## 2. Supabase SQL Editor',
    '',
    `Empfohlener Weg: ${sql.recommendedMode || 'nicht geprüft'}`,
    '',
    'Bundle:',
    '',
    sql.bundle
      ? `- ${sql.bundle.path} (${sql.bundle.bytes} Bytes, reload: ${sql.bundle.includesReload ? 'ja' : 'nein'})`
      : '- Bundle fehlt.',
    '',
    'Chunks in Reihenfolge:',
    '',
    chunks.length > 0
      ? chunks.map((chunk) => `- ${chunk.order}. ${chunk.path} (${chunk.bytes} Bytes, reload: ${chunk.includesReload ? 'ja' : 'nein'})`).join('\n')
      : '- Keine Chunks gefunden.',
    '',
    'Remote-Tabellen offen:',
    '',
    checkboxItems(missingTables),
    '',
    'Befehle:',
    '',
    commandBlock([
      'node scripts/wallet-sql-editor-apply-report.js',
      'node scripts/prepare-supabase-sql-editor-bundle.js --write --force',
      'node scripts/prepare-supabase-sql-editor-chunks.js --write --force',
      'bash scripts/apply-supabase-schema.sh --dry-run',
      '# Danach entweder SUPABASE_DB_URL setzen oder supabase link --project-ref <PROJECT_REF> ausführen:',
      'bash scripts/apply-supabase-schema.sh',
      '# Danach im Supabase SQL Editor Bundle oder Chunks ausführen.',
      'node scripts/wallet-remote-schema-check.js --strict'
    ]),
    '',
    '## 3. Edge Functions',
    '',
    'Remote Functions offen:',
    '',
    checkboxItems(failedFunctions),
    '',
    'Deploy und Prüfung:',
    '',
    commandBlock([
      'bash scripts/deploy-wallet-functions.sh --dry-run',
      '# Vor echtem Deploy: supabase login oder SUPABASE_ACCESS_TOKEN setzen.',
      'bash scripts/deploy-wallet-functions.sh',
      '# Falls config.json keine Supabase URL enthält:',
      'bash scripts/deploy-wallet-functions.sh --project-ref <PROJECT_REF>',
      '# Optionaler fester CLI-Pfad:',
      'SUPABASE_CLI_BIN=/pfad/zur/supabase-cli bash scripts/deploy-wallet-functions.sh',
      '# Nur wenn der Auth-Preflight bewusst übersprungen werden soll:',
      'bash scripts/deploy-wallet-functions.sh --skip-auth-check',
      'node scripts/wallet-edge-functions-report.js --strict',
      'node scripts/wallet-smoke-test.js --functions --functions-base-url https://<PROJECT_REF>.supabase.co/functions/v1 --strict'
    ]),
    '',
    '## 4. Supabase Cron',
    '',
    'Cron-SQL vorbereiten und anwenden:',
    '',
    commandBlock([
      'node scripts/prepare-supabase-cron-sql.js --json',
      'node scripts/prepare-supabase-cron-sql.js --write --force',
      'bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql --dry-run',
      '# Danach entweder SUPABASE_DB_URL setzen oder supabase link --project-ref <PROJECT_REF> ausführen:',
      'bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql'
    ]),
    '',
    'Die generierte `tmp/supabase-cron.sql` enthält den echten `WALLET_CRON_SECRET` und bleibt deshalb in `tmp/`.',
    '',
    '## 5. Nachweise Nach Echtem Test',
    '',
    checkboxItems([
      'Apple Pass auf einem iPhone installieren.',
      'Apple Device Registration in `apple_wallet_registrations` sehen.',
      'Apple Pass Update/APNS oder vorbereiteten Fallback in `wallet_push_logs` sehen.',
      'Google Save Link speichern und `google_wallet_objects` prüfen.',
      'Google Message oder Object-Fallback in `wallet_push_logs` sehen.',
      'Business-A/B Isolation mit zwei Betreibern prüfen.',
      'Supabase Cron für Scheduled Campaigns und Queue-Jobs aktivieren.',
      '`supabase/acceptance-queries.sql` im Supabase SQL Editor ausführen.',
      '`node scripts/wallet-acceptance-audit.js --strict` ausführen.'
    ]),
    '',
    '## 6. Nächste Aktionen Aus Dem Live-Report',
    '',
    listItems(nextActions),
    '',
    '## 7. Kompakte Prüfsequenz',
    '',
    commandBlock([
      'pnpm check',
      'node scripts/wallet-local-smoke-runner.js --strict',
      'node scripts/wallet-go-live-report.js',
      'node scripts/wallet-sql-editor-apply-report.js',
      'node scripts/wallet-edge-functions-report.js',
      'node scripts/wallet-smoke-test.js --base-url http://localhost:3000 --strict'
    ]),
    ''
  ].join('\n');
}

function buildRunbook() {
  const remoteArgs = skipRemote ? ['--skip-remote'] : [];
  const goLive = runJsonScript('scripts/wallet-go-live-report.js', remoteArgs);
  const sqlEditor = runJsonScript('scripts/wallet-sql-editor-apply-report.js', remoteArgs);
  const edgeFunctions = skipRemote
    ? { ok: true, data: { summary: { ok: 0, warn: 0, fail: 0 }, results: [] } }
    : runJsonScript('scripts/wallet-edge-functions-report.js');
  const markdown = buildMarkdown({ goLive, sqlEditor, edgeFunctions });
  const outputPath = path.resolve(rootDir, optionValue('--output') || defaultOutputPath);

  return {
    strict: false,
    secretsPrinted: false,
    wroteFile: writeFile,
    outputPath,
    reports: {
      goLive: goLive.ok,
      sqlEditor: sqlEditor.ok,
      edgeFunctions: edgeFunctions.ok
    },
    markdown
  };
}

const runbook = buildRunbook();

if (writeFile) {
  if (fs.existsSync(runbook.outputPath) && !force) {
    throw new Error(`${runbook.outputPath} existiert bereits. Nutze --force zum Ueberschreiben.`);
  }

  fs.mkdirSync(path.dirname(runbook.outputPath), { recursive: true });
  fs.writeFileSync(runbook.outputPath, runbook.markdown, 'utf8');
}

if (jsonOutput) {
  console.log(JSON.stringify(runbook, null, 2));
} else {
  if (writeFile) {
    console.log(`Wallet Go-Live Runbook geschrieben: ${path.relative(rootDir, runbook.outputPath)}`);
  } else {
    console.log(runbook.markdown);
  }
}
