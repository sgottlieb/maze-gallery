import * as THREE from 'three';
import { generateMaze } from './scene/maze.js';
import { buildWorld, CELL } from './scene/world.js';
import { createDrift } from './scene/drift.js';
import { createLetterboxMaterial } from './scene/letterboxMaterial.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1028); // match fog color so edges fade seamlessly
scene.fog = new THREE.FogExp2(0x1a1028, 0.035);
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

loading.classList.add('hidden');

// Smoke test for letterbox shader — confirms GLSL compiles.
// Does not attach to any face yet; Task 11 wires it properly.
(() => {
  const testTex = new THREE.TextureLoader().load('./art/match/Match_01.jpg');
  const _testMat = createLetterboxMaterial(testTex, 1.0);
  _testMat.dispose();
})();
