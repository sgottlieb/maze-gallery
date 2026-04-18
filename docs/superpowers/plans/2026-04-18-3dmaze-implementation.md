# 3D Maze Art Visualizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A zero-build static site embedding a Three.js 3D maze screensaver with per-surface image-level multi-select curation, deployable to Cloudflare Pages and embeddable as an iframe in Squarespace.

**Architecture:** Vanilla ES modules importing Three.js r170 via importmap. Self-contained directory served as static files. All runtime state in memory. Art loaded from `/art/<series>/*` at runtime. A single `ShaderMaterial` per face with a fragment shader that letterboxes image or video textures into the face's 1:1 square aspect.

**Tech Stack:** HTML5, vanilla JS (ES modules), Three.js r170 (GLSL shaders), HTML5 `<video>` + `VideoTexture` for animated textures. One-time asset prep uses `sips` (macOS built-in) for JPG resize and `ffmpeg` for GIF→WebM.

**Spec:** `docs/superpowers/specs/2026-04-18-3dmaze-design.md`

## File Structure

```
3dMaze/
├── index.html              # entry, importmap, loader indicator, mounts canvas + overlay
├── main.js                 # boot: scene, renderer, assets, UI
├── scene/
│   ├── maze.js             # recursive-backtracking generator; pure function
│   ├── world.js            # converts cell grid → Three.js meshes; exposes face records
│   ├── drift.js            # per-frame camera motion + junction turning
│   └── textures.js         # texture loading, per-face assignment, ShaderMaterial factory
├── ui/
│   ├── config.js           # drawer + tabs + selection state + live retexture hook
│   └── config.css          # overlay styling
├── art/                    # SHIPPED: optimized JPGs + WebMs
│   ├── match/              # 3 JPGs
│   ├── me/                 # 3 JPGs
│   ├── mother/             # 3 JPGs
│   ├── animated/           # 5 WebMs
│   └── thumbs/             # 14 thumbnail JPGs (80px square, letterboxed)
├── audio/
│   └── ambient.mp3         # optional; absence hides mute button
├── scripts/
│   ├── optimize-jpgs.sh    # reusable JPG resize script (documented in README)
│   ├── convert-gif.sh      # single-GIF→WebM converter for adding new pieces later
│   └── make-thumbs.sh      # generates /art/thumbs/ from optimized art
├── _originals/             # IGNORED by git: Sara's original high-res files (backup)
├── .gitignore
├── .gitattributes          # mark WebM as binary for clean diffs
└── README.md               # setup + deploy + "how to add new art" notes
```

## Design Principles Applied in This Plan

- **Zero-build:** every file is hand-authored; nothing transpiled. ES modules + importmap.
- **Separation:** scene geometry, camera logic, textures, and UI are independent modules. Each file has one responsibility.
- **No automated tests** (per spec): each task ends with a concrete "verify in browser" step. For pure logic (maze generator), a 10-line Node sanity check using `node --test` is included as a cheap safety net.
- **Frequent commits:** one commit per task, sometimes two.

## Tasks

Task numbering: 20 tasks. Each task has steps sized 2-5 minutes each.

---

### Task 1: Project scaffolding

**Files:**
- Create: `/Users/saragottlieb/WorkWorkWork/3dMaze/.gitignore`
- Create: `/Users/saragottlieb/WorkWorkWork/3dMaze/.gitattributes`
- Create: `/Users/saragottlieb/WorkWorkWork/3dMaze/README.md`
- Create: `/Users/saragottlieb/WorkWorkWork/3dMaze/scripts/` (directory)
- Create: `/Users/saragottlieb/WorkWorkWork/3dMaze/_originals/` (directory)

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/saragottlieb/WorkWorkWork/3dMaze
git init
git branch -M main
```

Expected: `Initialized empty Git repository`. `.git/` created.

- [ ] **Step 2: Back up original art files to `_originals/`**

Move (not copy) the current flat art so we preserve them outside the deployed bundle:

```bash
mkdir -p _originals
mv art/* _originals/
ls _originals/
```

Expected output: all 14 files (3 Match JPGs, 3 Me JPGs, 3 Mother JPGs, 5 GIFs) listed in `_originals/`.

- [ ] **Step 3: Recreate series subdirectories in `/art/`**

```bash
mkdir -p art/match art/me art/mother art/animated art/thumbs
ls -la art/
```

Expected: empty subdirectories `match/`, `me/`, `mother/`, `animated/`, `thumbs/`.

- [ ] **Step 4: Create `.gitignore`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/.gitignore`:

```
# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/

# Art originals (huge; kept locally, not shipped)
_originals/

# Brainstorming scratch
.superpowers/

# Claude local settings
.claude/
```

- [ ] **Step 5: Create `.gitattributes`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/.gitattributes`:

```
# Binary media (disable git's text diff attempts)
*.jpg binary
*.jpeg binary
*.png binary
*.webm binary
*.mp3 binary
*.mp4 binary
```

- [ ] **Step 6: Create a skeleton `README.md`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/README.md`:

```markdown
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
```

- [ ] **Step 7: Initial commit**

```bash
git add .gitignore .gitattributes README.md
git commit -m "chore: project scaffolding"
```

Expected: commit succeeds, one file each staged.

---

### Task 2: JPG optimization script + run

**Files:**
- Create: `scripts/optimize-jpgs.sh`

Purpose: resize each JPG to max 1024px wide, re-encode at 80% JPEG quality, write to `art/<series>/`. Uses macOS built-in `sips` (no installs needed).

- [ ] **Step 1: Write the optimize-jpgs.sh script**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scripts/optimize-jpgs.sh`:

```bash
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
```

Make it executable and run it:

```bash
chmod +x scripts/optimize-jpgs.sh
./scripts/optimize-jpgs.sh
```

Expected output (approximate — exact kb may vary):
```
  art/match/Match_01.jpg (NNN KB)
  art/match/Match_07.jpg (NNN KB)
  art/match/Match_13.jpg (NNN KB)
  art/me/Me_01.jpg (NNN KB)
  ... (9 total)
```

- [ ] **Step 2: Verify output**

```bash
ls -la art/match art/me art/mother
```

Expected: 3 JPGs in each of `art/match/`, `art/me/`, `art/mother/`. File sizes should be in the 100–300 KB range per JPG (down from ~1 MB originals).

- [ ] **Step 3: Commit**

```bash
git add scripts/optimize-jpgs.sh art/match art/me art/mother
git commit -m "feat: resize and commit JPG art in series folders"
```

---

### Task 3: GIF → WebM conversion

**Files:**
- Create: `scripts/convert-gif.sh`
- Create: `scripts/convert-all-gifs.sh`

- [ ] **Step 1: Verify ffmpeg is available**

```bash
which ffmpeg && ffmpeg -version | head -1
```

Expected: a path to `ffmpeg` and a version line.

If not installed:
```bash
brew install ffmpeg
```

- [ ] **Step 2: Write single-GIF converter**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scripts/convert-gif.sh`:

```bash
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
```

`chmod +x scripts/convert-gif.sh`.

- [ ] **Step 3: Write batch converter**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scripts/convert-all-gifs.sh`:

```bash
#!/usr/bin/env bash
# Convert every GIF in _originals/ to WebM in art/animated/
set -euo pipefail

for gif in _originals/*.gif; do
  [ -e "$gif" ] || continue
  ./scripts/convert-gif.sh "$gif"
done
```

`chmod +x scripts/convert-all-gifs.sh`.

- [ ] **Step 4: Run batch converter**

```bash
./scripts/convert-all-gifs.sh
```

Expected: 5 WebMs written to `art/animated/`. Sizes should be dramatically smaller than the GIFs (rough targets: Dreamstorm.webm 1–3 MB vs 20 MB GIF).

- [ ] **Step 5: Verify and commit**

```bash
ls -la art/animated/
du -sh art/animated/
```

Expected: 5 `.webm` files, total under ~15 MB.

```bash
git add scripts/convert-gif.sh scripts/convert-all-gifs.sh art/animated
git commit -m "feat: convert GIFs to WebM and commit scripts"
```

---

### Task 4: Thumbnail generation

**Files:**
- Create: `scripts/make-thumbs.sh`

Each of the 14 pieces needs a small (80×80 px, square) thumbnail for the overlay. JPGs: resize with `sips`. WebMs: extract the first frame with `ffmpeg`, then `sips`.

- [ ] **Step 1: Write the thumbnail script**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scripts/make-thumbs.sh`:

```bash
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
```

`chmod +x scripts/make-thumbs.sh`.

- [ ] **Step 2: Run it**

```bash
./scripts/make-thumbs.sh
ls art/thumbs/
```

Expected: 14 JPGs, all roughly 80×80 px, each 3–10 KB.

Verify one:

```bash
sips -g pixelWidth -g pixelHeight art/thumbs/Match_01.jpg
sips -g pixelWidth -g pixelHeight art/thumbs/Dreamstorm.jpg
```

Expected: both show `pixelWidth: 80, pixelHeight: 80`.

- [ ] **Step 3: Commit**

```bash
git add scripts/make-thumbs.sh art/thumbs
git commit -m "feat: generate overlay thumbnails for all pieces"
```

---

### Task 5: HTML entry + empty Three.js boot

**Files:**
- Create: `index.html`
- Create: `main.js`

Goal: page renders a dark canvas with a slowly-rotating wireframe cube (sanity check that Three.js loads). No scene yet.

- [ ] **Step 1: Write `index.html`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>3D Maze — Sara Gottlieb</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #08040f; color: #fff; font-family: system-ui, sans-serif; }
    body { overflow: hidden; }
    #canvas { display: block; width: 100vw; height: 100vh; }
    #loading {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,0.6); font-size: 12px; letter-spacing: 1px;
      pointer-events: none;
    }
    #loading.hidden { display: none; }
  </style>
  <link rel="stylesheet" href="./ui/config.css" />
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.170.0/build/three.module.js"
    }
  }
  </script>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="loading">loading…</div>
  <div id="overlay-root"></div>

  <script type="module" src="./main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write minimal `main.js` with test cube**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/main.js`:

```js
import * as THREE from 'three';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08040f);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
camera.position.set(0, 0, 5);

// sanity-check cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xb89ad8, wireframe: true })
);
scene.add(cube);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function loop() {
  cube.rotation.x += 0.005;
  cube.rotation.y += 0.007;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

loading.classList.add('hidden');
```

- [ ] **Step 3: Create empty `ui/config.css`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/ui/config.css`:

```css
/* will be filled in Task 14 */
```

- [ ] **Step 4: Serve + verify**

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Expected: dark viewport with a rotating purple wireframe cube, no console errors.

(Stop the server with Ctrl+C when done verifying.)

- [ ] **Step 5: Commit**

```bash
git add index.html main.js ui/config.css
git commit -m "feat: scaffold HTML entry with Three.js importmap and test cube"
```

---

### Task 6: Maze generator (recursive backtracking)

**Files:**
- Create: `scene/maze.js`
- Create: `scripts/test-maze.mjs` (tiny Node sanity check)

Pure function: given `(cols, rows, rng)`, return a cell grid where each cell has open/closed walls on N/E/S/W.

- [ ] **Step 1: Write the generator**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scene/maze.js`:

