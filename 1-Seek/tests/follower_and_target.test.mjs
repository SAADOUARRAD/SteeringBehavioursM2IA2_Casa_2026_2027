import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.set(x, y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  rotate(a) {
    const cos = Math.cos(a), sin = Math.sin(a);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx; this.y = ny;
    return this;
  }
  mag() { return Math.hypot(this.x, this.y); }
  setMag(n) { const m = this.mag(); return m ? this.mult(n / m) : this; }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  heading() { return Math.atan2(this.y, this.x); }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  static random2D() { return new Vector(1, 0); }
}

function createMockAudioContext() {
  return class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
      this.nodesCreated = [];
    }
    resume() { this.state = 'running'; }
    createOscillator() {
      const node = {
        type: 'sine',
        frequency: {
          setValueAtTime: (v, t) => { node.startFreq = v; },
          exponentialRampToValueAtTime: (v, t) => { node.endFreq = v; }
        },
        connect: (target) => { node.target = target; },
        start: () => { node.started = true; },
        stop: () => { node.stopped = true; }
      };
      this.nodesCreated.push(node);
      return node;
    }
    createGain() {
      const node = {
        gain: {
          setValueAtTime: (v, t) => { node.startGain = v; },
          exponentialRampToValueAtTime: (v, t) => { node.endGain = v; }
        },
        connect: (target) => { node.target = target; }
      };
      this.nodesCreated.push(node);
      return node;
    }
  };
}

