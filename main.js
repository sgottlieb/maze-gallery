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
    onMute: (_muted) => { /* Task 14 will wire audio */ },
    onFullscreen: () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen?.();
      else document.exitFullscreen?.();
    },
    audioAvailable: false,
  });

  // Exposed for Task 12 wiring
  window.__maze = { world, registry };
}

main();