```js
// Recursive-backtracking maze generator.
// Returns a grid of cells where each cell has { x, y, walls: {n,e,s,w} }.
// `walls[dir] === true` means there is a wall there.
// The maze is surrounded by solid perimeter walls (ensured by construction).

export function generateMaze(cols, rows, rng = Math.random) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, walls: { n: true, e: true, s: true, w: true }, visited: false });
    }
  }
  const at = (x, y) => cells[y * cols + x];

  const stack = [at(0, 0)];
  stack[0].visited = true;

  const DIRS = [
    { dx: 0, dy: -1, wall: 'n', opp: 's' },
    { dx: 1, dy: 0, wall: 'e', opp: 'w' },
    { dx: 0, dy: 1, wall: 's', opp: 'n' },
    { dx: -1, dy: 0, wall: 'w', opp: 'e' },
  ];

  function shuffled(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const neighbors = shuffled(DIRS)
      .map(d => ({ d, n: (cur.x + d.dx >= 0 && cur.x + d.dx < cols && cur.y + d.dy >= 0 && cur.y + d.dy < rows) ? at(cur.x + d.dx, cur.y + d.dy) : null }))
      .filter(({ n }) => n && !n.visited);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const { d, n } = neighbors[0];
    cur.walls[d.wall] = false;
    n.walls[d.opp] = false;
    n.visited = true;
    stack.push(n);
  }

  // Strip the `visited` flag — callers don't need it.
  for (const c of cells) delete c.visited;
  return { cols, rows, cells, at: (x, y) => cells[y * cols + x] };
}
```

- [ ] **Step 2: Write a sanity-check script**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scripts/test-maze.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { generateMaze } from '../scene/maze.js';

test('generates correct grid size', () => {
  const m = generateMaze(10, 10);
  assert.equal(m.cells.length, 100);
  assert.equal(m.cols, 10);
  assert.equal(m.rows, 10);
});

test('all cells reachable (no islands)', () => {
  const m = generateMaze(16, 16, seededRng(42));
  const visited = new Set();
  const stack = [0];
  while (stack.length) {
    const idx = stack.pop();
    if (visited.has(idx)) continue;
    visited.add(idx);
    const cell = m.cells[idx];
    const { x, y } = cell;
    const neighbors = [
      { dx: 0, dy: -1, wall: 'n' },
      { dx: 1, dy: 0, wall: 'e' },
      { dx: 0, dy: 1, wall: 's' },
      { dx: -1, dy: 0, wall: 'w' },
    ];
    for (const { dx, dy, wall } of neighbors) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= m.cols || ny < 0 || ny >= m.rows) continue;
      if (!cell.walls[wall]) stack.push(ny * m.cols + nx);
    }
  }
  assert.equal(visited.size, m.cells.length, 'all cells must be reachable');
});

test('corners have exterior walls', () => {
  const m = generateMaze(5, 5);
  assert.equal(m.at(0, 0).walls.n, true);
  assert.equal(m.at(0, 0).walls.w, true);
  assert.equal(m.at(4, 0).walls.n, true);
  assert.equal(m.at(4, 0).walls.e, true);
});

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
}
```

- [ ] **Step 3: Run the sanity check**

```bash
node --test scripts/test-maze.mjs
```

Expected output: 3 tests, all pass. If any fail, fix the generator before proceeding.

- [ ] **Step 4: Commit**

```bash
git add scene/maze.js scripts/test-maze.mjs
git commit -m "feat: recursive-backtracking maze generator with sanity checks"
```

---

### Task 7: World builder (geometry from cells)

**Files:**
- Create: `scene/world.js`
- Modify: `main.js`

Goal: replace the test cube with an actual 3D maze rendered using a solid-color placeholder material. Camera is fixed for now.

- [ ] **Step 1: Write `scene/world.js`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scene/world.js`:

