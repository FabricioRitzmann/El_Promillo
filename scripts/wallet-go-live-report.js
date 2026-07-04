import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const jsonOutput = argSet.has('--json');
const strict = argSet.has('--strict');
const skipRemote = argSet.has('--skip-remote');

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/wallet-go-live-report.js
  node scripts/wallet-go-live-report.js --json
  node scripts/wallet-go-live-report.js --skip-remote
  node scripts/wallet-go-live-report.js --strict

Options:
  --json         Print machine-readable JSON.
  --skip-remote  Skip the live Supabase REST schema check.
  --strict       Exit non-zero while any go-live gate is still open.

The report calls existing redacted checks. It never prints Supabase keys, Apple
certificates, APNS tokens, Google service-account JSON or Wallet Save JWTs.
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
      error: error?.message || 'Check konnte nicht ausgeführt werden.'
    };
  }
}

function statusFromSummary(summary) {
  if (!summary) {
    return 'fail';
  }

  if ((summary.fail || 0) > 0) {
    return 'fail';
  }

  if ((summary.warn || 0) > 0) {
    return 'warn';
  }

  return 'ok';
}

function secretNameFromLabel(label) {
  return String(label || '').split(' ')[0];
}

function commandAvailable(commandName) {
  try {
    execFileSync('sh', ['-lc', `command -v ${commandName}`], {
      cwd: rootDir,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

function deployToolStatus() {
  const hasGlobalSupabase = commandAvailable('supabase');
  const hasPnpm = commandAvailable('pnpm');
  const hasNpx = commandAvailable('npx');
  const hasAccessToken = Boolean(process.env.SUPABASE_ACCESS_TOKEN);
  const source = hasGlobalSupabase
    ? 'global supabase'
    : hasPnpm
      ? 'pnpm dlx supabase'
      : hasNpx
        ? 'npx --yes supabase'
        : 'missing';

  return {
    status: source === 'missing' ? 'fail' : hasAccessToken ? 'ok' : 'warn',
    source,
    accessTokenEnv: hasAccessToken,
    loginMayBeRequired: !hasAccessToken,
    secretsPrinted: false
  };
}

function buildNextActions({ readiness, credentialFiles, remoteSchema, edgeFunctions, files, deployTool }) {
  const actions = [];

  if (!files.localSecrets) {
    actions.push('Lokale Secret-Datei vorbereiten: node scripts/prepare-supabase-secrets-local.js --write');
  }

  const readinessFailures = readiness.ok
    ? readiness.data.results.filter((result) => result.status === 'fail')
    : [];
  const missingSecrets = readinessFailures
    .filter((result) => result.group === 'secrets')
    .map((result) => secretNameFromLabel(result.label));
  const missingSecretSet = new Set(missingSecrets);

  if (missingSecrets.length > 0) {
    actions.push(`Fehlende externe Secrets in supabase/secrets.local.env ergänzen: ${missingSecrets.join(', ')}`);
    if (deployTool.status === 'fail') {
      actions.push('Supabase CLI bereitstellen: supabase installieren oder pnpm/npx aktivieren; alternativ SUPABASE_CLI_BIN setzen.');
    } else if (deployTool.loginMayBeRequired) {
      actions.push('Supabase CLI für Secret-Writes authentifizieren: supabase login ausführen oder SUPABASE_ACCESS_TOKEN setzen.');
    }
    actions.push('Danach redigiert setzen: bash scripts/set-supabase-secrets.sh');
  }

  if (credentialFiles.ok && statusFromSummary(credentialFiles.data.summary) === 'fail') {
    const failedCredentials = credentialFiles.data.results
      .filter((result) => result.status === 'fail')
      .map((result) => result.label)
      .filter((label) => !missingSecretSet.has(label));

    if (failedCredentials.length > 0) {
      actions.push(`Credential-Dateien prüfen/ergänzen: ${failedCredentials.join(', ')}`);
    }
  } else if (!credentialFiles.ok) {
    actions.push('Credential-Dateien prüfen: node scripts/wallet-credential-files-check.js');
  }

  if (!files.sqlBundle) {
    actions.push('SQL-Editor-Bundle vorbereiten: node scripts/prepare-supabase-sql-editor-bundle.js --write --force');
  }

  if (!files.sqlChunks) {
    actions.push('SQL-Editor-Chunks vorbereiten: node scripts/prepare-supabase-sql-editor-chunks.js --write --force');
  }

  if (!files.cronSql) {
    actions.push('Cron-SQL für geplante Kampagnen vorbereiten: node scripts/prepare-supabase-cron-sql.js --write --force');
    actions.push('Cron-SQL anwenden: bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql --dry-run und danach bash scripts/apply-supabase-schema.sh --file tmp/supabase-cron.sql mit SUPABASE_DB_URL oder gelinktem Projekt.');
  }

  if (!remoteSchema.skipped && remoteSchema.ok && statusFromSummary(remoteSchema.data.summary) === 'fail') {
    actions.push('SQL-Editor-Apply-Report ausführen: node scripts/wallet-sql-editor-apply-report.js');
    actions.push('Optional per CLI anwenden: bash scripts/apply-supabase-schema.sh --dry-run und danach bash scripts/apply-supabase-schema.sh mit SUPABASE_DB_URL oder gelinktem Projekt.');
    actions.push('Supabase SQL Editor: tmp/supabase-schema-sql-editor-bundle.sql komplett ausführen oder die Dateien in tmp/supabase-schema-sql-editor-chunks/ numerisch nacheinander ausführen.');
    actions.push("Danach prüfen: node scripts/wallet-remote-schema-check.js --strict");
  } else if (!remoteSchema.skipped && !remoteSchema.ok) {
    actions.push('Remote-Schema-Check konnte nicht laufen. Supabase URL/Service Role und Netzwerk prüfen.');
  }

  if (!edgeFunctions.skipped && edgeFunctions.ok && statusFromSummary(edgeFunctions.data.summary) === 'fail') {
    if (deployTool.status === 'fail') {
      actions.push('Supabase CLI bereitstellen: supabase installieren oder pnpm/npx aktivieren; alternativ SUPABASE_CLI_BIN setzen.');
    } else if (deployTool.loginMayBeRequired) {
      actions.push('Supabase CLI für echten Deploy authentifizieren: supabase login ausführen oder SUPABASE_ACCESS_TOKEN setzen.');
    }

    actions.push('Wallet Edge Functions deployen: bash scripts/deploy-wallet-functions.sh');
    actions.push('Falls config.json keine Supabase URL enthält: bash scripts/deploy-wallet-functions.sh --project-ref <PROJECT_REF>');
    actions.push('Danach prüfen: node scripts/wallet-edge-functions-report.js --strict');
  } else if (!edgeFunctions.skipped && !edgeFunctions.ok) {
    actions.push('Wallet Edge Functions Report konnte nicht laufen. Functions Base URL und Netzwerk prüfen.');
  }

  if (actions.length === 0) {
    actions.push('Repo-/Secret-/Schema-/Function-Gates sind grün. Danach echte Apple-/Google-Wallet-Flows testen.');
  }

  return actions;
}

function fileStatus() {
  const localSecretsPath = path.join(rootDir, 'supabase', 'secrets.local.env');
  const sqlBundlePath = path.join(rootDir, 'tmp', 'supabase-schema-sql-editor-bundle.sql');
  const sqlChunksPath = path.join(rootDir, 'tmp', 'supabase-schema-sql-editor-chunks');
  const cronSqlPath = path.join(rootDir, 'tmp', 'supabase-cron.sql');
  const sqlChunks = fs.existsSync(sqlChunksPath)
    ? fs.readdirSync(sqlChunksPath).filter((fileName) => /^\d{2,3}-.*\.sql$/.test(fileName)).length
    : 0;

  return {
    localSecrets: fs.existsSync(localSecretsPath),
    sqlBundle: fs.existsSync(sqlBundlePath),
    sqlChunks,
    cronSql: fs.existsSync(cronSqlPath),
    localSecretsPath,
    sqlBundlePath,
    sqlChunksPath,
    cronSqlPath
  };
}

function buildReport() {
  const readiness = runJsonScript('scripts/wallet-readiness-report.js');
  const credentialFiles = runJsonScript('scripts/wallet-credential-files-check.js');
  const remoteSchema = skipRemote
    ? { ok: true, skipped: true, data: null }
    : runJsonScript('scripts/wallet-remote-schema-check.js');
  const edgeFunctions = skipRemote
    ? { ok: true, skipped: true, data: null }
    : runJsonScript('scripts/wallet-edge-functions-report.js');
  const files = fileStatus();
  const deployTool = deployToolStatus();
  const nextActions = buildNextActions({ readiness, credentialFiles, remoteSchema, edgeFunctions, files, deployTool });
  const readinessStatus = readiness.ok ? statusFromSummary(readiness.data.summary) : 'fail';
  const credentialFilesStatus = credentialFiles.ok ? statusFromSummary(credentialFiles.data.summary) : 'fail';
  const remoteSchemaStatus = remoteSchema.skipped
    ? 'skipped'
    : remoteSchema.ok
      ? statusFromSummary(remoteSchema.data.summary)
      : 'fail';
  const edgeFunctionsStatus = edgeFunctions.skipped
    ? 'skipped'
    : edgeFunctions.ok
      ? statusFromSummary(edgeFunctions.data.summary)
      : 'fail';

  return {
    strict,
    secretsPrinted: false,
    files: {
      localSecrets: files.localSecrets,
      sqlBundle: files.sqlBundle,
      sqlChunks: files.sqlChunks,
      cronSql: files.cronSql
    },
    readiness: readiness.ok
      ? {
        status: readinessStatus,
        localSecretsLoaded: readiness.data.localSecretsLoaded,
        summary: readiness.data.summary,
        missingSecrets: readiness.data.results
          .filter((result) => result.group === 'secrets' && result.status === 'fail')
          .map((result) => secretNameFromLabel(result.label))
      }
      : {
        status: 'fail',
        error: readiness.error
      },
    credentialFiles: credentialFiles.ok
      ? {
        status: credentialFilesStatus,
        summary: credentialFiles.data.summary,
        failures: credentialFiles.data.results
          .filter((result) => result.status === 'fail')
          .map((result) => result.label),
        secretsPrinted: false
      }
      : {
        status: 'fail',
        error: credentialFiles.error
      },
    remoteSchema: remoteSchema.skipped
      ? {
        status: 'skipped'
      }
      : remoteSchema.ok
        ? {
          status: remoteSchemaStatus,
          projectHost: remoteSchema.data.projectHost,
          summary: remoteSchema.data.summary,
          missing: remoteSchema.data.missing || []
        }
        : {
          status: 'fail',
        error: remoteSchema.error
      },
    edgeFunctions: edgeFunctions.skipped
      ? {
        status: 'skipped'
      }
      : edgeFunctions.ok
        ? {
          status: edgeFunctionsStatus,
          functionsBaseUrl: edgeFunctions.data.functionsBaseUrl,
          summary: edgeFunctions.data.summary,
          failed: edgeFunctions.data.results
            .filter((result) => result.status === 'fail')
            .map((result) => result.function)
        }
        : {
          status: 'fail',
        error: edgeFunctions.error
      },
    deployTool,
    nextActions,
    goLiveReady: readinessStatus === 'ok'
      && credentialFilesStatus === 'ok'
      && (remoteSchemaStatus === 'ok' || remoteSchemaStatus === 'skipped')
      && (edgeFunctionsStatus === 'ok' || edgeFunctionsStatus === 'skipped')
  };
}

function printHuman(report) {
  console.log('Wallet Go-Live Report');
  console.log('Secrets, Zertifikate, Tokens und Save-JWTs werden nicht ausgegeben.');
  console.log(`Lokale Secrets: ${report.files.localSecrets ? 'vorhanden' : 'fehlen'}`);
  console.log(`SQL-Editor-Bundle: ${report.files.sqlBundle ? 'vorhanden' : 'fehlt'}`);
  console.log(`SQL-Editor-Chunks: ${report.files.sqlChunks || 0}`);
  console.log(`Cron-SQL: ${report.files.cronSql ? 'vorhanden' : 'fehlt'}`);
  console.log(`Readiness: ${report.readiness.status}`);

  if (report.readiness.missingSecrets?.length) {
    console.log(`Fehlende Secrets: ${report.readiness.missingSecrets.join(', ')}`);
  }

  console.log(`Credential-Dateien: ${report.credentialFiles.status}`);

  if (report.credentialFiles.failures?.length) {
    console.log(`Credential-Dateien offen: ${report.credentialFiles.failures.join(', ')}`);
  }

  console.log(`Remote-Schema: ${report.remoteSchema.status}`);

  if (report.remoteSchema.projectHost) {
    console.log(`Remote-Projekt: ${report.remoteSchema.projectHost}`);
  }

  if (report.remoteSchema.missing?.length) {
    console.log(`Remote-Schema offen: ${report.remoteSchema.missing.join(', ')}`);
  }

  console.log(`Edge Functions: ${report.edgeFunctions.status}`);

  console.log(`Supabase Deploy CLI: ${report.deployTool.source} (${report.deployTool.status})`);

  if (report.deployTool.loginMayBeRequired) {
    console.log('Supabase CLI Auth: SUPABASE_ACCESS_TOKEN nicht gesetzt; alternativ supabase login verwenden.');
  }

  if (report.edgeFunctions.functionsBaseUrl) {
    console.log(`Functions Base URL: ${report.edgeFunctions.functionsBaseUrl}`);
  }

  if (report.edgeFunctions.failed?.length) {
    console.log(`Edge Functions offen: ${report.edgeFunctions.failed.join(', ')}`);
  }

  console.log('\nNächste Schritte:');
  report.nextActions.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`);
  });
}

const report = buildReport();

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report);
}

if (strict && !report.goLiveReady) {
  process.exitCode = 1;
}
