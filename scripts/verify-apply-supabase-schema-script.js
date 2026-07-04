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

const script = read('scripts/apply-supabase-schema.sh');
const readme = read('README.md');
const context = read('docs/WALLET_INTEGRATION_CONTEXT.md');
const acceptance = read('docs/WALLET_EXTERNAL_ACCEPTANCE.md');
const runbook = read('scripts/wallet-go-live-runbook.js');
const report = read('scripts/wallet-go-live-report.js');
const packageJson = read('package.json');

[
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '--dry-run',
  '--file',
  '--project-ref',
  '--skip-auth-check',
  'SUPABASE_DB_URL',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_CLI_BIN',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_CLI_COMMAND',
  'resolve_supabase_cli',
  'check_supabase_auth',
  'derive_project_ref_from_config',
  'config.supabase?.url',
  'looksConfigured',
  'pnpm dlx supabase',
  'npx --yes supabase',
  'db query --db-url',
  'db query --linked --file',
  'supabase/.temp/project-ref',
  'supabase link --project-ref',
  'SQL-Inhalt und Datenbank-URL werden nicht ausgegeben',
  'tmp/supabase-schema-sql-editor-bundle.sql',
  'supabase/schema.sql'
].forEach((needle) => assertIncludes(script, needle, 'Schema-Apply-Script ist unvollständig'));

[
  'bash scripts/apply-supabase-schema.sh --dry-run',
  'bash scripts/apply-supabase-schema.sh',
  'SUPABASE_DB_URL',
  'supabase link --project-ref'
].forEach((needle) => {
  assertIncludes(readme, needle, 'README muss Schema-Apply-Script dokumentieren');
  assertIncludes(context, needle, 'Wallet-Kontext muss Schema-Apply-Script dokumentieren');
  assertIncludes(acceptance, needle, 'External Acceptance muss Schema-Apply-Script dokumentieren');
});

[
  'bash scripts/apply-supabase-schema.sh --dry-run',
  'bash scripts/apply-supabase-schema.sh',
  'SUPABASE_DB_URL',
  'supabase link --project-ref'
].forEach((needle) => assertIncludes(runbook, needle, 'Go-Live-Runbook muss Schema-Apply-Script nennen'));

assertIncludes(report, 'bash scripts/apply-supabase-schema.sh --dry-run', 'Go-Live-Report muss Schema-Apply-Script nennen');
assertIncludes(packageJson, 'bash -n scripts/apply-supabase-schema.sh', 'pnpm check muss Schema-Apply-Script-Syntax prüfen');
assertIncludes(packageJson, 'verify-apply-supabase-schema-script.js', 'pnpm check muss Schema-Apply-Script-Vertrag prüfen');

console.log('Supabase Schema-Apply-Script ist dokumentiert und statisch abgesichert.');