```js
import * as THREE from 'three';

// Build Three.js geometry from a cell grid.
// Returns { group, wallFaces, floorFaces, ceilingFaces, passageCells }.
// Each face record: { mesh, position: Vector3, normal: Vector3, surface: 'wall'|'floor'|'ceiling' }.
// Passage cells: array of { x, y, centerWorld: Vector3 } for camera navigation.

export const CELL = 10; // world units per cell

export function buildWorld(maze, placeholderMaterial) {
  const group = new THREE.Group();
  const wallFaces = [];
  const floorFaces = [];
  const ceilingFaces = [];
  const passageCells = [];

  const faceGeom = new THREE.PlaneGeometry(CELL, CELL);

  for (const cell of maze.cells) {
    const cx = (cell.x + 0.5) * CELL;
    const cz = (cell.y + 0.5) * CELL;

    // floor
    {
      const m = new THREE.Mesh(faceGeom, placeholderMaterial.floor);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, 0, cz);
      group.add(m);
      floorFaces.push({ mesh: m, position: m.position.clone(), normal: new THREE.Vector3(0, 1, 0), surface: 'floor' });
    }
    // ceiling
    {
      const m = new THREE.Mesh(faceGeom, placeholderMaterial.ceiling);
      m.rotation.x = Math.PI / 2;
      m.position.set(cx, CELL, cz);
      group.add(m);
      ceilingFaces.push({ mesh: m, position: m.position.clone(), normal: new THREE.Vector3(0, -1, 0), surface: 'ceiling' });
    }

    // walls (each wall is shared between two cells; we emit the face from one side only)
    // emit N wall if present
    if (cell.walls.n) {
      const m = new THREE.Mesh(faceGeom, placeholderMaterial.wall);
      m.position.set(cx, CELL / 2, cz - CELL / 2);
      m.rotation.y = Math.PI; // face into +z (i.e. into this cell)
      group.add(m);
      wallFaces.push({ mesh: m, position: m.position.clone(), normal: new THREE.Vector3(0, 0, 1), surface: 'wall' });
    }
    if (cell.walls.w) {
      const m = new THREE.Mesh(faceGeom, placeholderMaterial.wall);
      m.position.set(cx - CELL / 2, CELL / 2, cz);
      m.rotation.y = Math.PI / 2;
      group.add(m);
      wallFaces.push({ mesh: m, position: m.position.clone(), normal: new THREE.Vector3(1, 0, 0), surface: 'wall' });
    }
    // emit S/E walls only at the grid edge (otherwise they'd be duplicates of neighbor's N/W)
    if (cell.y === maze.rows - 1 && cell.walls.s) {
      const m = new THREE.Mesh(faceGeom, placeholderMaterial.wall);
      m.position.set(cx, CELL / 2, cz + CELL / 2);
      group.add(m);
      wallFaces.push({ mesh: m, position: m.position.clone(), normal: new THREE.Vector3(0, 0, -1), surface: 'wall' });
    }
    if (cell.x === maze.cols - 1 && cell.walls.e) {
      const m = new THREE.Mesh(faceGeom, placeholderMaterial.wall);
      m.position.set(cx + CELL / 2, CELL / 2, cz);
      m.rotation.y = -Math.PI / 2;
      group.add(m);
      wallFaces.push({ mesh: m, position: m.position.clone(), normal: new THREE.Vector3(-1, 0, 0), surface: 'wall' });
    }

    passageCells.push({ x: cell.x, y: cell.y, centerWorld: new THREE.Vector3(cx, CELL / 2, cz) });
  }

  return { group, wallFaces, floorFaces, ceilingFaces, passageCells };
}
```

- [ ] **Step 2: Update `main.js` to render the maze**

Replace the contents of `/Users/saragottlieb/WorkWorkWork/3dMaze/main.js` with:

```js
import * as THREE from 'three';
import { generateMaze } from './scene/maze.js';
import { buildWorld, CELL } from './scene/world.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08040f);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);

const MAZE_COLS = 16, MAZE_ROWS = 16;
const maze = generateMaze(MAZE_COLS, MAZE_ROWS);

const placeholder = {
  wall: new THREE.MeshBasicMaterial({ color: 0x3a2a4a, side: THREE.DoubleSide }),
  floor: new THREE.MeshBasicMaterial({ color: 0x1a0f22, side: THREE.DoubleSide }),
  ceiling: new THREE.MeshBasicMaterial({ color: 0x2a1a3a, side: THREE.DoubleSide }),
};

const world = buildWorld(maze, placeholder);
scene.add(world.group);

// Static overview camera so we can see the maze layout.
camera.position.set(MAZE_COLS * CELL / 2, MAZE_ROWS * CELL * 0.8, MAZE_ROWS * CELL * 1.2);
camera.lookAt(MAZE_COLS * CELL / 2, 0, MAZE_ROWS * CELL / 2);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function loop() {
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

loading.classList.add('hidden');
```

- [ ] **Step 3: Verify in browser**

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Expected: an aerial view of a 16×16 maze with dark floor, slightly lighter ceiling, and purple walls. Each page refresh produces a different maze layout.

Sanity checks to confirm:
- Corridors are visible as gaps in the walls.
- Perimeter is fully closed (no gaps at the edges).
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add scene/world.js main.js
git commit -m "feat: build 3D maze geometry from cell grid"
```

---

### Task 8: Camera drift

**Files:**
- Create: `scene/drift.js`
- Modify: `main.js`

Goal: put the camera inside the maze and drift forward at constant speed, turning at junctions.

- [ ] **Step 1: Write `scene/drift.js`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scene/drift.js`:

```js
import * as THREE from 'three';
import { CELL } from './world.js';

// Directions in maze-grid space (+x right, +y forward in world z).
const DIRS = [
  { dx: 0, dy: 1, yaw: 0, wall: 's' },            // south (+z)
  { dx: 1, dy: 0, yaw: -Math.PI / 2, wall: 'e' }, // east (+x)
  { dx: 0, dy: -1, yaw: Math.PI, wall: 'n' },     // north (-z)
  { dx: -1, dy: 0, yaw: Math.PI / 2, wall: 'w' }, // west (-x)
];

const TURN_DURATION = 0.6;  // seconds per 90° turn
const SPEED = 3.0;          // world units per second

export function createDrift(camera, maze, startX = 0, startY = 0) {
  let cx = startX, cy = startY;
  let dirIdx = pickValidDir(maze, cx, cy, -1);
  camera.position.set((cx + 0.5) * CELL, CELL / 2, (cy + 0.5) * CELL);
  camera.rotation.set(0, DIRS[dirIdx].yaw, 0);

  let turning = null; // { fromYaw, toYaw, t0 }
  let advanceTargetCell = null; // { cx, cy }
  advanceTargetCell = stepTarget(cx, cy, dirIdx);

  function pickValidDir(maze, x, y, avoidIdx) {
    const cell = maze.at(x, y);
    const options = [];
    for (let i = 0; i < 4; i++) {
      if (!cell.walls[DIRS[i].wall]) options.push(i);
    }
    if (options.length === 0) return avoidIdx;
    // Weighted pick: avoid immediate reverse (180°) unless it's the only option.
    const reverseIdx = (avoidIdx + 2) % 4;
    const nonReverse = options.filter(i => i !== reverseIdx);
    const pool = nonReverse.length ? nonReverse : options;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function stepTarget(x, y, idx) {
    return { cx: x + DIRS[idx].dx, cy: y + DIRS[idx].dy };
  }

  return function update(dt, nowSec) {
    if (turning) {
      const t = (nowSec - turning.t0) / TURN_DURATION;
      if (t >= 1) {
        camera.rotation.y = turning.toYaw;
        turning = null;
        advanceTargetCell = stepTarget(cx, cy, dirIdx);
      } else {
        camera.rotation.y = turning.fromYaw + (turning.toYaw - turning.fromYaw) * easeInOut(t);
      }
      return;
    }

    // advance forward
    const dir = DIRS[dirIdx];
    camera.position.x += dir.dx * SPEED * dt;
    camera.position.z += dir.dy * SPEED * dt;

    // arrived at next cell center?
    const targetX = (advanceTargetCell.cx + 0.5) * CELL;
    const targetZ = (advanceTargetCell.cy + 0.5) * CELL;
    if (Math.abs(camera.position.x - targetX) < 0.2 && Math.abs(camera.position.z - targetZ) < 0.2) {
      camera.position.x = targetX;
      camera.position.z = targetZ;
      cx = advanceTargetCell.cx;
      cy = advanceTargetCell.cy;

      const newDirIdx = pickValidDir(maze, cx, cy, dirIdx);
      if (newDirIdx !== dirIdx) {
        const fromYaw = DIRS[dirIdx].yaw;
        let toYaw = DIRS[newDirIdx].yaw;
        // Normalize turn to shortest path
        const diff = ((toYaw - fromYaw + Math.PI) % (2 * Math.PI)) - Math.PI;
        toYaw = fromYaw + diff;
        turning = { fromYaw, toYaw, t0: nowSec };
        dirIdx = newDirIdx;
      } else {
        advanceTargetCell = stepTarget(cx, cy, dirIdx);
      }
    }
  };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
```

