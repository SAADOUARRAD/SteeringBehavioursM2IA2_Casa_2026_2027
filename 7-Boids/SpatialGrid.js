/** Grille spatiale pour limiter les voisins examinés par chaque boid. */
class SpatialGrid {
  constructor(cellSize = 120) {
    this.cellSize = Math.max(1, cellSize);
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(boid) {
    const key = this.keyFor(boid.pos.x, boid.pos.y);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(boid);
  }

  query(position, radius) {
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);
    const candidates = [];

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cell = this.cells.get(`${x},${y}`);
        if (cell) candidates.push(...cell);
      }
    }
    return candidates.filter((boid) => p5.Vector.dist(position, boid.pos) <= radius);
  }

  keyFor(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
