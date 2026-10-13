/**
 * sketch.js — 3-Arrival : Serpents + Steering + Audio
 */

let snakes    = [];
let foods     = [];
let particles = [];
let handTarget;
let soundMgr;
let font;

// MediaPipe
let mpHands, mpCamera;
let handDetected = false;

// Fond
let bgGrassOffsets = [];
let bgPebbles      = [];
let bgHueShift     = 0;

// Paramètres globaux (liés aux sliders)
const P = {
  speed1:         4,
  speed2:         3.2,
  force1:         0.4,
  force2:         0.35,
  numFood:        10,
  segGap:         13,
  particlesOnEat: 18,
  bgSpeed:        1.0,
  soundVol:       0.55,
  soundOn:        true,
  wrapEdges:      true,
};

const NUM_SNAKES_HUE = [110, 25];  // vert-jungle, orange

// ─── Preload ──────────────────────────────────────────────────────────────────
function preload() {
  font = loadFont('./assets/inconsolata.otf');
}

// ─── Setup ───────────────────────────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  textFont(font);
  angleMode(RADIANS);

  soundMgr  = new SoundManager();
  handTarget = new HandTarget();

  initBackground();
  resetScene();
  buildUI();
  setupMediaPipe();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw() {
  drawBackground();

  // Nourriture
  for (let f of foods) { f.update(); f.show(); }

  // Serpent 1 : souris ou main
  let s1 = snakes[0];
  if (handDetected && handTarget.active) {
    s1.steerToward(handTarget);
  } else {
    s1.steerToward(createVector(mouseX, mouseY));
  }

  // Serpent 2 : autonome
  let s2 = snakes[1];
  let nf = findNearestFood(s2);
  s2.applyForce(nf ? s2.arrive(nf.pos, 0) : s2.wander());

  // Mise à jour serpents
  let totalSpeed = 0;
  for (let s of snakes) {
    s.update();
    let idx = s.tryEat(foods, particles, P.particlesOnEat);
    if (idx !== -1) {
      foods[idx].respawn();
      soundMgr.playEat(s.hueVal);
      soundMgr.playGrow();
      soundMgr.playBurst();
    }
    s.showAll();
    totalSpeed += s.vel.mag();
  }

  // Mise à jour son ambiant
  soundMgr.updateAmbient(totalSpeed);

  // Particules
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].isDead()) particles.splice(i, 1);
  }

  handTarget.show();
  drawHUD();
}

// ─── Scène ────────────────────────────────────────────────────────────────────
function resetScene() {
  snakes    = [];
  foods     = [];
  particles = [];

  let s1 = new Snake(width * 0.3, height * 0.5, NUM_SNAKES_HUE[0]);
  s1.maxSpeed = P.speed1;
  s1.maxForce = P.force1;

  let s2 = new Snake(width * 0.7, height * 0.5, NUM_SNAKES_HUE[1]);
  s2.maxSpeed = P.speed2;
  s2.maxForce = P.force2;

  snakes.push(s1, s2);
  spawnFood(P.numFood);
}

function spawnFood(n) {
  for (let i = 0; i < n; i++)
    foods.push(new Food(random(50, width - 50), random(50, height - 50)));
}

function findNearestFood(snake) {
  let minD = Infinity, best = null;
  for (let f of foods) {
    if (f.eaten) continue;
    let d = p5.Vector.dist(snake.pos, f.pos);
    if (d < minD) { minD = d; best = f; }
  }
  return best;
}

// ─── Fond terrarium ───────────────────────────────────────────────────────────
function initBackground() {
  bgGrassOffsets = [];
  bgPebbles      = [];
  for (let i = 0; i < 80; i++) {
    bgGrassOffsets.push({
      x: random(width), baseY: random(height * 0.55, height),
      h: random(28, 88), sw: random(0.8, 2.8),
      phase: random(TWO_PI), spd: random(0.012, 0.038),
      r: random(55, 110), g: random(110, 180), b: random(35, 75)
    });
  }
  for (let i = 0; i < 38; i++) {
    bgPebbles.push({
      x: random(width), y: random(height),
      rx: random(12, 34), ry: random(7, 20),
      a: random(TWO_PI),
      r: random(38, 75), g: random(48, 88), b: random(35, 65)
    });
  }
}