- [ ] **Step 2: Wire drift into `main.js`**

Replace the camera section and loop of `main.js`:

```js
import * as THREE from 'three';
import { generateMaze } from './scene/maze.js';
import { buildWorld, CELL } from './scene/world.js';
import { createDrift } from './scene/drift.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08040f);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);

const MAZE_COLS = 16, MAZE_ROWS = 16;
const maze = generateMaze(MAZE_COLS, MAZE_ROWS);

const placeholder = {
  wall: new THREE.MeshBasicMaterial({ color: 0x3a2a4a, side: THREE.DoubleSide }),
  floor: new THREE.MeshBasicMaterial({ color: 0x1a0f22, side: THREE.DoubleSide }),
  ceiling: new THREE.MeshBasicMaterial({ color: 0x2a1a3a, side: THREE.DoubleSide }),
};

const world = buildWorld(maze, placeholder);
scene.add(world.group);

const updateDrift = createDrift(camera, maze, 0, 0);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now() / 1000;
function loop(nowMs) {
  const nowSec = nowMs / 1000;
  const dt = Math.min(0.05, nowSec - last);
  last = nowSec;
  updateDrift(dt, nowSec);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

loading.classList.add('hidden');
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:8080`. Expected: first-person camera moves forward through corridors, turns smoothly at junctions, eventually backtracks at dead-ends. No clipping through walls.

If the camera appears stuck or oscillates at a cell center, reduce the "arrived" threshold or verify the target cell math.

- [ ] **Step 4: Commit**

```bash
git add scene/drift.js main.js
git commit -m "feat: autonomous camera drift through maze"
```

---

### Task 9: Atmosphere (lighting + fog)

**Files:**
- Modify: `main.js`

Goal: add soft ambient, camera-attached point light, exponential fog. Walls should fade into darkness ahead of the camera.

- [ ] **Step 1: Update `main.js` to add lighting and fog**

Insert after `const scene = new THREE.Scene();`:

```js
scene.fog = new THREE.FogExp2(0x1a1028, 0.035);
```

Replace `scene.background = new THREE.Color(0x08040f);` with:

```js
scene.background = new THREE.Color(0x1a1028); // match fog color so edges fade seamlessly
```

After `scene.add(world.group);`, add:

```js
const ambient = new THREE.AmbientLight(0x2a2040, 0.6);
scene.add(ambient);

const camLight = new THREE.PointLight(0xffccee, 0.8, 30, 2);
camera.add(camLight);
scene.add(camera);
```

Note: `scene.add(camera)` is required so the point light (attached to the camera) participates in the scene. (Three.js allows a camera without being in the scene for rendering, but children of it won't be traversed unless it is.)

Since `MeshBasicMaterial` ignores lights, the point light only affects materials that respond to lighting. The placeholders ignore it, but the shader materials we add in Task 11 will sample the fog. For now the visible effect is that fog dims distant walls. The camera point light becomes visible once we switch materials in Task 11.

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8080`. Expected: corridors fade to a dark purple fog-color ~3 cells ahead. The overall palette should feel dusky and dreamy rather than stark black.

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: atmospheric fog and ambient lighting"
```

---

### Task 10: Image-to-square letterbox shader (shared between JPGs and WebMs)

**Files:**
- Create: `scene/letterboxMaterial.js`

Goal: a factory that returns a `ShaderMaterial` showing a texture (image or video) inside a 1:1 square face with contain + letterbox behavior. Used for both JPGs and WebMs.

- [ ] **Step 1: Write the shader material factory**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scene/letterboxMaterial.js`:

```js
import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <fog_vertex>
  }
  #include <fog_pars_vertex>
`;

const FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uAspect;    // texture width / height
  uniform vec3 uBgColor;

  #include <fog_pars_fragment>

  void main() {
    vec2 uv = vUv;
    // Face aspect is 1.0 (square). Compute contain-fit offset.
    vec2 fit;
    vec2 offset;
    if (uAspect > 1.0) {
      fit = vec2(1.0, 1.0 / uAspect);
      offset = vec2(0.0, (1.0 - fit.y) * 0.5);
    } else {
      fit = vec2(uAspect, 1.0);
      offset = vec2((1.0 - fit.x) * 0.5, 0.0);
    }

    vec2 mapped = (uv - offset) / fit;
    vec4 outCol;
    if (mapped.x < 0.0 || mapped.x > 1.0 || mapped.y < 0.0 || mapped.y > 1.0) {
      outCol = vec4(uBgColor, 1.0);
    } else {
      outCol = texture2D(uTex, mapped);
    }

    gl_FragColor = outCol;
    #include <fog_fragment>
  }
`;

export function createLetterboxMaterial(texture, aspect, bgColor = new THREE.Color(0x1a1028)) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTex: { value: texture },
      uAspect: { value: aspect },
      uBgColor: { value: bgColor },
      ...THREE.UniformsLib.fog,
    },
    fog: true,
    side: THREE.DoubleSide,
  });
  return mat;
}
```

This material respects the scene's fog (using Three.js's built-in fog chunks), composites the texture with letterbox inside a square face, and fills the letterbox area with the fog color so unused space blends with the distance haze.

- [ ] **Step 2: Visual smoke test — apply to the maze**

We'll temporarily test by feeding one JPG into the material, then revert. Edit `main.js` above the `const placeholder = ...` declaration to add a sanity test:

```js
// Temporary smoke test for letterbox shader
const loader = new THREE.TextureLoader();
const testTex = loader.load('./art/match/Match_01.jpg', () => {
  testTex.colorSpace = THREE.SRGBColorSpace;
});
```

Replace the `placeholder.wall` line:

```js
wall: (await import('./scene/letterboxMaterial.js')).createLetterboxMaterial(testTex, 1.5),
```

(Adjust aspect `1.5` later when we know real JPG aspects.)

Because this uses `await`, wrap the file body in an async IIFE or at the top level. Simplest: add `<script type="module">` behavior is already async-friendly. If top-level `await` gives trouble in Safari, instead move the whole `main.js` body into `async function main() { ... } main();`.

Wrap the body of `main.js` in:

```js
async function main() {
  // ... existing body, using the new import
}
main();
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:8080`. Expected: walls now display `Match_01.jpg` (letterboxed if aspect ≠ 1). Fog still works — far walls fade into the background color. If aspect ratio is misreported, walls may look stretched.

- [ ] **Step 4: Revert smoke test — walls back to placeholder**

Restore the placeholder wall material in `main.js`. Keep the letterbox shader module file; we'll use it properly in Task 11.

- [ ] **Step 5: Commit**

```bash
git add scene/letterboxMaterial.js main.js
git commit -m "feat: letterbox shader material (contain-fit) with fog integration"
```

---

### Task 11: Texture loading and per-face assignment

**Files:**
- Create: `scene/textures.js`
- Modify: `main.js`

Goal: load all art (JPGs as `Texture`, WebMs as `VideoTexture`) into a central registry, then assign every wall/floor/ceiling face a shader material drawing from the currently-selected pieces for its surface.

- [ ] **Step 1: Define the art catalog**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scene/catalog.js`:

