# 3D Maze Art Visualizer

An autonomous 3D-maze screensaver showcasing Sara Gottlieb's art, embeddable in Squarespace.

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Project structure

See `docs/superpowers/specs/2026-04-18-3dmaze-design.md`.

## Adding new art

1. Drop JPGs (max 1024px wide) into `art/match/`, `art/me/`, or `art/mother/`.
2. For new animated pieces, convert GIF → WebM: `./scripts/convert-gif.sh path/to/input.gif`.
3. Regenerate thumbnails: `./scripts/make-thumbs.sh`.
4. Commit and push — Cloudflare Pages auto-deploys.

## Deploy

Static files in repo root are published by Cloudflare Pages (build command: none, output directory: `/`).