function drawBackground() {
  background(17, 30, 16);

  // Zones vaseuses
  push();
  noStroke();
  for (let i = 0; i < 5; i++) {
    fill(32, 52, 25, 55);
    ellipse(width * (i * 0.25), height * (i % 2 === 0 ? 0.38 : 0.72),
            width * 0.5, height * 0.32);
  }
  pop();

  // Galets
  push();
  noStroke();
  for (let p of bgPebbles) {
    fill(p.r, p.g, p.b);
    push();
    translate(p.x, p.y);
    rotate(p.a);
    ellipse(0, 0, p.rx * 2, p.ry * 2);
    fill(255, 255, 255, 22);
    ellipse(-p.rx * 0.2, -p.ry * 0.25, p.rx * 0.65, p.ry * 0.45);
    pop();
  }
  pop();

  // Herbes animées
  let t = frameCount * P.bgSpeed;
  push();
  for (let g of bgGrassOffsets) {
    let sway = sin(t * g.spd + g.phase) * 9;
    stroke(g.r, g.g, g.b);
    strokeWeight(g.sw);
    noFill();
    beginShape();
    curveVertex(g.x, g.baseY);
    curveVertex(g.x, g.baseY);
    curveVertex(g.x + sway * 0.4, g.baseY - g.h * 0.5);
    curveVertex(g.x + sway, g.baseY - g.h);
    curveVertex(g.x + sway, g.baseY - g.h);
    endShape();
  }
  pop();

  // Lumière terrarium (haut)
  push();
  noStroke();
  for (let i = 0; i < 4; i++) {
    fill(110, 195, 75, map(i, 0, 3, 16, 4));
    ellipse(width * 0.5, -30, width * (0.75 + i * 0.25), 180 + i * 55);
  }
  pop();

  // Vignette
  push();
  noFill();
  for (let i = 0; i < 5; i++) {
    stroke(0, 0, 0, map(i, 0, 4, 55, 0));
    strokeWeight(55 - i * 9);
    rect(0, 0, width, height);
  }
  pop();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD() {
  push();
  textFont(font);
  textSize(14);
  noStroke();
  let labels = [
    { t: '🟢 S1 Souris/Main', c: [90, 220, 90] },
    { t: '🟠 S2 Autonome',   c: [255, 155, 50] }
  ];
  for (let i = 0; i < snakes.length; i++) {
    let s = snakes[i];
    fill(0, 0, 0, 90);
    rect(10, 8 + i * 26, 320, 22, 5);
    fill(labels[i].c[0], labels[i].c[1], labels[i].c[2]);
    text(`${labels[i].t}  Score: ${s.score}  Segs: ${s.segments.length}  Spd: ${nf(s.vel.mag(), 1)}`,
         18, 24 + i * 26);
  }
  if (Vehicle.debug) {
    fill(255, 220, 40);
    text('DEBUG ON  (d)', 18, 24 + snakes.length * 26 + 10);
  }
  if (handDetected && handTarget.active) {
    fill(70, 195, 255);
    text('✋ Main détectée', 18, 24 + snakes.length * 26 + 32);
  }
  pop();
}

// ─── UI avancée ──────────────────────────────────────────────────────────────
function buildUI() {
  // Bouton pour ouvrir/fermer
  let btn = createButton('⚙ Paramètres');
  btn.style('position',      'fixed');
  btn.style('top',           '12px');
  btn.style('right',         '12px');
  btn.style('z-index',       '200');
  btn.style('background',    'rgba(10,30,10,0.82)');
  btn.style('color',         '#7fffaa');
  btn.style('border',        '1px solid rgba(100,200,80,0.45)');
  btn.style('border-radius', '8px');
  btn.style('padding',       '7px 16px');
  btn.style('font-family',   'monospace');
  btn.style('font-size',     '14px');
  btn.style('cursor',        'pointer');
  btn.style('backdrop-filter','blur(4px)');

  // Panneau
  let panel = createDiv('');
  panel.id('adv-panel');
  panel.style('position',       'fixed');
  panel.style('top',            '52px');
  panel.style('right',          '12px');
  panel.style('width',          '290px');
  panel.style('background',     'rgba(8,22,8,0.90)');
  panel.style('border',         '1px solid rgba(100,200,80,0.3)');
  panel.style('border-radius',  '12px');
  panel.style('padding',        '14px 18px 18px');
  panel.style('color',          '#c8ffc0');
  panel.style('font-family',    'monospace');
  panel.style('font-size',      '12px');
  panel.style('z-index',        '150');
  panel.style('backdrop-filter','blur(8px)');
  panel.style('display',        'none');
  panel.style('max-height',     'calc(100vh - 80px)');
  panel.style('overflow-y',     'auto');

  panel.html(`
  <div style="color:#7fffaa;font-size:14px;font-weight:bold;margin-bottom:12px">🐍 Paramètres avancés</div>

  <div class="sec">🏃 Serpent 1 (Souris/Main)</div>
  ${slider('s1-spd',  'Vitesse max',   P.speed1, 0.5, 12,  0.5)}
  ${slider('s1-frc',  'Force max',     P.force1, 0.05, 2, 0.05)}

  <div class="sec">🤖 Serpent 2 (Autonome)</div>
  ${slider('s2-spd',  'Vitesse max',   P.speed2, 0.5, 12,  0.5)}
  ${slider('s2-frc',  'Force max',     P.force2, 0.05, 2, 0.05)}

  <div class="sec">🍔🍕 Burgers & Pizzas</div>
  ${slider('num-food','Nb. plats',     P.numFood, 2, 30, 1)}
  ${slider('seg-gap', 'Écart segments',P.segGap, 5, 28, 1)}
  ${slider('ptcl-cnt','Particules/repas',P.particlesOnEat, 0, 40, 1)}

  <div class="sec">🌿 Visuel</div>
  ${slider('bg-spd',  'Vitesse herbes',P.bgSpeed, 0.1, 4, 0.1)}
  <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <input type="checkbox" id="wrap-edges" ${P.wrapEdges ? 'checked' : ''}>
    Boucle aux bords
  </label>

  <div class="sec">🔊 Audio</div>
  ${slider('snd-vol', 'Volume master', Math.round(P.soundVol*100), 0, 100, 1, '%')}
  <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <input type="checkbox" id="snd-on" ${P.soundOn ? 'checked' : ''}>
    Sons activés
  </label>

  <div class="sec">🛠 Actions</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
    <button id="btn-reset"  class="act">↺ Reset</button>
    <button id="btn-debug"  class="act">🐛 Debug</button>
    <button id="btn-spawn"  class="act">+ Burger/Pizza</button>
  </div>

  <style>
    .sec{color:#5dffa0;font-size:11px;text-transform:uppercase;
         letter-spacing:0.08em;margin:12px 0 6px;border-bottom:1px solid rgba(100,200,80,0.2);padding-bottom:3px}
    .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
    .val{min-width:36px;text-align:right;color:#7fffaa}
    input[type=range]{width:155px;accent-color:#5dffa0;cursor:pointer}
    input[type=checkbox]{accent-color:#5dffa0;cursor:pointer;width:14px;height:14px}
    .act{background:rgba(30,80,30,0.7);color:#9fffb0;border:1px solid rgba(100,200,80,0.4);
         border-radius:6px;padding:5px 10px;font-family:monospace;font-size:11px;cursor:pointer}
    .act:hover{background:rgba(50,120,50,0.8)}
  </style>
  `);

  // Toggle panel
  btn.mousePressed(() => {
    let p = document.getElementById('adv-panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
    // Initialise le son dès le premier clic
    soundMgr.init();
  });

  // Branche les sliders après rendu
  setTimeout(() => bindUI(), 300);
}

function slider(id, label, val, min, max, step, unit = '') {
  return `<div class="row">
    <span>${label}</span>
    <span class="val" id="v-${id}">${val}${unit}</span>
  </div>
  <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"
         style="margin-bottom:8px;display:block">`;
}

function bindUI() {
  // Helper
  const sl = (id, cb) => {
    let el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      cb(v);
      let vEl = document.getElementById('v-' + id);
      if (vEl) vEl.textContent = el.value + (el.dataset.unit || '');
    });
  };
  const ck = (id, cb) => {
    let el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => cb(el.checked));
  };
  const bt = (id, cb) => {
    let el = document.getElementById(id);
    if (el) el.addEventListener('click', cb);
  };

  // Serpent 1
  sl('s1-spd', v => { P.speed1 = v; if (snakes[0]) snakes[0].maxSpeed = v; });
  sl('s1-frc', v => { P.force1 = v; if (snakes[0]) snakes[0].maxForce = v; });

  // Serpent 2
  sl('s2-spd', v => { P.speed2 = v; if (snakes[1]) snakes[1].maxSpeed = v; });
  sl('s2-frc', v => { P.force2 = v; if (snakes[1]) snakes[1].maxForce = v; });

  // Nourriture
  sl('num-food', v => {
    P.numFood = Math.round(v);
    while (foods.length < P.numFood)
      foods.push(new Food(random(50, width - 50), random(50, height - 50)));
    while (foods.length > P.numFood) foods.pop();
  });
  sl('seg-gap', v => {
    P.segGap = v;
    for (let s of snakes)
      for (let seg of s.segments) seg.segmentGap = v;
  });
  sl('ptcl-cnt', v => { P.particlesOnEat = Math.round(v); });

  // Visuel
  sl('bg-spd', v => { P.bgSpeed = v; });
  ck('wrap-edges', v => { P.wrapEdges = v; });

  // Audio
  sl('snd-vol', v => {
    P.soundVol = v / 100;
    soundMgr.setVolume(P.soundVol);
    let vEl = document.getElementById('v-snd-vol');
    if (vEl) vEl.textContent = v + '%';
  });
  ck('snd-on', v => { P.soundOn = v; soundMgr.setEnabled(v); });

  // Boutons
  bt('btn-reset', () => { resetScene(); });
  bt('btn-debug', () => { Vehicle.debug = !Vehicle.debug; });
  bt('btn-spawn', () => {
    for (let i = 0; i < 3; i++)
      foods.push(new Food(random(50, width - 50), random(50, height - 50)));
    P.numFood = foods.length;
    let el = document.getElementById('num-food');
    if (el) { el.value = P.numFood; }
    let vEl = document.getElementById('v-num-food');
    if (vEl) vEl.textContent = P.numFood;
  });
}