function loadEnv(w = 800, h = 600, withAudio = false) {
  const mockAudioContextClass = createMockAudioContext();
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    width: w,
    height: h,
    random: (a, b) => (b === undefined ? (a !== undefined ? a * 0.5 : 0.5) : a + (b - a) * 0.5),
    push: () => {},
    pop: () => {},
    fill: () => {},
    stroke: () => {},
    strokeWeight: () => {},
    circle: () => {},
    rect: () => {},
    noFill: () => {},
    noStroke: () => {},
    translate: () => {},
    rotate: () => {},
    triangle: () => {},
    line: () => {},
    window: withAudio ? { AudioContext: mockAudioContextClass } : {},
    performance: { now: () => Date.now() },
  });

  for (const file of ['vehicle.js', 'FollowerVehicle.js', 'target.js', 'targetFuyante.js', 'soundEffects.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }

  return vm.runInContext('({ Vehicle, FollowerVehicle, Target, TargetFuyante, SoundEffects })', context);
}

test('FollowerVehicle hérite de Vehicle et initialise mode seek', () => {
  const { Vehicle, FollowerVehicle } = loadEnv();
  const v = new FollowerVehicle(100, 100);
  assert.ok(v instanceof Vehicle);
  assert.equal(v.mode, 'seek');
  assert.equal(v.maxSpeed, 4);
  assert.equal(v.maxForce, 0.1);
});

test('fleeReynolds selon Craig Reynolds inverse la vitesse désirée, pas la force', () => {
  const { FollowerVehicle } = loadEnv();
  const v = new FollowerVehicle(200, 200);
  v.vel.set(2, 0); // Vitesse actuelle vers la droite
  const target = new Vector(300, 200); // Cible à droite

  const forceReynolds = v.flee(target);
  assert.ok(Math.abs(forceReynolds.x - (-0.1)) < 1e-6);
  assert.ok(Math.abs(forceReynolds.y - 0) < 1e-6);
  assert.ok(forceReynolds.mag() <= v.maxForce + 1e-6);

  v.vel.set(0, 3);
  const reynoldsWithAngle = v.flee(target);
  const naiveWithAngle = v.fleeNaive(target);
  assert.notDeepEqual(reynoldsWithAngle.y, naiveWithAngle.y);
});

test('applyBehaviors alterne bien entre seek et flee selon mode', () => {
  const { FollowerVehicle } = loadEnv();
  const v = new FollowerVehicle(100, 100);
  const target = new Vector(200, 100);

  v.mode = 'seek';
  v.applyBehaviors(target);
  assert.ok(v.acc.x > 0, 'Seek doit accélérer vers la cible');

  v.acc.set(0, 0);
  v.mode = 'flee';
  v.applyBehaviors(target);
  assert.ok(v.acc.x < 0, 'Flee doit accélérer à l opposé de la cible');
});

test('Target hérite de Vehicle, gère sa propre locomotion et rebouclage edges', () => {
  const { Vehicle, Target } = loadEnv(800, 600);
  const t = new Target(400, 300);
  assert.ok(t instanceof Vehicle);
  assert.ok(t.r > 0, 'La cible doit avoir un rayon positif');

  t.pos.set(800 + t.r + 10, 300);
  t.edges();
  assert.equal(t.pos.x, -t.r, 'La cible doit reboucler de l autre côté au bord');

  if (typeof t.respawnRandom === 'function') {
    t.respawnRandom(800, 600);
    assert.ok(t.pos.x >= t.r && t.pos.x <= 800 - t.r);
    assert.ok(t.pos.y >= t.r && t.pos.y <= 600 - t.r);
  }
});

test('SoundEffects gère l activation, le throttle et la synthèse audio', () => {
  const { SoundEffects } = loadEnv(800, 600, true);
  const s = new SoundEffects();
  assert.equal(s.enabled, true);

  // Bascule du son
  s.toggle();
  assert.equal(s.enabled, false);
  assert.equal(s.playImpact(), false, 'Ne doit pas jouer quand désactivé');

  s.setEnabled(true);
  assert.equal(s.enabled, true);

  // Premier impact joué
  const played = s.playImpact(500, 0.08);
  assert.equal(played, true, 'Doit jouer quand activé');

  // Throttling immédiat (< 40ms)
  const throttled = s.playImpact(500, 0.08);
  assert.equal(throttled, false, 'Doit être ignoré pour éviter la saturation sonore');
});

test('TargetFuyante hérite de Vehicle et de Target', () => {
  const { Vehicle, Target, TargetFuyante } = loadEnv();
  const tf = new TargetFuyante(200, 200);
  assert.ok(tf instanceof Vehicle, 'TargetFuyante doit être une sous-classe de Vehicle');
  assert.ok(tf instanceof Target, 'TargetFuyante doit étendre Target');
  assert.equal(tf.detectionRadius, 200);
  assert.equal(tf.safeDistance, 300);
  assert.equal(tf.maxFleeDuration, 2.5);
  assert.equal(tf.isFleeing, false);
});

test('TargetFuyante ne fuit pas si le prédateur est hors de portée (> 200px)', () => {
  const { TargetFuyante } = loadEnv();
  const tf = new TargetFuyante(200, 200);
  const distantVehicle = { pos: new Vector(500, 200) }; // dist = 300px > 200px

  tf.applyBehaviors([distantVehicle], 1 / 60);
  assert.equal(tf.isFleeing, false, 'Ne doit pas fuir à 300px');
  assert.equal(tf.maxSpeed, 3, 'Doit conserver sa vitesse de croisière');
});

test('TargetFuyante fuit, accélère et fuit jusqu à 300px puis reprend son calme', () => {
  const { TargetFuyante } = loadEnv();
  const tf = new TargetFuyante(200, 200);
  const predator = { pos: new Vector(350, 200) }; // dist = 150px <= 200px

  // 1. Déclenchement de la fuite
  tf.applyBehaviors([predator], 1 / 60);
  assert.equal(tf.isFleeing, true, 'Doit fuir si prédateur dans le cercle de 200px');
  assert.equal(tf.maxSpeed, 6, 'Doit accélérer et augmenter sa vitesse pendant la fuite');
  assert.ok(tf.acc.x < 0, 'La force de fuite doit pousser à l opposé du prédateur');

  // 2. Maintien de la fuite tant que dist < 300px (ex: 260px)
  predator.pos.set(460, 200); // dist = 260px
  tf.applyBehaviors([predator], 1 / 60);
  assert.equal(tf.isFleeing, true, 'Doit continuer de fuir jusqu à 300px');

  // 3. Fin de la fuite une fois à 300px ou plus
  predator.pos.set(510, 200); // dist = 310px >= 300px
  tf.applyBehaviors([predator], 1 / 60);
  assert.equal(tf.isFleeing, false, 'Doit cesser de fuir une fois à distance de sécurité');
  assert.equal(tf.maxSpeed, 3, 'Doit reprendre son comportement normal de Target');
});

test('TargetFuyante ne peut pas fuir plus de 2,5s (endurance limitée) et récupère au repos', () => {
  const { TargetFuyante } = loadEnv();
  const tf = new TargetFuyante(200, 200);
  const predator = { pos: new Vector(300, 200) }; // dist = 100px

  // Début fuite (0.1s écoulée, endurance = 2.4s)
  tf.applyBehaviors([predator], 0.1);
  assert.equal(tf.isFleeing, true);
  assert.ok(tf.currentEndurance < 2.5);

  // Écoulement de 2,3 secondes supplémentaires (total 2.4s écoulées)
  for (let i = 0; i < 23; i++) {
    tf.applyBehaviors([predator], 0.1);
  }
  assert.equal(tf.isFleeing, true);

  // Franchissement de la limite des 2,5s (endurance tombe à 0)
  tf.applyBehaviors([predator], 0.1);
  assert.equal(tf.currentEndurance, 0);
  assert.equal(tf.isExhausted, true);
  assert.equal(tf.isFleeing, false, 'Doit s arrêter de fuir une fois l endurance épuisée');

  // Repos : prédateur éloigné, l endurance remonte
  predator.pos.set(700, 200);
  tf.applyBehaviors([predator], 1.0); // 1 seconde de repos
  assert.ok(tf.currentEndurance >= 1.0, 'L endurance doit se recharger au repos');
});

test('TargetFuyante show supporte mode normal et debug', () => {
  const { TargetFuyante } = loadEnv();
  const tf = new TargetFuyante(200, 200);
  // Doit s exécuter sans erreur en debug false et true
  assert.doesNotThrow(() => tf.show(false));
  assert.doesNotThrow(() => tf.show(true));
});