```js
// Static catalog of all available pieces. Order here determines default thumbnail order in overlay.
// Each piece: { id, series, type: 'image'|'video', src, thumbSrc }.
// Aspect is populated lazily when the texture loads.

export const PIECES = [
  // Match
  { id: 'Match_01', series: 'Match', type: 'image', src: './art/match/Match_01.jpg' },
  { id: 'Match_07', series: 'Match', type: 'image', src: './art/match/Match_07.jpg' },
  { id: 'Match_13', series: 'Match', type: 'image', src: './art/match/Match_13.jpg' },
  // Me
  { id: 'Me_01', series: 'Me', type: 'image', src: './art/me/Me_01.jpg' },
  { id: 'Me_07', series: 'Me', type: 'image', src: './art/me/Me_07.jpg' },
  { id: 'Me_12', series: 'Me', type: 'image', src: './art/me/Me_12.jpg' },
  // Mother
  { id: 'Mother_01', series: 'Mother', type: 'image', src: './art/mother/Mother_01.jpg' },
  { id: 'Mother_04', series: 'Mother', type: 'image', src: './art/mother/Mother_04.jpg' },
  { id: 'Mother_10', series: 'Mother', type: 'image', src: './art/mother/Mother_10.jpg' },
  // Animated
  { id: 'Dreamstorm', series: 'Animated', type: 'video', src: './art/animated/Dreamstorm.webm' },
  { id: 'Hello_World', series: 'Animated', type: 'video', src: './art/animated/Hello_World.webm' },
  { id: 'May_Her_Memory_Be_a_Blessing', series: 'Animated', type: 'video', src: './art/animated/May_Her_Memory_Be_a_Blessing.webm' },
  { id: 'Pantheons_Playground', series: 'Animated', type: 'video', src: './art/animated/Pantheons_Playground.webm' },
  { id: 'Peter_and_Wendy', series: 'Animated', type: 'video', src: './art/animated/Peter_and_Wendy.webm' },
];

for (const p of PIECES) {
  p.thumbSrc = `./art/thumbs/${p.id}.jpg`;
}

export const SERIES = ['Match', 'Me', 'Mother', 'Animated'];

export const DEFAULT_SELECTIONS = {
  walls: ['Dreamstorm', 'May_Her_Memory_Be_a_Blessing', 'Peter_and_Wendy'],
  floor: ['Mother_01', 'Mother_04', 'Mother_10'],
  ceiling: ['Me_01', 'Me_07', 'Me_12'],
};
```

- [ ] **Step 2: Write `scene/textures.js`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/scene/textures.js`:

```js
import * as THREE from 'three';
import { PIECES } from './catalog.js';
import { createLetterboxMaterial } from './letterboxMaterial.js';

// Loads every piece and returns a map: id -> { texture, aspect, material?, video? }.
// `material` is created lazily per-face (we need unique uniforms per face).
// The `texture` is shared; each face's ShaderMaterial references it by uniform.

export async function loadAllPieces() {
  const loader = new THREE.TextureLoader();
  const registry = new Map();

  const imagePromises = PIECES
    .filter(p => p.type === 'image')
    .map(p => new Promise((resolve) => {
      loader.load(p.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = tex.image.naturalWidth / tex.image.naturalHeight;
        registry.set(p.id, { piece: p, texture: tex, aspect });
        resolve();
      }, undefined, () => {
        console.warn('failed to load', p.src);
        resolve();
      });
    }));

  const videoPromises = PIECES
    .filter(p => p.type === 'video')
    .map(p => new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = p.src;
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.addEventListener('loadedmetadata', () => {
        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = video.videoWidth / video.videoHeight;
        // Start playback. Browsers allow autoplay for muted+inline video.
        video.play().catch(() => {});
        registry.set(p.id, { piece: p, texture: tex, aspect, video });
        resolve();
      });
      video.addEventListener('error', () => {
        console.warn('failed to load', p.src);
        resolve();
      });
    }));

  await Promise.all([...imagePromises, ...videoPromises]);
  return registry;
}

// Given a face list and a selection array of piece IDs, assign each face a ShaderMaterial
// using one of the selected pieces. Uses a shuffled pool so pieces repeat evenly and
// consecutive faces rarely share an id.
export function assignFaceMaterials(faces, selectionIds, registry) {
  if (selectionIds.length === 0) return;
  const pool = [...selectionIds];
  let poolIdx = 0;
  let lastId = null;

  function nextId() {
    // Refill pool when exhausted
    if (poolIdx >= pool.length) {
      shuffleInPlace(pool);
      poolIdx = 0;
      // avoid lastId on first pick of a fresh pool
      if (pool.length > 1 && pool[0] === lastId) {
        [pool[0], pool[1]] = [pool[1], pool[0]];
      }
    }
    const id = pool[poolIdx++];
    lastId = id;
    return id;
  }

  shuffleInPlace(pool);

  for (const face of faces) {
    const id = nextId();
    const entry = registry.get(id);
    if (!entry) continue;
    // Dispose previous material if it exists
    if (face.mesh.material && face.mesh.material.dispose && face.mesh.material.userData.letterbox) {
      face.mesh.material.dispose();
    }
    const mat = createLetterboxMaterial(entry.texture, entry.aspect);
    mat.userData.letterbox = true;
    face.mesh.material = mat;
    face.assignedId = id;
  }
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
```

- [ ] **Step 3: Wire textures into `main.js`**

Update `main.js`:

```js
import * as THREE from 'three';
import { generateMaze } from './scene/maze.js';
import { buildWorld, CELL } from './scene/world.js';
import { createDrift } from './scene/drift.js';
import { loadAllPieces, assignFaceMaterials } from './scene/textures.js';
import { DEFAULT_SELECTIONS } from './scene/catalog.js';

async function main() {
  const canvas = document.getElementById('canvas');
  const loading = document.getElementById('loading');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1028);
  scene.fog = new THREE.FogExp2(0x1a1028, 0.035);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);

  const MAZE_COLS = 16, MAZE_ROWS = 16;
  const maze = generateMaze(MAZE_COLS, MAZE_ROWS);

  // placeholders while assets load
  const placeholder = {
    wall: new THREE.MeshBasicMaterial({ color: 0x3a2a4a, side: THREE.DoubleSide }),
    floor: new THREE.MeshBasicMaterial({ color: 0x1a0f22, side: THREE.DoubleSide }),
    ceiling: new THREE.MeshBasicMaterial({ color: 0x2a1a3a, side: THREE.DoubleSide }),
  };
  const world = buildWorld(maze, placeholder);
  scene.add(world.group);

  const ambient = new THREE.AmbientLight(0x2a2040, 0.6);
  scene.add(ambient);
  const camLight = new THREE.PointLight(0xffccee, 0.8, 30, 2);
  camera.add(camLight);
  scene.add(camera);

  const updateDrift = createDrift(camera, maze, 0, 0);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now() / 1000;
  function loop(nowMs) {
    const nowSec = nowMs / 1000;
    const dt = Math.min(0.05, nowSec - last);
    last = nowSec;
    updateDrift(dt, nowSec);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Load assets and apply default textures
  const registry = await loadAllPieces();
  assignFaceMaterials(world.wallFaces, DEFAULT_SELECTIONS.walls, registry);
  assignFaceMaterials(world.floorFaces, DEFAULT_SELECTIONS.floor, registry);
  assignFaceMaterials(world.ceilingFaces, DEFAULT_SELECTIONS.ceiling, registry);

  loading.classList.add('hidden');

  // Expose for Task 14 wiring
  window.__maze = { world, registry };
}

