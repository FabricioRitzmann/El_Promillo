#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="${EL_PROMILLO_BACKUP_PROJECT_NAME:-pornwheel}"
BACKUP_ROOT="${EL_PROMILLO_BACKUP_ROOT:-$HOME/Desktop/pornwheel_safe_backups}"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
SHORT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo no-git)"
DESTINATION="$BACKUP_ROOT/${TIMESTAMP}_${SHORT_SHA}_${PROJECT_NAME}"
LATEST_LINK="$BACKUP_ROOT/latest"

mkdir -p "$BACKUP_ROOT"

if [[ -e "$DESTINATION" ]]; then
  echo "Backup-Ziel existiert bereits: $DESTINATION" >&2
  exit 1
fi

mkdir -p "$DESTINATION"

RSYNC_EXCLUDES=(--exclude ".DS_Store")

if [[ "${EL_PROMILLO_BACKUP_INCLUDE_NODE_MODULES:-0}" != "1" ]]; then
  RSYNC_EXCLUDES+=(--exclude "node_modules")
fi

# Keep the automatic snapshot fast and non-blocking. The backup records the
# exact Git commit below; full Git history remains available through GitHub.
if [[ "${EL_PROMILLO_BACKUP_INCLUDE_GIT:-0}" != "1" ]]; then
  RSYNC_EXCLUDES+=(--exclude ".git")
fi

rsync -a --delete "${RSYNC_EXCLUDES[@]}" "$ROOT_DIR/" "$DESTINATION/"

{
  echo "project=$PROJECT_NAME"
  echo "source=$ROOT_DIR"
  echo "commit=$SHORT_SHA"
  echo "created_at=$TIMESTAMP"
  echo "node_modules_included=${EL_PROMILLO_BACKUP_INCLUDE_NODE_MODULES:-0}"
  echo "git_history_included=${EL_PROMILLO_BACKUP_INCLUDE_GIT:-0}"
} > "$DESTINATION/BACKUP_COMPLETE.txt"
ln -sfn "$DESTINATION" "$LATEST_LINK"
printf '%s\n' "$DESTINATION" > "$BACKUP_ROOT/LATEST_BACKUP.txt"

echo "Safe backup created: $DESTINATION"
