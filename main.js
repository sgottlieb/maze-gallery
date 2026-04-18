import * as THREE from 'three';
import { generateMaze } from './scene/maze.js';
import { buildWorld, CELL } from './scene/world.js';
import { createDrift } from './scene/drift.js';
import { loadAllPieces, assignFaceMaterials } from './scene/textures.js';
import { DEFAULT_SELECTIONS } from './scene/catalog.js';

async function main() {
  const canvas = document.getElementById('canvas');
  const loading = document.getElementById('loading');

  // Mobile: smaller maze, 1x pixel ratio, no AA, high-perf GPU preference,
  // tighter camera far plane (fog hides anything past ~60 units anyway so
  // rendering out to 200 is wasted fragment work).
  const IS_MOBILE = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !IS_MOBILE,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1 : 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1028);
  scene.fog = new THREE.FogExp2(0x1a1028, 0.035);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, IS_MOBILE ? 60 : 200);

  const MAZE_SIZE = IS_MOBILE ? 10 : 16;
  const MAZE_COLS = MAZE_SIZE, MAZE_ROWS = MAZE_SIZE;
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

  // Optional ambient audio — HEAD probe avoids a download if missing.
  const audioAvailable = await fetch('./audio/ambient.mp3', { method: 'HEAD' })
    .then(r => r.ok)
    .catch(() => false);

  let audioEl = null;
  if (audioAvailable) {
    audioEl = new Audio('./audio/ambient.mp3');
    audioEl.loop = true;
    audioEl.volume = 0.5;
  }

  const { mountOverlay } = await import('./ui/config.js');
  mountOverlay(document.getElementById('overlay-root'), {
    onSelectionChange: (surface, ids) => {
      const facesBySurface = {
        walls: world.wallFaces,
        floor: world.floorFaces,
        ceiling: world.ceilingFaces,
      };
      const faces = facesBySurface[surface];
      if (faces) assignFaceMaterials(faces, ids, registry);
    },
    onMute: (muted) => {
      if (!audioEl) return;
      if (muted) audioEl.pause();
      else audioEl.play().catch(() => {});
    },
    onFullscreen: () => {
      const el = document.documentElement;
      try {
        if (!document.fullscreenElement) {
          el.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      } catch (_) { /* browser refused — ignore */ }
    },
    audioAvailable,
  });

  // Exposed for Task 12 wiring
  window.__maze = { world, registry };
}

main();
