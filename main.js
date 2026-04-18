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
