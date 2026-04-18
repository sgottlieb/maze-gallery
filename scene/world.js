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
