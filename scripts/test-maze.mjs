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
