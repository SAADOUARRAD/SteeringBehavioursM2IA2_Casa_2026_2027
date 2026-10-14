/**
 * snake_path.test.mjs
 * Tests unitaires automatisés pour 5-3-PathFollowingComplex :
 * - Héritage Vehicle pour Snake et SnakeSegment
 * - Suivi de chemin complexe (follow)
 * - Séparation active sur la tête ET sur tous les anneaux
 * - Pondération paramétrable par curseurs
 * - Arrivée progressive (arrive) d'anneau en anneau
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = join(__dirname, '..');

// ─── Stubs P5 ────────────────────────────────────────────────────────────────
class Vec2 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  copy() { return new Vec2(this.x, this.y, this.z); }
  add(x, y) {
    if (x instanceof Vec2) {
      this.x += x.x;
      this.y += x.y;
    } else {
      this.x += x;
      this.y += y || 0;
    }
    return this;
  }
  sub(x, y) {
    if (x instanceof Vec2) {
      this.x -= x.x;
      this.y -= x.y;
    } else {
      this.x -= x;
      this.y -= y || 0;
    }
    return this;
  }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }
  mag() { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  normalize() {
    let m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }
  setMag(m) { return this.normalize().mult(m); }
  limit(max) {
    if (this.mag() > max) this.setMag(max);
    return this;
  }
  dot(v) { return this.x * v.x + this.y * v.y; }
  heading() { return Math.atan2(this.y, this.x); }
  set(x, y) { this.x = x; this.y = y; return this; }

  static add(a, b) { return new Vec2(a.x + b.x, a.y + b.y); }
  static sub(a, b) { return new Vec2(a.x - b.x, a.y - b.y); }
  static dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
  static random2D() {
    let a = Math.random() * Math.PI * 2;
    return new Vec2(Math.cos(a), Math.sin(a));
  }
}

global.p5 = { Vector: Vec2 };
global.createVector = (x = 0, y = 0, z = 0) => new Vec2(x, y, z);
global.random = (a, b) => (b === undefined ? Math.random() * (a || 1) : a + Math.random() * (b - a));
global.TWO_PI = Math.PI * 2;
global.PI = Math.PI;
global.cos = Math.cos;
global.sin = Math.sin;
global.min = Math.min;
global.max = Math.max;
global.map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
global.constrain = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
global.width = 1200;
global.height = 800;
global.frameCount = 0;
global.debug = false;

// No-ops pour le dessin
[
  'push', 'pop', 'noStroke', 'stroke', 'fill', 'noFill', 'strokeWeight',
  'circle', 'ellipse', 'rect', 'line', 'arc', 'triangle', 'beginShape',
  'endShape', 'vertex', 'translate', 'rotate', 'colorMode', 'strokeJoin',
  'strokeCap'
].forEach((fn) => { global[fn] = () => {}; });

global.ROUND = 'round';
global.CLOSE = 'close';

// ─── Chargement des classes ───────────────────────────────────────────────────
function loadCode(filename) {
  let code = readFileSync(join(base, filename), 'utf-8');
  // Expose toutes les classes dans globalThis
  code = code.replace(/^class (\w+)/gm, 'globalThis.$1 = class $1');
  new Function(code)();
}

loadCode('path.js');
loadCode('vehicle.js');

const Vehicle = globalThis.Vehicle;
const Path = globalThis.Path;
const findProjection = globalThis.findProjection;
global.Vehicle = Vehicle;
global.Path = Path;
global.findProjection = findProjection;

loadCode('SnakeSegment.js');
loadCode('Snake.js');
loadCode('SnakeWander.js');

const SnakeSegment = globalThis.SnakeSegment;
const Snake = globalThis.Snake;
const SnakeWander = globalThis.SnakeWander;

// ─── Fonctions d'aide ────────────────────────────────────────────────────────
function createSimpleCircularPath() {
  const p = new Path();
  p.radius = 25;
  const segments = 16;
  for (let i = 0; i < segments; i++) {
    let angle = (i * TWO_PI) / segments;
    p.addPoint(500 + Math.cos(angle) * 200, 400 + Math.sin(angle) * 200);
  }
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('5-3 Path Following Complex — Snake & SnakeSegment', () => {
  it('SnakeSegment et Snake sont obligatoirement des sous-classes de Vehicle', () => {
    const seg = new SnakeSegment(100, 100);
    const snake = new Snake(100, 100, 8);

    assert.ok(seg instanceof Vehicle, 'SnakeSegment doit hériter de Vehicle');
    assert.ok(snake instanceof Vehicle, 'Snake doit hériter de Vehicle');
  });

  it('Snake crée tous ses anneaux en tant qu\'instances de SnakeSegment (et donc Vehicle)', () => {
    const snake = new Snake(200, 200, 10);
    assert.equal(snake.anneaux.length, 10, 'Doit posséder 10 anneaux');
    assert.equal(snake.head, snake.anneaux[0], 'Le premier anneau est la tête');

    for (let i = 0; i < snake.anneaux.length; i++) {
      const ring = snake.anneaux[i];
      assert.ok(ring instanceof SnakeSegment, `Anneau ${i} doit être SnakeSegment`);
      assert.ok(ring instanceof Vehicle, `Anneau ${i} doit être Vehicle`);
    }
  });

  it('SnakeSegment.arrive() ralentit doucement quand il s\'approche de sa cible', () => {
    const seg = new SnakeSegment(0, 0, 5, 0.5);
    seg.vel.set(0, 0); // Vitesse initiale nulle pour observer la force d'attraction
    const targetFar = new Vec2(300, 0);
    const forceFar = seg.arrive(targetFar, 15, 100);
    assert.ok(forceFar.mag() > 0, 'Force non nulle à distance');
    assert.ok(forceFar.mag() <= seg.maxForce + 0.001, 'Force limitée à maxForce');

    // Cible proche (dans la zone de ralentissement)
    const targetClose = new Vec2(25, 0);
    const forceClose = seg.arrive(targetClose, 15, 100);
    assert.ok(forceClose.mag() <= forceFar.mag() + 0.001);
  });

  it('Snake.applyBehaviors() applique le suivi de chemin (follow) à la tête', () => {
    const path = createSimpleCircularPath();
    const snake = new Snake(500, 100, 6); // Positionné en dehors du cercle de rayon 200
    snake.setWeights(3.0, 0.0); // 100% suivi de chemin, 0% séparation

    snake.applyBehaviors([], path);

    // La tête doit avoir reçu une accélération vers la route
    assert.ok(snake.head.vel.mag() > 0);
  });

  it('Snake sépare sa tête des véhicules proches pour éviter toute superposition', () => {
    const path = createSimpleCircularPath();
    const snake = new Snake(500, 400, 6);
    snake.setWeights(0.0, 4.0); // 0% suivi de chemin, 100% séparation
    snake.head.vel.set(0, 0);

    // Placer un véhicule très proche de la tête à sa droite (+20px)
    const obstacleVehicle = new Vehicle(520, 400, 3, 0.4);
    snake.applyBehaviors([obstacleVehicle], path);

    // La tête doit être repoussée vers la gauche (vel.x négatif)
    assert.ok(snake.head.vel.x < 0, 'La force de séparation doit repousser la tête vers la gauche');
  });

  it('Snake sépare activement TOUS ses anneaux des véhicules proches', () => {
    const path = createSimpleCircularPath();
    const snake = new Snake(300, 300, 8);
    snake.setWeights(0.0, 3.5); // Focus sur la séparation

    // On place les anneaux immobiles
    for (let i = 0; i < snake.anneaux.length; i++) {
      snake.anneaux[i].pos.set(300, 300 + i * 16);
      snake.anneaux[i].vel.set(0, 0);
      snake.anneaux[i].acc.set(0, 0);
    }

    // On place un véhicule juste à droite du 4ème anneau (index 4)
    const ringTarget = snake.anneaux[4];
    const nearbyVehicle = new Vehicle(ringTarget.pos.x + 15, ringTarget.pos.y, 3, 0.4);

    snake.applyBehaviors([nearbyVehicle], path);

    // Le 4ème anneau doit ressentir une vitesse de répulsion vers la gauche (x < 0)
    assert.ok(
      ringTarget.vel.x < 0,
      'L anneau du serpent doit subir une répulsion pour ne pas se superposer au véhicule'
    );
  });

  it('Les curseurs de pondération (setWeights) modifient effectivement l intensité des forces', () => {
    const path = createSimpleCircularPath();

    // 1. Serpent avec faible poids de séparation
    const s1 = new Snake(400, 400, 4);
    s1.setWeights(0.0, 0.5);
    s1.head.vel.set(0, 0);
    const obs = new Vehicle(415, 400, 3, 0.4);
    s1.applyBehaviors([obs], path);
    const vitesseFaible = Math.abs(s1.head.vel.x);

    // 2. Serpent avec fort poids de séparation
    const s2 = new Snake(400, 400, 4);
    s2.setWeights(0.0, 4.0);
    s2.head.vel.set(0, 0);
    s2.applyBehaviors([obs], path);
    const vitesseForte = Math.abs(s2.head.vel.x);

    assert.ok(
      vitesseForte >= vitesseFaible,
      `La vitesse avec un poids de 4.0 (${vitesseForte}) doit être supérieure ou égale au poids 0.5 (${vitesseFaible})`
    );
  });

  it('setSpeed() met à jour la vitesse de tous les anneaux du serpent', () => {
    const snake = new Snake(100, 100, 6);
    snake.setSpeed(7.5);

    assert.equal(snake.maxSpeed, 7.5);
    assert.equal(snake.head.maxSpeed, 7.5);
    for (let i = 1; i < snake.anneaux.length; i++) {
      assert.ok(snake.anneaux[i].maxSpeed >= 7.5);
    }
  });

  it('SnakeWander applique le comportement d errance (wander) sur la tête', () => {
    const sw = new SnakeWander(200, 200, 6);
    assert.ok(sw instanceof Snake);
    assert.ok(sw instanceof Vehicle);

    assert.doesNotThrow(() => {
      sw.applyBehaviors([]);
    });
  });
});
