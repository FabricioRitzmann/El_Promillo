#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo "Node.js wurde nicht gefunden."
  echo "Installiere Node.js oder starte in Codex mit der gebündelten Runtime."
  exit 1
fi

echo "Starte El_Promillo..."
echo "Oeffne danach: http://localhost:3000"
exec "$NODE_BIN" server/index.js
