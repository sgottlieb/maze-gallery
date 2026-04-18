#!/usr/bin/env bash
# Resize JPGs from _originals/ into art/<series>/ at max 1024px wide, ~80% quality.
# Series is inferred from filename prefix (Match_*, Me_*, Mother_*).
set -euo pipefail

SRC_DIR="_originals"
ART_DIR="art"

if ! command -v sips >/dev/null 2>&1; then
  echo "sips not found (this script assumes macOS)." >&2
  exit 1
fi

for file in "$SRC_DIR"/*.jpg; do
  [ -e "$file" ] || continue
  base=$(basename "$file")
  prefix="${base%%_*}"
  series=$(echo "$prefix" | tr '[:upper:]' '[:lower:]')
  dest="$ART_DIR/$series/$base"

  mkdir -p "$ART_DIR/$series"
  # Copy then resize+re-encode in-place
  cp "$file" "$dest"
  sips -Z 1024 -s formatOptions 80 "$dest" >/dev/null
  size_kb=$(( $(stat -f%z "$dest") / 1024 ))
  echo "  $dest (${size_kb} KB)"
done
