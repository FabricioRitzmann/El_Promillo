#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_BUNDLE="tmp/supabase-schema-sql-editor-bundle.sql"
DEFAULT_SCHEMA="supabase/schema.sql"

DRY_RUN=false
SKIP_AUTH_CHECK=false
SQL_FILE=""
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_CLI_BIN="${SUPABASE_CLI_BIN:-}"
SUPABASE_CLI_SOURCE=""
SUPABASE_CLI_COMMAND=()

usage() {
  cat <<'USAGE'
Apply the Supabase schema SQL via Supabase CLI without printing secrets.

Usage:
  bash scripts/apply-supabase-schema.sh --dry-run
  bash scripts/apply-supabase-schema.sh
  bash scripts/apply-supabase-schema.sh --file tmp/supabase-schema-sql-editor-bundle.sql
  bash scripts/apply-supabase-schema.sh --project-ref <PROJECT_REF>
  SUPABASE_DB_URL='postgresql://...' bash scripts/apply-supabase-schema.sh
  SUPABASE_PROJECT_REF=<PROJECT_REF> bash scripts/apply-supabase-schema.sh
  SUPABASE_CLI_BIN=/path/to/supabase bash scripts/apply-supabase-schema.sh
  bash scripts/apply-supabase-schema.sh --skip-auth-check

Options:
  --dry-run              Print the redacted command without applying SQL.
  --file <path>          SQL file to apply. Default: generated bundle, then supabase/schema.sql.
  --project-ref <ref>    Project ref used for validation/link instructions.
  --skip-auth-check      Skip the Supabase CLI auth preflight before applying SQL.
  -h, --help             Show this help.

Connection:
  - Preferred: set SUPABASE_DB_URL to the percent-encoded remote database URL.
  - Alternative: link the project once with `supabase link --project-ref <PROJECT_REF>`,
    then this script uses `supabase db query --linked --file <SQL_FILE>`.

Notes:
  - SQL content, database URLs and secrets are never printed by this script.
  - If --project-ref and SUPABASE_PROJECT_REF are omitted, the script derives the project ref from config.json -> supabase.url when possible.
  - If no global supabase command exists, the script falls back to pnpm dlx supabase or npx --yes supabase.
  - For real remote applies, run supabase login first or set SUPABASE_ACCESS_TOKEN.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --file)
      SQL_FILE="${2:-}"
      if [[ -z "$SQL_FILE" ]]; then
        echo "Fehler: --file braucht einen Pfad." >&2
        exit 1
      fi
      shift 2
      ;;
    --project-ref)
      PROJECT_REF="${2:-}"
      if [[ -z "$PROJECT_REF" ]]; then
        echo "Fehler: --project-ref braucht einen Wert." >&2
        exit 1
      fi
      shift 2
      ;;
    --skip-auth-check)
      SKIP_AUTH_CHECK=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unbekannte Option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

command_string() {
  local arg
  for arg in "$@"; do
    if [[ "$arg" == "${SUPABASE_DB_URL:-__NO_DB_URL__}" && -n "${SUPABASE_DB_URL:-}" ]]; then
      printf '%q ' '<redacted-supabase-db-url>'
    else
      printf '%q ' "$arg"
    fi
  done
  printf '\n'
}

run_command() {
  if [[ "$DRY_RUN" == true ]]; then
    command_string "$@"
    return 0
  fi

  "$@"
}

resolve_supabase_cli() {
  if [[ -n "$SUPABASE_CLI_BIN" ]]; then
    SUPABASE_CLI_COMMAND=("$SUPABASE_CLI_BIN")
    SUPABASE_CLI_SOURCE="SUPABASE_CLI_BIN"
    return 0
  fi

  if command -v supabase >/dev/null 2>&1; then
    SUPABASE_CLI_COMMAND=(supabase)
    SUPABASE_CLI_SOURCE="global supabase"
    return 0
  fi

  if command -v pnpm >/dev/null 2>&1; then
    SUPABASE_CLI_COMMAND=(pnpm dlx supabase)
    SUPABASE_CLI_SOURCE="pnpm dlx supabase"
    return 0
  fi

  if command -v npx >/dev/null 2>&1; then
    SUPABASE_CLI_COMMAND=(npx --yes supabase)
    SUPABASE_CLI_SOURCE="npx --yes supabase"
    return 0
  fi

  return 1
}

