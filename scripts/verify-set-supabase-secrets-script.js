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

const script = read('scripts/set-supabase-secrets.sh');
const readme = read('README.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const credentials = read('docs/WALLET_EXTERNAL_CREDENTIALS.md');
const runbook = read('scripts/wallet-go-live-runbook.js');
const report = read('scripts/wallet-go-live-report.js');
const packageJson = read('package.json');

[
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '--dry-run',
  '--env-file',
  '--project-ref',
  '--skip-auth-check',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_CLI_BIN',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_CLI_COMMAND',
  'resolve_supabase_cli',
  'check_supabase_auth',
  'projects list',
  'derive_project_ref_from_config',
  'config.supabase?.url',
  'looksConfigured',
  'pnpm dlx supabase',
  'npx --yes supabase',
  'secrets set --env-file',
  'Werte werden nicht ausgegeben',
  'SUPABASE_ACCESS_TOKEN ist nicht gesetzt',
  'supabase/secrets.local.env'
].forEach((needle) => assertIncludes(script, needle, 'Secrets-Setzscript ist unvollständig'));

[
  'bash scripts/set-supabase-secrets.sh --dry-run',
  'bash scripts/set-supabase-secrets.sh',
  'SUPABASE_CLI_BIN',
  'SUPABASE_ACCESS_TOKEN'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss Secrets-Setzscript dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss Secrets-Setzscript dokumentieren');
});

[
  'bash scripts/set-supabase-secrets.sh --dry-run',
  'bash scripts/set-supabase-secrets.sh',
  'pnpm dlx supabase',
  'SUPABASE_ACCESS_TOKEN'
].forEach((needle) => {
  assertIncludes(acceptance, needle, 'External Acceptance muss Secrets-Setzscript dokumentieren');
  assertIncludes(credentials, needle, 'External Credentials muss Secrets-Setzscript dokumentieren');
});

[
  'bash scripts/set-supabase-secrets.sh --dry-run',
  'bash scripts/set-supabase-secrets.sh'
].forEach((needle) => assertIncludes(runbook, needle, 'Go-Live-Runbook muss Secrets-Setzscript nennen'));

assertIncludes(report, 'bash scripts/set-supabase-secrets.sh', 'Go-Live-Report muss Secrets-Setzscript als nächste Aktion nennen');
assertIncludes(packageJson, 'bash -n scripts/set-supabase-secrets.sh', 'pnpm check muss Secrets-Setzscript-Syntax prüfen');
assertIncludes(packageJson, 'verify-set-supabase-secrets-script.js', 'pnpm check muss Secrets-Setzscript-Vertrag prüfen');

console.log('Supabase Secrets Setzscript ist dokumentiert und statisch abgesichert.');
