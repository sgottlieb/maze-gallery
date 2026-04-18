import * as THREE from 'three';
import { PIECES } from './catalog.js';
import { createLetterboxMaterial } from './letterboxMaterial.js';

// Loads every piece and returns a map: id -> { piece, texture, aspect, video? }.
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
    if (poolIdx >= pool.length) {
      shuffleInPlace(pool);
      poolIdx = 0;
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
    // Dispose previous material if it was a letterbox ShaderMaterial
    if (face.mesh.material && face.mesh.material.userData && face.mesh.material.userData.letterbox) {
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
