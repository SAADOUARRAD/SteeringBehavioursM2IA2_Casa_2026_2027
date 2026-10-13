/**
 * arrival.test.mjs — tests unitaires 3-Arrival
 * node --test 3-Arrival/tests/arrival.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base      = join(__dirname, '..');

// ─── Stubs P5 ────────────────────────────────────────────────────────────────
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy()       { return new Vec2(this.x, this.y); }
  add(v)       { this.x += v.x; this.y += v.y; return this; }
  mult(n)      { this.x *= n; this.y *= n; return this; }
  mag()        { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  setMag(m)    { let c = this.mag(); if (c === 0) return this; let s = m/c; this.x*=s; this.y*=s; return this; }
  limit(max)   { if (this.mag() > max) this.setMag(max); return this; }
  set(x, y)    { this.x = x; this.y = y; return this; }
  heading()    { return Math.atan2(this.y, this.x); }
  static dist(a, b)    { return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2); }
  static sub(a, b)     { return new Vec2(a.x-b.x, a.y-b.y); }
  static fromAngle(a)  { return new Vec2(Math.cos(a), Math.sin(a)); }
  static random2D()    { let a=Math.random()*Math.PI*2; return new Vec2(Math.cos(a),Math.sin(a)); }
}

global.p5          = { Vector: Vec2 };
global.createVector = (x,y) => new Vec2(x,y);
global.random       = (a,b) => b===undefined ? Math.random()*(a||1) : a+Math.random()*(b-a);
global.TWO_PI       = Math.PI*2;
global.PI           = Math.PI;
global.cos          = Math.cos;
global.sin          = Math.sin;
global.map          = (v,a,b,c,d) => c+(v-a)/(b-a)*(d-c);
global.constrain    = (v,lo,hi)   => Math.min(Math.max(v,lo),hi);
global.width        = 800;
global.height       = 600;
global.frameCount   = 0;
// p5 drawing no-ops
['push','pop','noStroke','stroke','fill','strokeWeight','circle','ellipse',
 'rect','line','noFill','arc','beginShape','endShape','curveVertex',
 'translate','rotate','triangle','colorMode','background','text',
 'textSize','textFont'].forEach(fn => global[fn] = ()=>{});
global.drawingContext = { setLineDash: ()=>{} };
global.angleMode    = ()=>{};
global.RADIANS      = 0;

// ─── Chargement des classes ───────────────────────────────────────────────────
// Réécrit "class Foo extends Bar {" en "globalThis.Foo = class Foo extends Bar {"
// pour que la classe soit accessible depuis globalThis après eval via Function.
function load(filename) {
  let code = readFileSync(join(base, filename), 'utf-8');
  // Remplace toutes les déclarations de classe au niveau module par des assignments
  code = code.replace(/^class (\w+)/gm, 'globalThis.$1 = class $1');
  new Function(code)();
}

load('vehicle.js');
const Vehicle        = globalThis.Vehicle;
global.Vehicle       = Vehicle;   // requis par les sous-classes

load('Food.js');
const Food           = globalThis.Food;

load('SnakeSegment.js');
const SnakeSegment   = globalThis.SnakeSegment;

load('ParticleEffect.js');
const ParticleEffect = globalThis.ParticleEffect;

load('HandTarget.js');
const HandTarget     = globalThis.HandTarget;

load('Snake.js');
const Snake          = globalThis.Snake;

// SoundManager : stub AudioContext pour l'env Node
global.AudioContext = class {
  createGain()          { return { gain: { value:0, setTargetAtTime:()=>{}, setValueAtTime:()=>{}, exponentialRampToValueAtTime:()=>{}}, connect:()=>{} }; }
  createOscillator()    { return { type:'sine', frequency:{ value:0, setValueAtTime:()=>{}, exponentialRampToValueAtTime:()=>{}, linearRampToValueAtTime:()=>{}, setTargetAtTime:()=>{} }, connect:()=>{}, start:()=>{}, stop:()=>{} }; }
  createBiquadFilter()  { return { type:'lowpass', frequency:{ value:0, setTargetAtTime:()=>{}}, Q:{ value:0 }, connect:()=>{} }; }
  createBuffer(ch,len,sr){ return { getChannelData:()=>new Float32Array(len) }; }
  createBufferSource()  { return { buffer:null, loop:false, connect:()=>{}, start:()=>{}, stop:()=>{} }; }
  resume()              { return Promise.resolve(); }
  get state()           { return 'running'; }
  get sampleRate()      { return 44100; }
  get currentTime()     { return 0; }
};
global.window = { AudioContext: global.AudioContext };

load('SoundManager.js');
const SoundManager = globalThis.SoundManager;

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Food', () => {
  it('extends Vehicle', () => {
    assert.ok(new Food(100, 200) instanceof Vehicle);
  });

  it('est stationnaire (maxSpeed = 0)', () => {
    const f = new Food(100, 200);
    assert.equal(f.maxSpeed, 0);
    assert.equal(f.maxForce, 0);
  });

  it('hue est un nombre 0-360', () => {
    const f = new Food(100, 200);
    assert.equal(typeof f.hue, 'number');
    assert.ok(f.hue >= 0 && f.hue < 360);
  });

  it('respawn remet eaten à false', () => {
    const f = new Food(100, 200);
    f.eaten = true;
    f.respawn();
    assert.equal(f.eaten, false);
  });

  it('update ne déplace pas la nourriture', () => {
    const f = new Food(150, 250);
    f.update();
    assert.equal(f.pos.x, 150);
    assert.equal(f.pos.y, 250);
  });
});

describe('SnakeSegment', () => {
  it('extends Vehicle', () => {
    assert.ok(new SnakeSegment(0,0,0,10,120) instanceof Vehicle);
  });

  it('follow() avec Vehicle comme leader oriente la force', () => {
    const seg = new SnakeSegment(0, 0, 0, 10, 120);
    const leader = { pos: new Vec2(200, 0) };
    seg.follow(leader);
    assert.ok(seg.acc.x > 0, `acc.x=${seg.acc.x} devrait être > 0`);
  });

  it('follow() avec p5.Vector comme leader', () => {
    const seg = new SnakeSegment(0, 0, 0, 10, 120);
    seg.follow(new Vec2(0, 200));
    assert.ok(seg.acc.y > 0, `acc.y=${seg.acc.y} devrait être > 0`);
  });

  it('force limitée à maxForce', () => {
    const seg = new SnakeSegment(0, 0, 0, 10, 120);
    seg.follow(new Vec2(5000, 0));
    assert.ok(seg.acc.mag() <= seg.maxForce + 0.001);
  });
});

describe('ParticleEffect', () => {
  it('extends Vehicle', () => {
    assert.ok(new ParticleEffect(100, 100, 120) instanceof Vehicle);
  });

  it('démarre avec lifespan > 0', () => {
    assert.ok(new ParticleEffect(100, 100, 120).lifespan > 0);
  });

  it('isDead() = false initialement', () => {
    assert.equal(new ParticleEffect(100, 100, 120).isDead(), false);
  });

  it('isDead() = true quand lifespan <= 0', () => {
    const p = new ParticleEffect(100, 100, 120);
    p.lifespan = 0;
    assert.equal(p.isDead(), true);
  });

  it('update() réduit lifespan', () => {
    const p = new ParticleEffect(100, 100, 120);
    const before = p.lifespan;
    p.update();
    assert.ok(p.lifespan < before);
  });

  it('force initiale donne de la vitesse après update', () => {
    const p = new ParticleEffect(100, 100, 120);
    p.update();
    assert.ok(p.vel.mag() > 0);
  });

  it('vitesse limitée à maxSpeed', () => {
    const p = new ParticleEffect(100, 100, 120);
    p.update();
    assert.ok(p.vel.mag() <= p.maxSpeed + 0.001);
  });
});

describe('HandTarget', () => {
  it('extends Vehicle', () => {
    assert.ok(new HandTarget() instanceof Vehicle);
  });

  it('démarre inactif', () => {
    assert.equal(new HandTarget().active, false);
  });

  it('updateFromLandmark positionne correctement (miroir X)', () => {
    const h = new HandTarget();
    h.updateFromLandmark(0.5, 0.5);
    assert.equal(h.active, true);
    assert.ok(Math.abs(h.pos.x - 400) < 1);
    assert.ok(Math.abs(h.pos.y - 300) < 1);
  });

  it('setInactive() désactive', () => {
    const h = new HandTarget();
    h.updateFromLandmark(0.3, 0.7);
    h.setInactive();
    assert.equal(h.active, false);
  });

  it('update() ne déplace pas la cible', () => {
    const h = new HandTarget();
    h.updateFromLandmark(0.3, 0.7);
    const px = h.pos.x, py = h.pos.y;
    h.update();
    assert.equal(h.pos.x, px);
    assert.equal(h.pos.y, py);
  });
});

describe('Snake', () => {
  it('extends Vehicle', () => {
    assert.ok(new Snake(100, 100, 110) instanceof Vehicle);
  });

  it('crée initialLength segments au départ', () => {
    const s = new Snake(100, 100, 110);
    assert.equal(s.segments.length, s.initialLength);
  });

  it('chaque segment est instance de SnakeSegment ET Vehicle', () => {
    const s = new Snake(100, 100, 110);
    for (let seg of s.segments) {
      assert.ok(seg instanceof SnakeSegment, 'doit être SnakeSegment');
      assert.ok(seg instanceof Vehicle,      'doit être Vehicle');
    }
  });

  it('tryEat() mange une nourriture proche, grandit et score++', () => {
    const s = new Snake(100, 100, 110);
    const f = new Food(100, 100);   // même position
    const ps = [];
    const idx = s.tryEat([f], ps);
    assert.equal(idx, 0,    'doit retourner index 0');
    assert.equal(f.eaten, true);
    assert.equal(s.score,  1);
    assert.equal(s.segments.length, s.initialLength + 1);
    assert.ok(ps.length > 0, 'particules créées');
  });

  it('tryEat() ignore la nourriture loin', () => {
    const s = new Snake(100, 100, 110);
    const f = new Food(600, 500);
    const idx = s.tryEat([f], []);
    assert.equal(idx, -1);
    assert.equal(f.eaten, false);
    assert.equal(s.score,  0);
  });

  it('tryEat() ignore une nourriture déjà mangée', () => {
    const s = new Snake(100, 100, 110);
    const f = new Food(100, 100);
    f.eaten = true;
    assert.equal(s.tryEat([f], []), -1);
  });

  it('steerToward() applique une force vers la cible', () => {
    const s = new Snake(0, 0, 110);
    s.steerToward(new Vec2(300, 0));
    assert.ok(s.acc.x > 0);
  });

  it('force de steering limitée à maxForce', () => {
    const s = new Snake(0, 0, 110);
    s.steerToward(new Vec2(5000, 0));
    assert.ok(s.acc.mag() <= s.maxForce + 0.001);
  });
});

describe('SoundManager', () => {
  it('est instanciable sans erreur', () => {
    assert.doesNotThrow(() => new SoundManager());
  });

  it('démarre non prêt (ctx null avant init)', () => {
    const sm = new SoundManager();
    assert.equal(sm.ctx, null);
    assert.equal(sm._ready, false);
  });

  it('init() crée le contexte et _ready = true', () => {
    const sm = new SoundManager();
    sm.init();
    assert.equal(sm._ready, true);
    assert.ok(sm.ctx !== null);
  });

  it('enabled est true par défaut', () => {
    assert.equal(new SoundManager().enabled, true);
  });

  it('setEnabled(false) met enabled à false', () => {
    const sm = new SoundManager(); sm.init();
    sm.setEnabled(false);
    assert.equal(sm.enabled, false);
  });

  it('setVolume() met à jour this.volume', () => {
    const sm = new SoundManager(); sm.init();
    sm.setVolume(0.3);
    assert.ok(Math.abs(sm.volume - 0.3) < 0.001);
  });

  it('playEat() ne lance pas d\'erreur (activé)', () => {
    const sm = new SoundManager(); sm.init();
    assert.doesNotThrow(() => sm.playEat(120));
  });

  it('playEat() ne lance pas d\'erreur (désactivé)', () => {
    const sm = new SoundManager(); sm.init(); sm.setEnabled(false);
    assert.doesNotThrow(() => sm.playEat(240));
  });

  it('playGrow() ne lance pas d\'erreur', () => {
    const sm = new SoundManager(); sm.init();
    assert.doesNotThrow(() => sm.playGrow());
  });

  it('playBurst() ne lance pas d\'erreur', () => {
    const sm = new SoundManager(); sm.init();
    assert.doesNotThrow(() => sm.playBurst());
  });

  it('updateAmbient() ne lance pas d\'erreur', () => {
    const sm = new SoundManager(); sm.init();
    assert.doesNotThrow(() => sm.updateAmbient(8.5));
  });

  it('_map() est correct', () => {
    const sm = new SoundManager();
    assert.ok(Math.abs(sm._map(0.5, 0, 1,  0, 100) -  50) < 0.001);
    assert.ok(Math.abs(sm._map(0,   0, 1, 10,  20) -  10) < 0.001);
    assert.ok(Math.abs(sm._map(1,   0, 1, 10,  20) -  20) < 0.001);
  });
});