check_supabase_auth() {
  if "${SUPABASE_CLI_COMMAND[@]}" projects list >/dev/null 2>&1; then
    return 0
  fi

  echo "Fehler: Supabase CLI ist nicht authentifiziert oder darf keine Projekte lesen." >&2
  echo "Führe zuerst aus: supabase login" >&2
  echo "Oder setze für CI/Terminal: export SUPABASE_ACCESS_TOKEN=<dein-token>" >&2
  echo "Danach erneut starten: bash scripts/apply-supabase-schema.sh" >&2
  echo "Wenn du bewusst ohne Preflight fortfahren willst: bash scripts/apply-supabase-schema.sh --skip-auth-check" >&2
  return 1
}

derive_project_ref_from_config() {
  node --input-type=module <<'NODE'
import { loadConfig, looksConfigured } from './server/config.js';

try {
  const config = loadConfig();
  const supabaseUrl = String(config.supabase?.url || '').trim();

  if (!looksConfigured(supabaseUrl)) {
    process.exit(0);
  }

  const host = new URL(supabaseUrl).host;
  const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);

  if (match) {
    console.log(match[1]);
  }
} catch {
  process.exit(0);
}
NODE
}

if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF="$(derive_project_ref_from_config || true)"
fi

if [[ -z "$SQL_FILE" ]]; then
  if [[ -f "$DEFAULT_BUNDLE" ]]; then
    SQL_FILE="$DEFAULT_BUNDLE"
  else
    SQL_FILE="$DEFAULT_SCHEMA"
  fi
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Fehler: SQL-Datei fehlt: $SQL_FILE" >&2
  echo "Erzeuge das Bundle z. B. mit: node scripts/prepare-supabase-sql-editor-bundle.js --write --force" >&2
  exit 1
fi

if ! resolve_supabase_cli; then
  if [[ "$DRY_RUN" == true ]]; then
    SUPABASE_CLI_COMMAND=(supabase)
    SUPABASE_CLI_SOURCE="nicht gefunden; Dry-Run zeigt Standardbefehl"
  else
    echo "Fehler: Supabase CLI nicht gefunden. Installiere/aktiviere Supabase CLI, installiere pnpm/npx, setze SUPABASE_CLI_BIN oder nutze --dry-run." >&2
    exit 1
  fi
fi

if [[ "$DRY_RUN" != true && "$SUPABASE_CLI_SOURCE" == "SUPABASE_CLI_BIN" && ! -x "$SUPABASE_CLI_BIN" ]]; then
  echo "Fehler: SUPABASE_CLI_BIN ist nicht ausführbar: $SUPABASE_CLI_BIN" >&2
  exit 1
fi

if [[ "$DRY_RUN" != true && -z "${SUPABASE_DB_URL:-}" && "$SKIP_AUTH_CHECK" != true ]]; then
  echo "Prüfe Supabase CLI Auth..."
  check_supabase_auth
elif [[ "$DRY_RUN" != true && -z "${SUPABASE_DB_URL:-}" && -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Hinweis: SUPABASE_ACCESS_TOKEN ist nicht gesetzt. Die Supabase CLI braucht eine bestehende Login-Session, sonst schlägt der Schema-Apply mit AuthRequired fehl."
fi

sql_bytes="$(wc -c < "$SQL_FILE" | tr -d ' ')"

echo "Supabase Schema SQL-Datei: $SQL_FILE (${sql_bytes} Bytes)"
echo "SQL-Inhalt und Datenbank-URL werden nicht ausgegeben."
echo "Supabase CLI: $SUPABASE_CLI_SOURCE"

if [[ -n "$PROJECT_REF" ]]; then
  echo "Supabase Project Ref: $PROJECT_REF"
else
  echo "Supabase Project Ref: nicht gesetzt."
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  apply_command=("${SUPABASE_CLI_COMMAND[@]}" db query --db-url "$SUPABASE_DB_URL" --file "$SQL_FILE")
else
  if [[ ! -f "supabase/.temp/project-ref" ]]; then
    echo "Hinweis: SUPABASE_DB_URL ist nicht gesetzt und kein gelinktes Projekt gefunden." >&2
    echo "Linke das Projekt zuerst: supabase link --project-ref ${PROJECT_REF:-<PROJECT_REF>}" >&2
    echo "Oder setze: export SUPABASE_DB_URL=<percent-encoded-postgres-url>" >&2
    if [[ "$DRY_RUN" != true ]]; then
      exit 1
    fi
  fi

  apply_command=("${SUPABASE_CLI_COMMAND[@]}" db query --linked --file "$SQL_FILE")
fi

run_command "${apply_command[@]}"

cat <<'NEXT'

Nächste Prüfschritte nach erfolgreichem Schema-Apply:
  node scripts/wallet-remote-schema-check.js --strict
  node scripts/wallet-go-live-report.js
NEXT
