#!/usr/bin/env bash
# Convert every GIF in _originals/ to WebM in art/animated/
set -euo pipefail

for gif in _originals/*.gif; do
  [ -e "$gif" ] || continue
  ./scripts/convert-gif.sh "$gif"
done