main();
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:8080`. Expected:
- Initial render: placeholder-colored maze with camera drifting through
- After ~1–2 seconds: walls show animated GIFs (Dreamstorm, May_Her_Memory_Be_a_Blessing, Peter_and_Wendy), floor shows Mother pieces, ceiling shows Me pieces
- No stretched textures — aspect-ratios letterboxed against the dark fog color
- Fog still fades distant walls

If you see stretching, check the `uAspect` uniform wiring. If videos are static (first frame only), check that `video.play()` was called and browser allows muted autoplay.

- [ ] **Step 5: Commit**

```bash
git add scene/catalog.js scene/textures.js main.js
git commit -m "feat: load art assets and assign textures to maze faces"
```

---

### Task 12: Config overlay — HTML structure + CSS

**Files:**
- Modify: `index.html`
- Create: `ui/config.css`
- Create: `ui/config.js`

Goal: render the bottom-drawer overlay with tabs and thumbnails. Initially wired with static state (no interactivity — that's Task 13).

- [ ] **Step 1: Write `ui/config.css`**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/ui/config.css`:

```css
.cfg-root { font-family: system-ui, sans-serif; color: #fff; position: fixed; inset: 0; pointer-events: none; z-index: 10; }
.cfg-root button { font-family: inherit; cursor: pointer; pointer-events: auto; }

.cfg-pill {
  position: absolute;
  bottom: 14px; left: 50%; transform: translateX(-50%);
  background: rgba(20,15,30,0.85);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  pointer-events: auto;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.cfg-pill:hover { background: rgba(35,25,50,0.9); }

.cfg-drawer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: rgba(16,10,26,0.95);
  border-top: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(12px);
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transform: translateY(100%);
  transition: transform 0.25s ease;
}
.cfg-drawer.open { transform: translateY(0); }

.cfg-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 0 12px;
  align-items: center;
}
.cfg-tab {
  padding: 10px 16px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border-bottom: 2px solid transparent;
}
.cfg-tab.active { color: #fff; border-bottom-color: #b89ad8; }
.cfg-close {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 18px;
  padding: 8px 12px;
}
.cfg-close:hover { color: #fff; }

.cfg-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.cfg-series { margin-bottom: 14px; }
.cfg-series-header {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  margin-bottom: 6px;
}
.cfg-series-header .count { color: #b89ad8; }

.cfg-thumbs { display: flex; gap: 6px; flex-wrap: wrap; }
.cfg-thumb {
  width: 44px; height: 44px;
  border-radius: 4px;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255,255,255,0.15);
  opacity: 0.4;
  cursor: pointer;
  position: relative;
  padding: 0;
  transition: opacity 0.15s ease, border-color 0.15s ease;
}
.cfg-thumb:hover { opacity: 0.7; }
.cfg-thumb.selected {
  opacity: 1;
  border-color: #b89ad8;
  box-shadow: 0 0 0 1px rgba(184,154,216,0.5);
}
.cfg-thumb.selected::after {
  content: "";
  position: absolute; top: 3px; right: 3px;
  width: 8px; height: 8px; border-radius: 4px;
  background: #b89ad8; box-shadow: 0 0 4px rgba(184,154,216,0.8);
}
.cfg-thumb.disabled { cursor: not-allowed; opacity: 1; }

.cfg-footer {
  padding: 8px 16px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.cfg-icon-btn {
  width: 30px; height: 30px;
  border-radius: 15px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
}
.cfg-icon-btn:hover { background: rgba(255,255,255,0.14); }

@media (max-width: 600px) {
  .cfg-thumb { width: 38px; height: 38px; }
  .cfg-tab { padding: 10px 12px; }
}
```

- [ ] **Step 2: Write `ui/config.js` with static rendering only (no interactivity yet)**

Write `/Users/saragottlieb/WorkWorkWork/3dMaze/ui/config.js`:

```js
import { PIECES, SERIES, DEFAULT_SELECTIONS } from '../scene/catalog.js';

// Initial selection state — will be mutated by user clicks in Task 13.
export const state = {
  walls: new Set(DEFAULT_SELECTIONS.walls),
  floor: new Set(DEFAULT_SELECTIONS.floor),
  ceiling: new Set(DEFAULT_SELECTIONS.ceiling),
};

export function mountOverlay(root, { onSelectionChange, onMute, onFullscreen, audioAvailable }) {
  root.innerHTML = '';
  root.className = 'cfg-root';

  const pill = document.createElement('button');
  pill.className = 'cfg-pill';
  pill.textContent = 'Configure';
  root.appendChild(pill);

  const drawer = document.createElement('div');
  drawer.className = 'cfg-drawer';
  root.appendChild(drawer);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'cfg-tabs';
  const TABS = [
    { id: 'walls', label: 'Walls' },
    { id: 'floor', label: 'Floor' },
    { id: 'ceiling', label: 'Ceiling' },
  ];
  let activeTab = 'walls';
  const tabButtons = TABS.map(t => {
    const btn = document.createElement('button');
    btn.className = 'cfg-tab' + (t.id === activeTab ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      activeTab = t.id;
      tabButtons.forEach(b => b.classList.toggle('active', b.textContent.toLowerCase() === activeTab));
      renderBody();
    });
    tabs.appendChild(btn);
    return btn;
  });
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cfg-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
  tabs.appendChild(closeBtn);
  drawer.appendChild(tabs);

  // Body
  const body = document.createElement('div');
  body.className = 'cfg-body';
  drawer.appendChild(body);

  function renderBody() {
    body.innerHTML = '';
    const selectedSet = state[activeTab];
    for (const series of SERIES) {
      const group = document.createElement('div');
      group.className = 'cfg-series';
      const piecesInSeries = PIECES.filter(p => p.series === series);
      const count = piecesInSeries.filter(p => selectedSet.has(p.id)).length;
      group.innerHTML = `<div class="cfg-series-header"><span>${series}</span><span class="count">${count} selected</span></div>`;
      const thumbRow = document.createElement('div');
      thumbRow.className = 'cfg-thumbs';
      for (const piece of piecesInSeries) {
        const thumb = document.createElement('button');
        thumb.className = 'cfg-thumb' + (selectedSet.has(piece.id) ? ' selected' : '');
        thumb.style.backgroundImage = `url('${piece.thumbSrc}')`;
        thumb.title = piece.id;
        thumb.dataset.pieceId = piece.id;
        thumb.addEventListener('click', () => {
          const willDeselect = selectedSet.has(piece.id);
          if (willDeselect && selectedSet.size === 1) return; // guard: min 1
          if (willDeselect) selectedSet.delete(piece.id);
          else selectedSet.add(piece.id);
          renderBody();
          onSelectionChange?.(activeTab, Array.from(selectedSet));
        });
        thumbRow.appendChild(thumb);
      }
      group.appendChild(thumbRow);
      body.appendChild(group);
    }
  }
  renderBody();

  // Footer: mute + fullscreen
  const footer = document.createElement('div');
  footer.className = 'cfg-footer';

  let muted = true;
  const muteBtn = document.createElement('button');
  muteBtn.className = 'cfg-icon-btn';
  muteBtn.textContent = '♪';
  muteBtn.title = 'mute/unmute';
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.style.opacity = muted ? '0.5' : '1';
    onMute?.(muted);
  });
  muteBtn.style.opacity = '0.5';
  if (!audioAvailable) muteBtn.style.display = 'none';
  footer.appendChild(muteBtn);

  const fsBtn = document.createElement('button');
  fsBtn.className = 'cfg-icon-btn';
  fsBtn.textContent = '⛶';
  fsBtn.title = 'fullscreen';
  fsBtn.addEventListener('click', () => onFullscreen?.());
  footer.appendChild(fsBtn);

  drawer.appendChild(footer);

  // Pill toggles drawer
  pill.addEventListener('click', () => {
    drawer.classList.add('open');
  });
}
```

