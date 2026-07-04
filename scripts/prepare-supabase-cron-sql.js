import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, looksConfigured } from '../server/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2);
const argSet = new Set(rawArgs);
const writeFile = argSet.has('--write');
const force = argSet.has('--force');
const jsonOutput = argSet.has('--json');
const templatePath = path.join(rootDir, 'supabase', 'cron.example.sql');
const localSecretsPath = path.join(rootDir, 'supabase', 'secrets.local.env');
const defaultOutputPath = path.join(rootDir, 'tmp', 'supabase-cron.sql');

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
  node scripts/prepare-supabase-cron-sql.js
  node scripts/prepare-supabase-cron-sql.js --write
  node scripts/prepare-supabase-cron-sql.js --write --force
  node scripts/prepare-supabase-cron-sql.js --json
  node scripts/prepare-supabase-cron-sql.js --project-ref <PROJECT_REF>

Options:
  --write                Create tmp/supabase-cron.sql from supabase/cron.example.sql.
  --force                Overwrite an existing generated cron SQL file.
  --json                 Print a redacted machine-readable summary.
  --project-ref <ref>    Supabase project ref. Defaults to SUPABASE_PROJECT_REF or config.supabase.url.
  --output <path>        Custom output path. Defaults to tmp/supabase-cron.sql.

The generated SQL contains WALLET_CRON_SECRET and is written only to tmp/ by
default. The script never prints the secret value or SQL contents.
`);
  process.exit(0);
}

if (argSet.has('--help') || argSet.has('-h')) {
  printUsageAndExit();
}

function configured(value) {
  const text = String(value || '').trim();

  return looksConfigured(text)
    && text !== '...'
    && !text.startsWith('SET_AS_')
    && !text.includes('NOT_FRONTEND')
    && !text.includes('PASTE_')
    && !text.includes('REPLACE_WITH_');
}

function configuredSecret(value) {
  return configured(value) && String(value).trim().length >= 32;
}

function getPath(object, segments) {
  return segments.reduce((current, segment) => (
    current && typeof current === 'object' ? current[segment] : undefined
  ), object);
}

function parseEnvValue(rawValue) {
  const value = String(rawValue || '').trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\\\', '\\');
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match) {
      result[match[1]] = parseEnvValue(match[2]);
    }
  }

  return result;
}

function deriveProjectRefFromUrl(value) {
  if (!configured(value)) {
    return '';
  }

  try {
    const host = new URL(value).host;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);

    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function resolveProjectRef(config) {
  const explicit = optionValue('--project-ref') || process.env.SUPABASE_PROJECT_REF || '';
  const derived = deriveProjectRefFromUrl(getPath(config, ['supabase', 'url']));
  const value = configured(explicit) ? explicit : derived;

  if (!configured(value) || !/^[a-z0-9-]+$/i.test(value)) {
    return { ready: false, value: '', source: value ? 'invalid' : 'missing' };
  }

  return {
    ready: true,
    value,
    source: configured(explicit) ? 'argument/env' : 'config.supabase.url'
  };
}

function resolveCronSecret(config, localEnv) {
  const candidates = [
    ['environment WALLET_CRON_SECRET', process.env.WALLET_CRON_SECRET],
    ['supabase/secrets.local.env', localEnv.WALLET_CRON_SECRET],
    ['config.automation.walletCronSecret', getPath(config, ['automation', 'walletCronSecret'])]
  ];
  const match = candidates.find(([, value]) => configuredSecret(value));

  if (!match) {
    return { ready: false, value: '', source: 'missing', length: 0 };
  }

  return {
    ready: true,
    value: String(match[1]).trim(),
    source: match[0],
    length: String(match[1]).trim().length
  };
}

function sqlLiteralPart(value) {
  return String(value).replaceAll("'", "''");
}

function renderCronSql(template, projectRef, cronSecret) {
  return template
    .replaceAll('YOUR_PROJECT_REF', projectRef)
    .replaceAll('YOUR_WALLET_CRON_SECRET', sqlLiteralPart(cronSecret));
}

function relative(filePath) {
  return path.relative(rootDir, filePath) || '.';
}

const outputPath = path.resolve(rootDir, optionValue('--output') || defaultOutputPath);

if (!fs.existsSync(templatePath)) {
  throw new Error('supabase/cron.example.sql fehlt.');
}

const config = loadConfig();
const localEnv = parseEnvFile(localSecretsPath);
const projectRef = resolveProjectRef(config);
const cronSecret = resolveCronSecret(config, localEnv);
const template = fs.readFileSync(templatePath, 'utf8');
const canRender = projectRef.ready && cronSecret.ready;
const renderedSql = canRender ? renderCronSql(template, projectRef.value, cronSecret.value) : '';
const placeholdersRemaining = canRender
  ? ['YOUR_PROJECT_REF', 'YOUR_WALLET_CRON_SECRET'].filter((needle) => renderedSql.includes(needle))
  : ['YOUR_PROJECT_REF', 'YOUR_WALLET_CRON_SECRET'];

if (writeFile) {
  if (!projectRef.ready) {
    throw new Error('Supabase Project Ref fehlt. Nutze --project-ref <PROJECT_REF> oder trage config.supabase.url ein.');
  }

  if (!cronSecret.ready) {
    throw new Error('WALLET_CRON_SECRET fehlt oder ist zu kurz. Erzeuge zuerst supabase/secrets.local.env mit node scripts/prepare-supabase-secrets-local.js --write --force oder setze WALLET_CRON_SECRET in der Umgebung.');
  }

  if (placeholdersRemaining.length > 0) {
    throw new Error(`Cron SQL enthält noch Platzhalter: ${placeholdersRemaining.join(', ')}`);
  }

  if (fs.existsSync(outputPath) && !force) {
    throw new Error(`${relative(outputPath)} existiert bereits. Nutze --force zum Ueberschreiben.`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderedSql, 'utf8');
}

const summary = {
  templatePath: relative(templatePath),
  outputPath: relative(outputPath),
  wroteFile: writeFile,
  projectRefReady: projectRef.ready,
  projectRefSource: projectRef.source,
  cronSecretReady: cronSecret.ready,
  cronSecretSource: cronSecret.source,
  cronSecretLength: cronSecret.length,
  placeholdersRemaining,
  outputContainsSecret: Boolean(writeFile && cronSecret.ready),
  secretsPrinted: false
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('Supabase Cron SQL Preparation');
  console.log(`Vorlage: ${summary.templatePath}`);
  console.log(`Ausgabe: ${summary.outputPath}`);
  console.log(`Project Ref: ${summary.projectRefReady ? `vorhanden (${summary.projectRefSource})` : 'fehlt'}`);
  console.log(`Cron Secret: ${summary.cronSecretReady ? `vorhanden (${summary.cronSecretSource}, ${summary.cronSecretLength} Zeichen, nicht ausgegeben)` : 'fehlt'}`);
  console.log(`Platzhalter offen: ${summary.placeholdersRemaining.length ? summary.placeholdersRemaining.join(', ') : 'keine'}`);
  console.log(writeFile
    ? 'Status: Cron-SQL geschrieben. Diese Datei enthält den Cron-Secret-Wert und bleibt in tmp/.'
    : 'Status: Dry-run; nutze --write zum Schreiben.');
}
