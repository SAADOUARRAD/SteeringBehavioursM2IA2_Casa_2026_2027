import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vec2(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { this.x /= n; this.y /= n; return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() { const m = this.mag(); if (m) this.div(m); return this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { if (this.mag() > n) this.setMag(n); return this; }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return new Vec2(a.x - b.x, a.y - b.y); }
  static dist(a, b) { return Vec2.sub(a, b).mag(); }
  static random2D() { return new Vec2(1, 0); }
}

Object.assign(globalThis, {
  p5: { Vector: Vec2 },
  createVector: (x = 0, y = 0) => new Vec2(x, y),
  random: (a = 1, b) => b === undefined ? a * 0.5 : a + (b - a) * 0.5,
  width: 800,
  height: 600,
  constrain: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  map: (v, a, b, c, d) => c + (v - a) * (d - c) / (b - a),
  PI: Math.PI,
  CLOSE: 'close'
});

for (const name of ['push', 'pop', 'stroke', 'strokeWeight', 'fill', 'noFill', 'noStroke', 'line', 'imageMode', 'translate', 'rotate', 'image', 'beginShape', 'vertex', 'endShape', 'point', 'triangle', 'ellipse', 'rect']) {
  globalThis[name] = () => {};
}

const boidSource = readFileSync(join(root, 'boids.js'), 'utf8')
  .replace(/^class Boid/m, 'globalThis.Boid = class Boid');
new Function(boidSource)();
const Boid = globalThis.Boid;
const obstacleSource = readFileSync(join(root, 'obstacle.js'), 'utf8')
  .replace(/^class Obstacle/m, 'globalThis.Obstacle = class Obstacle')
  .replace(/^function removeObstacleAt/m, 'globalThis.removeObstacleAt = function removeObstacleAt');
new Function(obstacleSource)();
const Obstacle = globalThis.Obstacle;
const gridSource = readFileSync(join(root, 'SpatialGrid.js'), 'utf8')
  .replace(/^class SpatialGrid/m, 'globalThis.SpatialGrid = class SpatialGrid');
new Function(gridSource)();
const SpatialGrid = globalThis.SpatialGrid;

describe('7-Boids: répulsion, image et traînées', () => {
  it('repousse vers l’extérieur dans le cercle inclusif et respecte maxForce', () => {
    const boid = new Boid(15, 0);
    boid.vel.set(-2, 0);
    const force = boid.fleeWithTargetRadius({ x: 0, y: 0, r: 10 }, 10);
    assert.ok(force.x > 0);
    assert.ok(force.mag() <= boid.maxForce + 1e-9);

    const atBoundary = new Boid(20, 0);
    atBoundary.vel.set(-2, 0);
    assert.equal(atBoundary.fleeWithTargetRadius({ x: 0, y: 0, r: 10 }, 10).mag(), 0);
  });

  it('ignore les obstacles éloignés et gère une liste vide', () => {
    const boid = new Boid(0, 0);
    boid.vel.set(1, 0);
    assert.equal(boid.avoid([]).mag(), 0);
    assert.equal(boid.avoid([{ pos: createVector(100, 0), r: 10 }]).mag(), 0);
    assert.ok(boid.avoid([{ pos: createVector(5, 0), r: 10 }]).mag() > 0);
  });

  it('construit les obstacles comme entités immobiles du modèle Boid', () => {
    const obstacle = new Obstacle(30, 40, 25, 'green');
    assert.ok(obstacle instanceof Boid);
    assert.deepEqual(obstacle.pos, createVector(30, 40));
    assert.equal(obstacle.r, 25);
    assert.equal(obstacle.vel.mag(), 0);
  });

  it('la grille renvoie exactement les voisins dans le rayon et se reconstruit proprement', () => {
    const grid = new SpatialGrid(40);
    const near = new Boid(39, 0);
    const edge = new Boid(50, 0);
    const far = new Boid(100, 0);
    [near, edge, far].forEach((boid) => grid.insert(boid));
    assert.deepEqual(grid.query(createVector(40, 0), 10), [near, edge]);
    grid.clear();
    grid.insert(far);
    assert.deepEqual(grid.query(createVector(40, 0), 10), []);
  });

  it('retire seulement l’obstacle touché par la souris', () => {
    const first = new Obstacle(20, 20, 12, 'green');
    const second = new Obstacle(100, 100, 18, 'green');
    const obstacles = [first, second];
    assert.equal(removeObstacleAt(obstacles, 30, 20), first);
    assert.deepEqual(obstacles, [second]);
    assert.equal(removeObstacleAt(obstacles, 50, 50), null);
  });

  it('donne la priorité à la répulsion tout en plafonnant la force combinée', () => {
    const boid = new Boid(10, 0);
    boid.vel.set(-2, 0);
    const start = boid.pos.copy();
    const force = boid.flock([boid], [], { x: 0, y: 0, r: 20 });
    assert.ok(force.x > 0);
    assert.ok(force.mag() <= boid.maxForce + 1e-9);
    assert.deepEqual(boid.pos, start, 'le steering ne téléporte pas le boid');
    assert.equal(boid.acc.mag(), force.mag());
  });

  it('accepte un boid sans image et maintient une traînée bornée', () => {
    const boid = new Boid(10, 10);
    assert.equal(boid.image, undefined);
    boid.trailMaxLength = 3;
    for (let i = 0; i < 5; i++) boid.update();
    assert.equal(boid.trail.length, 3);
    boid.setImage({ width: 20, height: 10 });
    assert.equal(boid.imageH, boid.r / 2);
    boid.setImage(undefined);
    assert.equal(boid.image, undefined);
  });
});
