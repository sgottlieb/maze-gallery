#!/usr/bin/env bash
# Convert a single GIF to WebM (VP9, no audio, max 1024px wide, CRF 32).
# Usage: ./scripts/convert-gif.sh _originals/Dreamstorm.gif
set -euo pipefail

INPUT="${1:?usage: convert-gif.sh path/to/input.gif}"
[ -f "$INPUT" ] || { echo "not found: $INPUT" >&2; exit 1; }

base=$(basename "$INPUT" .gif)
OUTPUT="art/animated/${base}.webm"
mkdir -p art/animated

ffmpeg -y -i "$INPUT" \
  -c:v libvpx-vp9 -crf 32 -b:v 0 \
  -an \
  -pix_fmt yuv420p \
  -vf "scale=w='min(1024,iw)':h=-2" \
  -loop 0 \
  "$OUTPUT"

size_kb=$(( $(stat -f%z "$OUTPUT") / 1024 ))
echo "  $OUTPUT (${size_kb} KB)"