- [ ] **Step 3: Mount overlay in `main.js`**

At the end of `main.js` (inside `main()`, after `loading.classList.add('hidden');`), add:

```js
  const { mountOverlay, state: cfgState } = await import('./ui/config.js');
  mountOverlay(document.getElementById('overlay-root'), {
    onSelectionChange: (surface, ids) => {
      const faces = {
        walls: world.wallFaces,
        floor: world.floorFaces,
        ceiling: world.ceilingFaces,
      }[surface];
      assignFaceMaterials(faces, ids, registry);
    },
    onMute: (m) => { /* Task 14 */ },
    onFullscreen: () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen?.();
      else document.exitFullscreen?.();
    },
    audioAvailable: false, // set true once Task 15 ships audio
  });
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:8080`. Expected:
- The maze renders and drifts as before
- A "Configure" pill appears at bottom-center
- Clicking it opens the drawer with tabs Walls/Floor/Ceiling
- Each tab shows all 14 pieces as thumbnails grouped by series
- Selected thumbnails (per defaults) are highlighted; others dim
- Clicking a thumbnail toggles selection and live-retextures the maze
- Fullscreen button enters fullscreen

- [ ] **Step 5: Commit**

```bash
git add ui/config.css ui/config.js main.js index.html
git commit -m "feat: config overlay with tabs, thumbnails, and live retexture"
```

---

### Task 13: Live retexture verification

This task confirms Task 12's wiring by manually exercising the overlay.

- [ ] **Step 1: Run + interact**

```bash
python3 -m http.server 8080
```

- [ ] **Step 2: Verify each behavior**

Open `http://localhost:8080`.

- [ ] Click Configure pill — drawer slides up
- [ ] Walls tab active by default with 3 Animated GIFs selected (Dreamstorm, May_Her_Memory_Be_a_Blessing, Peter_and_Wendy)
- [ ] Click an unselected wall thumbnail (e.g. Match_01) — that piece should appear on some walls as the camera drifts
- [ ] Click the same thumbnail again to deselect — walls retexture; the piece disappears
- [ ] Try to deselect all selected walls one-by-one — the last selection should refuse to deselect (count stays at 1)
- [ ] Switch to Floor tab — Mother pieces selected by default; confirm floor retextures when you toggle
- [ ] Switch to Ceiling tab — Me pieces selected by default; confirm
- [ ] Close with × button; reopen with pill
- [ ] Click fullscreen button; confirm fullscreen toggles
- [ ] No console errors throughout

If any fail, fix before proceeding.

- [ ] **Step 3: Commit (nothing changed, or fix and commit fixes)**

If fixes were required:
```bash
git commit -am "fix: <describe>"
```

Otherwise skip this step.

---

### Task 14: Audio track (conditional)

**Files:**
- Modify: `main.js`

Goal: if `audio/ambient.mp3` exists, load it and wire the mute button. If it doesn't, hide the mute button.

- [ ] **Step 1: Probe for the audio file**

In `main.js`, before mounting the overlay, add:

```js
  const audioAvailable = await fetch('./audio/ambient.mp3', { method: 'HEAD' })
    .then(r => r.ok)
    .catch(() => false);

  let audioEl = null;
  if (audioAvailable) {
    audioEl = new Audio('./audio/ambient.mp3');
    audioEl.loop = true;
    audioEl.volume = 0.5;
  }
```

Update the overlay mount:

```js
  mountOverlay(document.getElementById('overlay-root'), {
    onSelectionChange: (surface, ids) => { /* as before */ },
    onMute: (muted) => {
      if (!audioEl) return;
      if (muted) audioEl.pause();
      else audioEl.play().catch(() => {});
    },
    onFullscreen: () => { /* as before */ },
    audioAvailable,
  });
```

- [ ] **Step 2: Verify without an audio file**

Ensure `audio/ambient.mp3` does **not** exist yet.

```bash
ls audio/ 2>/dev/null || echo "(no audio dir yet)"
```

Open `http://localhost:8080`. Expected: mute button (♪) is hidden from the footer. No console errors from the fetch probe.

- [ ] **Step 3: (Optional) Drop in an audio track and verify**

If Sara has a track:
```bash
mkdir -p audio
cp path/to/ambient.mp3 audio/ambient.mp3
```

Reload the page. Expected:
- Mute button now appears (dimmed because muted by default)
- Click it: button brightens, music begins playing (may need first click to satisfy browser autoplay policies)
- Click again: music pauses

- [ ] **Step 4: Commit**

```bash
git add main.js
git commit -m "feat: conditional ambient audio with mute toggle"
```

---

### Task 15: Visual polish pass

- [ ] **Step 1: Tune fog color and density**

Open `http://localhost:8080`. Observe the fog.

- If fog feels too aggressive (walls disappear too close), reduce `FogExp2` density from `0.035` to `0.025`.
- If too faint (maze walls visible too far, loses the dreamy feel), raise to `0.045`.
- Match the scene background to the fog color exactly, otherwise there's a visible seam at the far plane.

Iterate values in `main.js`. Commit when it feels right.

- [ ] **Step 2: Tune camera drift speed**

Observe how fast the camera moves through corridors.

- Feels frantic? Reduce `SPEED` in `scene/drift.js` from `3.0` to `2.0`.
- Feels sluggish? Raise to `4.0`.

Commit when it feels right.

- [ ] **Step 3: Tune letterbox background color**

The letterbox color should blend with fog. Currently both use `0x1a1028`.

If letterbox bars look darker or lighter than surrounding fog, adjust the `bgColor` arg to `createLetterboxMaterial()` in `scene/textures.js` to match.

- [ ] **Step 4: Commit polish changes**

```bash
git commit -am "polish: fog, speed, and letterbox tuning"
```

---

### Task 16: Mobile check

- [ ] **Step 1: Test on phone**

From the same Wi-Fi network, find your Mac's local IP:

```bash
ipconfig getifaddr en0
```

On your phone's browser, visit `http://<that-ip>:8080`.

- [ ] Scene loads and drifts
- [ ] Overlay is usable with touch (tap targets reasonable size)
- [ ] Fullscreen button works (note: on iOS Safari, fullscreen has some quirks — the video might go fullscreen instead of the page; acceptable MVP behavior)
- [ ] Framerate is watchable (30+ fps)

If mobile framerate is poor:
- Try reducing `MAZE_COLS` and `MAZE_ROWS` to `12` in `main.js` on narrow viewports. A concrete way:
  ```js
  const MOBILE = window.innerWidth < 700;
  const MAZE_COLS = MOBILE ? 12 : 16;
  const MAZE_ROWS = MOBILE ? 12 : 16;
  ```

- [ ] **Step 2: Commit if any mobile-specific fix**

```bash
git commit -am "fix: smaller maze on narrow viewports for mobile performance"
```

---

