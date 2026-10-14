/**
 * moto_racing.test.mjs
 * Tests unitaires automatisés pour le thème Moto Grand Prix et Niveaux dans 5-3-PathFollowingComplex :
 * - Héritage strict de Vehicle pour Moto, MotoSquad et ExhaustParticle
 * - Suivi de chemin (follow) et séparation mutuelle (separate)
 * - Arrivée progressive (arrive) pour le drafting en peloton
 * - Déclenchement et restauration du Nitro Boost
 * - Validation géométrique des 4 niveaux de circuits (RACING_LEVELS)
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
  static mult(a, n) { return new Vec2(a.x * n, a.y * n); }
  static dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
  static fromAngle(a) { return new Vec2(Math.cos(a), Math.sin(a)); }
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
global.lerp = (a, b, t) => a + (b - a) * t;
global.map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
global.constrain = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
global.width = 1200;
global.height = 800;
global.frameCount = 0;
global.debug = false;

// No-ops pour le rendu
[
  'push', 'pop', 'noStroke', 'stroke', 'fill', 'noFill', 'strokeWeight',
  'circle', 'ellipse', 'rect', 'line', 'arc', 'triangle', 'beginShape',
  'endShape', 'vertex', 'translate', 'rotate', 'colorMode', 'strokeJoin',
  'strokeCap', 'rectMode', 'textAlign', 'textSize', 'textStyle', 'text'
].forEach((fn) => { global[fn] = () => {}; });

global.ROUND = 'round';
global.CLOSE = 'close';
global.CENTER = 'center';
global.CORNER = 'corner';
global.BOLD = 'bold';

// ─── Chargement des classes ───────────────────────────────────────────────────
function loadCode(filename) {
  let code = readFileSync(join(base, filename), 'utf-8');
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

// Chargement des niveaux
let levelsCode = readFileSync(join(base, 'levels.js'), 'utf-8');
new Function(levelsCode + '\nglobalThis.RACING_LEVELS = RACING_LEVELS; globalThis.minDim = minDim;')();
const RACING_LEVELS = globalThis.RACING_LEVELS;
global.RACING_LEVELS = RACING_LEVELS;

loadCode('ExhaustParticle.js');
loadCode('Moto.js');
loadCode('MotoSquad.js');

const ExhaustParticle = globalThis.ExhaustParticle;
const Moto = globalThis.Moto;
const MotoSquad = globalThis.MotoSquad;

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('5-3 Moto Racing & Circuits Multi-Niveaux', () => {
  it('Moto, MotoSquad et ExhaustParticle héritent obligatoirement de Vehicle', () => {
    const moto = new Moto(100, 100);
    const particle = new ExhaustParticle(100, 100);
    const squad = new MotoSquad(100, 100, 3);

    assert.ok(moto instanceof Vehicle, 'Moto doit hériter de Vehicle');
    assert.ok(particle instanceof Vehicle, 'ExhaustParticle doit hériter de Vehicle');
    assert.ok(squad instanceof Vehicle, 'MotoSquad doit hériter de Vehicle');
  });

  it('Moto.arrive() ralentit doucement à l\'approche de la cible', () => {
    const moto = new Moto(0, 0, 5, 0.5);
    moto.vel.set(0, 0);

    const targetFar = new Vec2(300, 0);
    const forceFar = moto.arrive(targetFar, 20, 100);
    assert.ok(forceFar.mag() > 0, 'La force d arrivée à distance doit être non nulle');
    assert.ok(forceFar.mag() <= moto.maxForce + 0.001);

    const targetClose = new Vec2(25, 0);
    const forceClose = moto.arrive(targetClose, 20, 100);
    assert.ok(forceClose.mag() <= forceFar.mag() + 0.001);
  });

  it('Moto suit le tracé du circuit (follow)', () => {
    const lvl = RACING_LEVELS[0];
    const track = lvl.buildPath(1200, 800);

    const moto = new Moto(600, 100, 4.0, 0.4);
    moto.followPathWeight = 3.0;
    moto.separateWeight = 0.0;

    moto.applyBehaviors([], track);
    moto.update();

    assert.ok(moto.vel.mag() > 0, 'La moto doit se mouvoir le long de la piste');
  });

  it('Moto repousse et évite les autres véhicules (séparation active)', () => {
    const lvl = RACING_LEVELS[0];
    const track = lvl.buildPath(1200, 800);

    const moto = new Moto(500, 400, 4.0, 0.4);
    moto.vel.set(0, 0);
    moto.followPathWeight = 0.0;
    moto.separateWeight = 4.0;

    // Obstacle immédiat à droite (+18px)
    const obstacle = new Vehicle(518, 400, 3.0, 0.4);
    moto.applyBehaviors([obstacle], track);
    moto.update();

    assert.ok(moto.vel.x < 0, 'La moto doit être repoussée vers la gauche pour éviter la collision');
  });

  it('triggerNitro() augmente temporairement la vitesse de pointe et la force', () => {
    const moto = new Moto(100, 100, 4.0, 0.4);
    const baseSpeed = moto.maxSpeed;

    moto.triggerNitro(60);
    assert.ok(moto.isNitro, 'Le flag nitro doit être actif');
    assert.ok(moto.maxSpeed > baseSpeed, 'La vitesse max doit être augmentée avec le Nitro');

    // Écoulement du timer
    for (let i = 0; i < 65; i++) {
      moto.applyBehaviors([], null);
      moto.update();
    }

    assert.equal(moto.isNitro, false, 'Le nitro doit expirer après le temps imparti');
    assert.equal(moto.maxSpeed, baseSpeed, 'La vitesse doit revenir à la normale');
  });

  it('MotoSquad instancie tous ses pilotes en tant que Moto (et donc Vehicle)', () => {
    const squad = new MotoSquad(200, 200, 4);
    assert.equal(squad.motos.length, 4, 'L écurie doit avoir 4 motos');
    assert.equal(squad.leader, squad.motos[0], 'Le premier membre est le leader');

    for (let m of squad.motos) {
      assert.ok(m instanceof Moto, 'Chaque membre doit être une instance de Moto');
      assert.ok(m instanceof Vehicle, 'Chaque membre doit hériter de Vehicle');
    }
  });

  it('ExhaustParticle se dissipe et meurt après sa durée de vie', () => {
    const particle = new ExhaustParticle(100, 100, new Vec2(-1, 0), false);
    assert.equal(particle.isDead(), false);

    while (!particle.isDead()) {
      particle.update();
    }

    assert.ok(particle.lifespan <= 0);
    assert.equal(particle.isDead(), true);
  });

  it('Tous les 4 niveaux de course génèrent un circuit valide avec points et rayon', () => {
    assert.equal(RACING_LEVELS.length, 4, 'Il doit y avoir exactement 4 niveaux');

    for (let lvl of RACING_LEVELS) {
      assert.ok(lvl.name && lvl.difficulty, 'Chaque niveau doit avoir un nom et une difficulté');
      assert.ok(lvl.radius > 0, 'Le rayon de la piste doit être strictement positif');

      const p = lvl.buildPath(1200, 800);
      assert.ok(p instanceof Path, 'Le niveau doit construire une instance de Path');
      assert.ok(p.points.length >= 10, 'Le circuit doit être composé d au moins 10 points');
    }
  });

  it('Les curseurs de pondération (followPathWeight / separateWeight) modifient le comportement', () => {
    const lvl = RACING_LEVELS[0];
    const track = lvl.buildPath(1200, 800);
    const obs = new Vehicle(415, 400, 3, 0.4);

    const m1 = new Moto(400, 400, 4.0, 0.4);
    m1.vel.set(0, 0);
    m1.followPathWeight = 0.0;
    m1.separateWeight = 0.5;
    m1.applyBehaviors([obs], track);
    m1.update();
    const vit1 = Math.abs(m1.vel.x);

    const m2 = new Moto(400, 400, 4.0, 0.4);
    m2.vel.set(0, 0);
    m2.followPathWeight = 0.0;
    m2.separateWeight = 4.0;
    m2.applyBehaviors([obs], track);
    m2.update();
    const vit2 = Math.abs(m2.vel.x);

    assert.ok(vit2 >= vit1, 'Un poids de séparation supérieur doit induire une répulsion plus forte');
  });
});
