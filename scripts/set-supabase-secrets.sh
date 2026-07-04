#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=false
SKIP_AUTH_CHECK=false
ENV_FILE="supabase/secrets.local.env"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_CLI_BIN="${SUPABASE_CLI_BIN:-}"
SUPABASE_CLI_SOURCE=""
SUPABASE_CLI_COMMAND=()

usage() {
  cat <<'USAGE'
Set Supabase Secrets from a local env file without printing secret values.

Usage:
  bash scripts/set-supabase-secrets.sh --dry-run
  bash scripts/set-supabase-secrets.sh
  bash scripts/set-supabase-secrets.sh --env-file supabase/secrets.local.env
  bash scripts/set-supabase-secrets.sh --project-ref <PROJECT_REF>
  SUPABASE_PROJECT_REF=<PROJECT_REF> bash scripts/set-supabase-secrets.sh
  SUPABASE_CLI_BIN=/path/to/supabase bash scripts/set-supabase-secrets.sh
  bash scripts/set-supabase-secrets.sh --skip-auth-check

Options:
  --dry-run              Print the redacted command without setting secrets.
  --env-file <path>      Env file to pass to Supabase CLI. Default: supabase/secrets.local.env.
  --project-ref <ref>    Pass --project-ref to Supabase CLI.
  --skip-auth-check      Skip the Supabase CLI auth preflight before setting secrets.
  -h, --help             Show this help.

Notes:
  - Secret values are never printed by this script.
  - If --project-ref and SUPABASE_PROJECT_REF are omitted, the script derives the project ref from config.json -> supabase.url when possible.
  - If no global supabase command exists, the script falls back to pnpm dlx supabase or npx --yes supabase.
  - Set SUPABASE_CLI_BIN to a specific Supabase CLI executable when needed.
  - For real secret writes, run supabase login first or set SUPABASE_ACCESS_TOKEN.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      if [[ -z "$ENV_FILE" ]]; then
        echo "Fehler: --env-file braucht einen Pfad." >&2
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
  printf '%q ' "$@"
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
  echo "Danach erneut starten: bash scripts/set-supabase-secrets.sh" >&2
  echo "Wenn du bewusst ohne Preflight fortfahren willst: bash scripts/set-supabase-secrets.sh --skip-auth-check" >&2
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

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehler: $ENV_FILE fehlt. Erzeuge sie z. B. mit:" >&2
  echo "  node scripts/prepare-supabase-secrets-local.js --write" >&2
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

ready_count="$( (grep -E '^[A-Z0-9_]+=' "$ENV_FILE" || true) | wc -l | tr -d ' ')"
missing_count="$( (grep -E '^# MISSING ' "$ENV_FILE" || true) | wc -l | tr -d ' ')"

echo "Supabase Secrets Env-Datei: $ENV_FILE"
echo "Bereite $ready_count Secret-Zuweisungen vor. Werte werden nicht ausgegeben."

if [[ "$missing_count" != "0" ]]; then
  echo "Hinweis: $missing_count fehlende Secrets sind als Kommentare markiert und werden nicht gesetzt."
fi

if [[ "$DRY_RUN" != true && "$SKIP_AUTH_CHECK" != true ]]; then
  echo "Prüfe Supabase CLI Auth..."
  check_supabase_auth
elif [[ "$DRY_RUN" != true && -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Hinweis: SUPABASE_ACCESS_TOKEN ist nicht gesetzt. Die Supabase CLI braucht eine bestehende Login-Session, sonst schlägt das Setzen mit AuthRequired fehl."
fi

echo "Supabase CLI: $SUPABASE_CLI_SOURCE"

if [[ -n "$PROJECT_REF" ]]; then
  echo "Supabase Project Ref: $PROJECT_REF"
else
  echo "Supabase Project Ref: nicht gesetzt; Supabase CLI nutzt das lokal gelinkte Projekt, falls vorhanden."
fi

secret_command=("${SUPABASE_CLI_COMMAND[@]}" secrets set --env-file "$ENV_FILE")

if [[ -n "$PROJECT_REF" ]]; then
  secret_command+=(--project-ref "$PROJECT_REF")
fi

run_command "${secret_command[@]}"

cat <<'NEXT'

Nächste Prüfschritte nach erfolgreichem Setzen:
  node scripts/wallet-readiness-report.js --strict
  bash scripts/deploy-wallet-functions.sh --dry-run
  bash scripts/deploy-wallet-functions.sh
NEXT