// ─── MediaPipe ────────────────────────────────────────────────────────────────
function setupMediaPipe() {
  try {
    if (typeof Hands === 'undefined') return;
    mpHands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    mpHands.setOptions({ maxNumHands:1, modelComplexity:1,
      minDetectionConfidence:0.7, minTrackingConfidence:0.5 });
    mpHands.onResults(r => {
      if (r.multiHandLandmarks && r.multiHandLandmarks.length > 0) {
        let tip = r.multiHandLandmarks[0][8];
        handTarget.updateFromLandmark(tip.x, tip.y);
        handDetected = true;
      } else {
        handTarget.setInactive();
        handDetected = false;
      }
    });
    if (typeof Camera !== 'undefined') {
      let vid = document.getElementById('mediapipe-video');
      mpCamera = new Camera(vid, {
        onFrame: async () => { await mpHands.send({ image: vid }); },
        width: 640, height: 480
      });
      mpCamera.start();
    }
  } catch (e) { console.warn('MediaPipe:', e.message); }
}

// ─── Clavier / Fenêtre ───────────────────────────────────────────────────────
function keyPressed() {
  soundMgr.init();   // autorise le contexte audio sur toute touche
  if (key === 'd' || key === 'D') Vehicle.debug = !Vehicle.debug;
  if (key === 'r' || key === 'R') { resetScene(); initBackground(); }
  if (key === 'm' || key === 'M') {
    P.soundOn = !P.soundOn;
    soundMgr.setEnabled(P.soundOn);
    let el = document.getElementById('snd-on');
    if (el) el.checked = P.soundOn;
  }
}

function mousePressed() {
  soundMgr.init();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initBackground();
}