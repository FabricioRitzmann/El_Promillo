#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups/before-elpromillo-redesign-20260704-1435"

if [ ! -d "$BACKUP_DIR/public" ]; then
  echo "Backup nicht gefunden: $BACKUP_DIR" >&2
  exit 1
fi

cp "$BACKUP_DIR"/public/*.html "$ROOT_DIR/public/"
cp "$BACKUP_DIR/public/styles.css" "$ROOT_DIR/public/styles.css"
cp "$BACKUP_DIR"/public/js/*.js "$ROOT_DIR/public/js/"

if [ -d "$BACKUP_DIR/public/assets" ]; then
  mkdir -p "$ROOT_DIR/public/assets"
  cp -R "$BACKUP_DIR/public/assets/." "$ROOT_DIR/public/assets/"
fi

if [ -f "$ROOT_DIR/public/assets/el-promillo-mark.svg" ] && [ ! -f "$BACKUP_DIR/public/assets/el-promillo-mark.svg" ]; then
  rm "$ROOT_DIR/public/assets/el-promillo-mark.svg"
fi

if [ -f "$ROOT_DIR/public/assets/el-promillo-logo.png" ] && [ ! -f "$BACKUP_DIR/public/assets/el-promillo-logo.png" ]; then
  rm "$ROOT_DIR/public/assets/el-promillo-logo.png"
fi

for asset in \
  "$ROOT_DIR/public/assets/el-promillo-emblem-full.png" \
  "$ROOT_DIR/public/assets/el-promillo-emblem-hq.png" \
  "$ROOT_DIR/public/assets/el-promillo-emblem-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-emblem-gold-outline.png" \
  "$ROOT_DIR/public/assets/el-promillo-header-logo-final-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-header-logo-couple-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-title-lockup.png" \
  "$ROOT_DIR/public/assets/el-promillo-title-lockup-transparent.png" \
  "$ROOT_DIR/public/assets/el-promillo-title-lockup-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-title-lockup-new-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-title-lockup-source-wide.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-monogram-emblem.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-monogram-emblem-transparent.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-monogram-emblem-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-wallet-emblem.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-wallet-emblem-transparent.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-wallet-emblem-cutout.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-pass-emblem.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-pass-emblem-transparent.png" \
  "$ROOT_DIR/public/assets/el-promillo-mini-pass-emblem-cutout.png" \
  "$ROOT_DIR/public/assets/wallet-emblems/default/neutral-couple.png" \
  "$ROOT_DIR/public/assets/wallet-emblems/default/male-gentleman.png" \
  "$ROOT_DIR/public/assets/wallet-emblems/default/female-lady.png" \
  "$ROOT_DIR/public/assets/source/el-promillo-reference.png" \
  "$ROOT_DIR/public/assets/source/el-promillo-header-logo-final-source.png" \
  "$ROOT_DIR/public/assets/source/el-promillo-header-logo-couple-source.png" \
  "$ROOT_DIR/public/assets/source/el-promillo-title-lockup-new-source.png" \
  "$ROOT_DIR/public/assets/source/wallet-emblems/default/neutral-couple-source.png" \
  "$ROOT_DIR/public/assets/source/wallet-emblems/default/male-gentleman-source.png" \
  "$ROOT_DIR/public/assets/source/wallet-emblems/default/female-lady-source.png"
do
  backup_asset="${asset/$ROOT_DIR/$BACKUP_DIR}"
  if [ -f "$asset" ] && [ ! -f "$backup_asset" ]; then
    rm "$asset"
  fi
done

echo "Frontend-Design wurde auf den Stand vor dem El-Promillo-Redesign zurückgesetzt."
