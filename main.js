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
