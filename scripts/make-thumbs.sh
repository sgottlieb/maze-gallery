#!/usr/bin/env bash
# Generate 80x80 thumbnails for all art into art/thumbs/.
# JPGs: sips cropped/resized. WebMs: first frame extracted via ffmpeg, then sips.
set -euo pipefail

OUT="art/thumbs"
mkdir -p "$OUT"

# JPGs
for file in art/match/*.jpg art/me/*.jpg art/mother/*.jpg; do
  [ -e "$file" ] || continue
  base=$(basename "$file" .jpg)
  dest="$OUT/${base}.jpg"
  cp "$file" "$dest"
  # Center-crop to square, then resize to 80.
  w=$(sips -g pixelWidth "$dest" | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$dest" | awk '/pixelHeight/ {print $2}')
  size=$(( w < h ? w : h ))
  sips -c "$size" "$size" "$dest" >/dev/null
  sips -Z 80 -s formatOptions 70 "$dest" >/dev/null
  echo "  $dest"
done

# WebMs → first frame → crop → 80px
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
for file in art/animated/*.webm; do
  [ -e "$file" ] || continue
  base=$(basename "$file" .webm)
  frame="$TMP/${base}.jpg"
  ffmpeg -y -i "$file" -vframes 1 -q:v 3 "$frame" 2>/dev/null
  dest="$OUT/${base}.jpg"
  cp "$frame" "$dest"
  w=$(sips -g pixelWidth "$dest" | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$dest" | awk '/pixelHeight/ {print $2}')
  size=$(( w < h ? w : h ))
  sips -c "$size" "$size" "$dest" >/dev/null
  sips -Z 80 -s formatOptions 70 "$dest" >/dev/null
  echo "  $dest"
done
