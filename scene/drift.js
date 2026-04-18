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
