// Recursive-backtracking maze generator.
// Returns a grid of cells where each cell has { x, y, walls: {n,e,s,w} }.
// `walls[dir] === true` means there is a wall there.
// The maze is surrounded by solid perimeter walls (ensured by construction).

export function generateMaze(cols, rows, rng = Math.random) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, walls: { n: true, e: true, s: true, w: true }, visited: false });
    }
  }
  const at = (x, y) => cells[y * cols + x];

  const stack = [at(0, 0)];
  stack[0].visited = true;

  const DIRS = [
    { dx: 0, dy: -1, wall: 'n', opp: 's' },
    { dx: 1, dy: 0, wall: 'e', opp: 'w' },
    { dx: 0, dy: 1, wall: 's', opp: 'n' },
    { dx: -1, dy: 0, wall: 'w', opp: 'e' },
  ];

  function shuffled(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const neighbors = shuffled(DIRS)
      .map(d => ({ d, n: (cur.x + d.dx >= 0 && cur.x + d.dx < cols && cur.y + d.dy >= 0 && cur.y + d.dy < rows) ? at(cur.x + d.dx, cur.y + d.dy) : null }))
      .filter(({ n }) => n && !n.visited);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const { d, n } = neighbors[0];
    cur.walls[d.wall] = false;
    n.walls[d.opp] = false;
    n.visited = true;
    stack.push(n);
  }

  // Strip the `visited` flag — callers don't need it.
  for (const c of cells) delete c.visited;
  return { cols, rows, cells, at: (x, y) => cells[y * cols + x] };
}
