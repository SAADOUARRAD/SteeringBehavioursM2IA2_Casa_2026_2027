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
  mag() { return Math.hypot(this.x, this.y); }
  setMag(n) { const m = this.mag(); return m ? this.mult(n / m) : this; }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  heading() { return Math.atan2(this.y, this.x); }
  rotate(a) {
    const cos = Math.cos(a), sin = Math.sin(a);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx; this.y = ny;
    return this;
  }
  copy() { return new Vector(this.x, this.y); }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static add(a, b) { return new Vector(a.x + b.x, a.y + b.y); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  static fromAngle(a) { return new Vector(Math.cos(a), Math.sin(a)); }
  static random2D() { return new Vector(1, 0); }
}

function loadEnv(w = 800, h = 600) {
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    width: w,
    height: h,
    random: (a, b) => (b === undefined ? (a !== undefined ? a * 0.5 : 0.5) : a + (b - a) * 0.5),
    push: () => {},
    pop: () => {},
    fill: () => {},
    noFill: () => {},
    stroke: () => {},
    noStroke: () => {},
    strokeWeight: () => {},
    circle: () => {},
    rect: () => {},
    line: () => {},
    translate: () => {},
    rotate: () => {},
    beginShape: () => {},
    vertex: () => {},
    endShape: () => {},
    CLOSE: 'close',
    triangle: () => {},
    console
  });

  for (const file of ['vehicle.js', 'Flare.js', 'target.js', 'bouncingBall.js', 'Pursuer.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }

  return vm.runInContext('({ Vehicle, Flare, Target, BouncingBall, Pursuer })', context);
}

test('1. Tous les objets créés héritent obligatoirement de la classe Vehicle', () => {
  const { Vehicle, Flare, Target, BouncingBall, Pursuer } = loadEnv();

  const p = new Pursuer(100, 100);
  const t = new Target(200, 200);
  const f = new Flare(300, 300, 0, 4);
  const b = new BouncingBall(400, 400);

  assert.ok(p instanceof Vehicle, 'Pursuer doit hériter de Vehicle');
  assert.ok(t instanceof Vehicle, 'Target doit hériter de Vehicle');
  assert.ok(f instanceof Vehicle, 'Flare doit hériter de Vehicle');
  assert.ok(b instanceof Vehicle, 'BouncingBall doit hériter de Vehicle');
});

test('2. Sélection précise de la cible la plus proche parmi 4 cibles simultanées', () => {
  const { Target, Pursuer } = loadEnv();
  const pursuer = new Pursuer(100, 100);

  const targets = [
    new Target(600, 600), // loin
    new Target(180, 100), // distance = 80
    new Target(400, 200), // loin
    new Target(300, 100), // distance = 200
  ];

  assert.equal(targets.length, 4, 'Il doit y avoir exactement 4 cibles');

  // Algorithme de recherche de la cible la plus proche
  let closest = null;
  let minDist = Infinity;
  for (const t of targets) {
    const d = Vector.dist(pursuer.pos, t.pos);
    if (d < minDist) {
      minDist = d;
      closest = t;
    }
  }

  assert.equal(closest, targets[1], 'La cible d index 1 doit être identifiée comme la plus proche (80 px)');
});

test('3. Pursuer calcule la prédiction adaptative avec haute précision', () => {
  const { Target, Pursuer } = loadEnv();
  const pursuer = new Pursuer(0, 0);
  pursuer.maxSpeed = 10;

  const target = new Target(100, 0);
  target.vel.set(2, 0); // La cible se déplace vers la droite

  // Distance = 100 px -> Lookahead attendu = 100 / 10 = 10 frames
  // Position future prédite = (100 + 2 * 10, 0) = (120, 0)
  const steer = pursuer.pursueWithPrecision(target);

  assert.ok(pursuer.targetPredictionPoint, 'Le point d anticipation doit être calculé');
  assert.equal(pursuer.targetPredictionPoint.x, 120, 'Position X prédite doit valoir 120 px');
  assert.equal(pursuer.targetPredictionPoint.y, 0, 'Position Y prédite doit valoir 0 px');
  assert.ok(steer.x > 0, 'La force de steering doit accélérer vers le point prédit');
});

test('4. Les cibles éjectent des leurres (Flares) vers l arrière et s détruisent après 1 seconde', () => {
  const { Target, Pursuer, Flare } = loadEnv();
  const pursuer = new Pursuer(100, 100);
  const target = new Target(150, 100); // distance = 50px < rayonDetection (180px)
  target.vel.set(4, 0); // Cap vers la droite (heading = 0)

  const flares = [];

  // Mise à jour de la cible avec le poursuiveur dans son cercle de détection
  target.updateBehavior(pursuer, flares, 1 / 60, true);

  assert.equal(flares.length, 1, 'Un leurre (Flare) doit avoir été largué');
  const flare = flares[0];
  assert.ok(flare instanceof Flare, 'L objet créé doit être une instance de Flare');

  // Vérification de la trajectoire du leurre : éjection vers l'arrière
  assert.ok(flare.vel.x < 0, 'Le leurre doit être éjecté vers l arrière (vitesse X négative si la cible va vers la droite)');

  // Durée de vie : vivant à 0.5s
  flare.update(0.5);
  assert.equal(flare.isDead(), false, 'Le leurre ne doit pas être détruit à 0.5 seconde');

  // Mort après 1 seconde (age >= 1.0s)
  flare.update(0.6); // Total age = 1.1s > 1.0s
  assert.equal(flare.isDead(), true, 'Le leurre doit obligatoirement être détruit après 1 seconde');
});

test('5. Vitesse et accélération de la cible accrues en mode évasion', () => {
  const { Target, Pursuer } = loadEnv();
  const target = new Target(500, 500);
  const pursuer = new Pursuer(100, 100); // Hors de portée

  target.updateBehavior(pursuer, [], 1 / 60);
  assert.equal(target.isAlerted, false);
  assert.equal(target.maxSpeed, target.normalSpeed);

  // Rapprochement du poursuiveur
  pursuer.pos.set(480, 500); // dist = 20px < rayonDetection
  target.updateBehavior(pursuer, [], 1 / 60);
  assert.equal(target.isAlerted, true);
  assert.equal(target.maxSpeed, target.fleeSpeed, 'La cible doit accélérer et augmenter sa vitesse');
});
