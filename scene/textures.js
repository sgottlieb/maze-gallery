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
// using one of the selected pieces. Spatially aware — avoids reusing the same piece on
// any face that's adjacent (within ADJ_DIST of the same-surface orientation) to an already-
// assigned face.
//
// How it works:
//   1. Reset assignedId on all faces (live retexture path).
//   2. Iterate faces in random order so coverage isn't biased by grid order.
//   3. For each face, look at already-assigned faces nearby (within ADJ_DIST and with a
//      normal that's similarly oriented — dot > 0.5), collect their ids into a "forbidden"
//      set, and pick from the remaining selection ids. If none remain (which happens when
//      selection is small relative to the neighborhood), fall back to any id.
export function assignFaceMaterials(faces, selectionIds, registry) {
  if (selectionIds.length === 0) return;

  const ADJ_DIST_SQ = 15 * 15; // slightly more than CELL (10) — catches along-corridor and diagonal floor neighbors

  // Reset prior assignments so neighbor checks only see new ones.
  for (const face of faces) face.assignedId = null;

  // Process in random order for unbiased distribution.
  const order = faces.map((_, i) => i);
  shuffleInPlace(order);

  for (const idx of order) {
    const face = faces[idx];

    // Collect ids already assigned to spatially adjacent, similarly oriented faces.
    const forbidden = new Set();
    for (const other of faces) {
      if (other === face || !other.assignedId) continue;
      const dx = face.position.x - other.position.x;
      const dy = face.position.y - other.position.y;
      const dz = face.position.z - other.position.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > ADJ_DIST_SQ) continue;
      const dot = face.normal.x * other.normal.x + face.normal.y * other.normal.y + face.normal.z * other.normal.z;
      if (dot < 0.5) continue;
      forbidden.add(other.assignedId);
    }

    const candidates = selectionIds.filter(id => !forbidden.has(id));
    const pool = candidates.length > 0 ? candidates : selectionIds;
    const id = pool[Math.floor(Math.random() * pool.length)];

    const entry = registry.get(id);
    if (!entry) continue;
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