### Task 17: GitHub repo + Cloudflare Pages setup

This task is Sara-run with my guidance — I'll give her exact commands and Cloudflare UI steps.

- [ ] **Step 1: Create a new GitHub repo**

Ask Sara to create a new repo on github.com (private or public) named `3dmaze`. Do not initialize with a README (we have one locally).

- [ ] **Step 2: Push local repo to GitHub**

```bash
git remote add origin git@github.com:<sara-username>/3dmaze.git
git push -u origin main
```

Expected: `main` branch pushed, all commits visible on GitHub.

- [ ] **Step 3: Create Cloudflare Pages project**

Via Cloudflare dashboard (Pages → Create a project → Connect to Git):

- Select the `3dmaze` repo.
- **Framework preset:** None
- **Build command:** (leave blank)
- **Build output directory:** `/`
- Click Save and Deploy.

First deploy takes ~1 minute. Once done, Cloudflare shows a URL like `https://3dmaze-abc.pages.dev`.

- [ ] **Step 4: Visit the deployed URL**

Expected: identical behavior to `http://localhost:8080`. No CORS or loading issues.

If WebMs or JPGs 404, check that they were committed:
```bash
git ls-files art/ | head
```

- [ ] **Step 5: Document the URL in README.md**

Add a `## Deployed URL` section to `README.md` with the Cloudflare URL.

```bash
git commit -am "docs: record deployment URL"
git push
```

---

### Task 18: Squarespace embed

- [ ] **Step 1: Paste the embed snippet into Squarespace**

Ask Sara to:

1. Open her Squarespace site editor on the intended page.
2. Add a Code block where the maze should appear.
3. Paste:

```html
<iframe
  src="https://<sara-cloudflare-url>.pages.dev"
  style="width: 100%; height: 80vh; border: 0; display: block;"
  allowfullscreen
  allow="autoplay; fullscreen">
</iframe>
```

(Replace `<sara-cloudflare-url>` with the actual URL from Task 17.)

4. Save the page. Preview on Squarespace.

- [ ] **Step 2: Verify embed behavior**

On the Squarespace preview:
- Maze appears embedded in the page
- Drift, drawer, thumbnails all work as on the standalone URL
- Fullscreen button expands the iframe to cover the viewport
- Videos autoplay (confirmed by the Animated wall pieces actually playing)

Common pitfalls:
- **Videos don't play:** Missing `allow="autoplay"` on the iframe, or Squarespace is double-encoding the attribute. Verify the raw HTML in the Code block.
- **Fullscreen doesn't work:** Missing `allowfullscreen` attribute.
- **Cut off by Squarespace layout:** Adjust `height: 80vh` to a smaller value, or use a Squarespace full-width section.

- [ ] **Step 3: Record any adjustments in README.md**

If iframe height or other attributes needed tweaking, capture the working snippet in README so it's reproducible.

```bash
git commit -am "docs: record working Squarespace embed snippet"
git push
```

---

### Task 19: Browser matrix QA

- [ ] **Step 1: Test on desktop Chrome, Safari, Firefox**

On each browser, visit the Squarespace page:
- Scene loads under 3 seconds
- Drift is smooth (30+ fps)
- Drawer opens, thumbnails load, live retexture works
- Fullscreen works
- No console errors

- [ ] **Step 2: Test on iOS Safari and Android Chrome**

On Squarespace page:
- Scene loads (may take longer on cellular)
- Drift is watchable (~30 fps target; acceptable even if slightly lower)
- Drawer is usable via touch
- Tap targets (thumbnails) aren't too small — thumbs should be at least 40×40 CSS px

- [ ] **Step 3: Capture any issues as follow-up notes in README.md**

Tracked items become the short-term backlog for polish rounds. If any are release-blocking, fix before declaring shipped.

---

### Task 20: Final sweep

- [ ] **Step 1: Visual inspection of all 14 pieces**

Open the site. Cycle through each thumbnail for each surface — confirm each image/video loads and renders correctly. Watch for:
- Wrong aspect ratio (likely a texture-loading bug)
- Missing piece (404 in the console)
- Broken thumbnail (404 for `art/thumbs/<id>.jpg`)

- [ ] **Step 2: Confirm `_originals/` is not committed**

```bash
git ls-files | grep _originals
```

Expected: empty output. If anything shows up, add it to `.gitignore` and remove from git history.

- [ ] **Step 3: Confirm final bundle size**

```bash
du -sh art/
```

Expected: under 15 MB (mostly the WebMs). If much larger, re-run conversions with higher CRF.

- [ ] **Step 4: Tag a release**

```bash
git tag -a v1.0 -m "first release"
git push --tags
```

- [ ] **Step 5: Final commit**

If anything else was tweaked during the sweep:
```bash
git commit -am "chore: final release sweep"
git push
```

Declare the project shipped.

---

## Self-Review

**Spec coverage check:**

- Autonomous drift → Task 8
- Dreamy atmosphere → Tasks 9, 15
- Curation, not exploration → Tasks 12, 13
- Ambient audio opt-in → Task 14
- Fullscreen available → Task 12
- Content model / series / image-level multi-select → Tasks 11, 12
- Texture assignment with shuffle → Task 11 (`assignFaceMaterials`)
- Empty-selection guard → Task 12 (inline check in thumbnail click handler)
- Image fit contain+letterbox → Task 10 (shader)
- Maze 16×16, medium, recursive backtracking → Tasks 6, 7
- Cell dimensions 10×10 → Task 7 (`world.js` constant)
- Camera smooth turns, constant speed, dead-end 180° → Task 8
- Lighting + fog → Task 9
- JPG `MeshBasicMaterial` — deviation: spec says MeshBasicMaterial but we use ShaderMaterial for letterbox. Shader also ignores real lights (like MeshBasicMaterial) so behavior is equivalent. Fog is handled correctly in the shader.
- WebM autoplay muted loop playsinline → Task 11 (`loadAllPieces`)
- Config overlay bottom drawer with tabs → Task 12
- Live retexture → Task 12 (`onSelectionChange`)
- Defaults (Walls: Dreamstorm + May_Her_Memory_Be_a_Blessing + Peter_and_Wendy; Floor: Mother; Ceiling: Me) → Task 11 (`DEFAULT_SELECTIONS`)
- Responsive narrow viewport → Task 12 CSS media query; Task 16 maze-size fallback
- No persistence → default; nothing written to localStorage anywhere
- Zero-build, Three.js importmap → Tasks 5, 11
- Asset prep JPG resize, GIF→WebM, thumbnails → Tasks 2, 3, 4
- Deployment GitHub + Cloudflare Pages + Squarespace iframe → Tasks 17, 18
- Manual test matrix → Task 19
- Performance targets → implicit check during Tasks 15, 16, 19

**Placeholder scan:** no "TBD", "TODO", or "implement later". Every step has concrete code or a concrete verify instruction.

**Type consistency:** face records have `{ mesh, position, normal, surface }` consistently in `world.js` and `textures.js`. `registry.get(id)` always returns `{ piece, texture, aspect, video? }`.

**Scope check:** single implementation plan for one subsystem (the maze site). No decomposition needed.

**Known small deviations from spec (accepted):**
- Spec says `MeshBasicMaterial` for JPG faces; plan uses a custom `ShaderMaterial` to support letterbox composite. Equivalent visual outcome, better fidelity to the "nothing is cropped" spec requirement.
- Spec says point light is `subtle`; since we render with `ShaderMaterial` that ignores point lights (by design — art should read accurately regardless of lighting), the point light's contribution is effectively zero. Keeping the light in the scene preserves the option to add light-responsive details (e.g. a subtle dust-particle system) later.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-3dmaze-implementation.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — I execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
