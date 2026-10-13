/**
 * sketch.js — 3-Arrival : Serpents réels + Steering Behaviors
 * - Serpent 1 : contrôlé par la souris (ou main MediaPipe)
 * - Serpent 2 : autonome (wander + arrive vers la nourriture la plus proche)
 * - Fond : terrarium sombre animé (jungle/marécage)
 * - Tous les objets étendent Vehicle
 */

let snakes   = [];
let foods    = [];
let particles = [];
let handTarget;
let font;

// MediaPipe
let hands, mpCamera;
let handDetected = false;

// Fond animé
let bgGrassOffsets = [];
let bgPebbles      = [];

const NUM_FOOD = 10;

// ────────────────────────────────────────────────
function preload() {
  font = loadFont('./assets/inconsolata.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  textFont(font);
  angleMode(RADIANS);

  // Génère les détails du fond une seule fois
  initBackground();

  // Cible de main
  handTarget = new HandTarget();

  // Serpents
  // Serpent 1 — vert jungle, contrôlé souris/main
  let s1 = new Snake(width * 0.3, height * 0.5, 110);
  s1.maxSpeed = 4;

  // Serpent 2 — orange, autonome
  let s2 = new Snake(width * 0.7, height * 0.5, 25);
  s2.maxSpeed = 3.2;

  snakes.push(s1, s2);

  // Nourriture
  spawnFood(NUM_FOOD);

  // UI
  setupUI();

  // MediaPipe (optionnel)
  setupMediaPipe();
}

// ────────────────────────────────────────────────
function draw() {
  // Fond terrarium
  drawBackground();

  // Nourriture
  for (let f of foods) {
    f.update();
    f.show();
  }

  // Serpent 1 : souris ou main
  let s1 = snakes[0];
  if (handDetected && handTarget.active) {
    s1.steerToward(handTarget);
  } else {
    s1.steerToward(createVector(mouseX, mouseY));
  }

  // Serpent 2 : autonome — cherche la nourriture la plus proche
  let s2 = snakes[1];
  let nearestFood = findNearestFood(s2);
  if (nearestFood) {
    let f = s2.arrive(nearestFood.pos, 0);
    s2.applyForce(f);
  } else {
    s2.applyForce(s2.wander());
  }

  // Mise à jour + dessin serpents
  for (let s of snakes) {
    s.update();
    let idx = s.tryEat(foods, particles);
    if (idx !== -1) foods[idx].respawn();
    s.showAll();
  }

  // Particules
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].isDead()) particles.splice(i, 1);
  }

  // Main MediaPipe
  handTarget.show();

  // HUD
  drawHUD();
}

// ─── Fond terrarium ─────────────────────────────────────────────────────────
function initBackground() {
  bgGrassOffsets = [];
  bgPebbles      = [];

  // Brins d'herbe / joncs
  for (let i = 0; i < 80; i++) {
    bgGrassOffsets.push({
      x:     random(width),
      baseY: random(height * 0.6, height),
      h:     random(30, 90),
      sw:    random(1, 3),
      phase: random(TWO_PI),
      spd:   random(0.015, 0.04),
      col:   color(random(60, 110), random(120, 180), random(40, 80))
    });
  }

  // Galets / cailloux
  for (let i = 0; i < 35; i++) {
    bgPebbles.push({
      x: random(width),
      y: random(height),
      rx: random(12, 35),
      ry: random(8, 22),
      a: random(TWO_PI),
      col: color(random(40, 80), random(50, 90), random(40, 70))
    });
  }
}

function drawBackground() {
  // Sol sombre (vert-marron profond)
  background(18, 32, 18);

  // Taches de sol : zones sableuses/vaseuses
  push();
  noStroke();
  for (let i = 0; i < 6; i++) {
    let cx = (width  * (i + 0.5)) / 6;
    let cy = (height * (i % 2 === 0 ? 0.4 : 0.7));
    fill(35, 55, 28, 60);
    ellipse(cx, cy, width * 0.45, height * 0.35);
  }
  pop();

  // Galets
  push();
  noStroke();
  for (let p of bgPebbles) {
    fill(p.col);
    push();
    translate(p.x, p.y);
    rotate(p.a);
    ellipse(0, 0, p.rx * 2, p.ry * 2);
    // Reflet sur le galet
    fill(255, 255, 255, 25);
    ellipse(-p.rx * 0.2, -p.ry * 0.25, p.rx * 0.7, p.ry * 0.5);
    pop();
  }
  pop();

  // Herbes / joncs animés
  push();
  for (let g of bgGrassOffsets) {
    let sway = sin(frameCount * g.spd + g.phase) * 8;
    stroke(g.col);
    strokeWeight(g.sw);
    // Courbe de Bézier pour l'herbe
    noFill();
    beginShape();
    curveVertex(g.x,         g.baseY);
    curveVertex(g.x,         g.baseY);
    curveVertex(g.x + sway * 0.5, g.baseY - g.h * 0.5);
    curveVertex(g.x + sway,       g.baseY - g.h);
    curveVertex(g.x + sway,       g.baseY - g.h);
    endShape();
  }
  pop();

  // Reflet lumineux diffus (lumière de terrarium par le haut)
  push();
  noStroke();
  for (let i = 0; i < 3; i++) {
    let alpha = map(i, 0, 2, 18, 4);
    fill(120, 200, 80, alpha);
    ellipse(width * 0.5, -40, width * (0.8 + i * 0.3), 200 + i * 60);
  }
  pop();

  // Légère vignette noire sur les bords
  push();
  noFill();
  for (let i = 0; i < 5; i++) {
    let alpha = map(i, 0, 4, 60, 0);
    stroke(0, 0, 0, alpha);
    strokeWeight(60 - i * 10);
    rect(0, 0, width, height);
  }
  pop();
}

// ─── HUD ────────────────────────────────────────────────────────────────────
function drawHUD() {
  push();
  textFont(font);
  textSize(15);
  noStroke();

  let labels = [
    { label: '🟢 Serpent 1 (Souris/Main)', col: color(100, 230, 100) },
    { label: '🟠 Serpent 2 (Autonome)',    col: color(255, 160, 60)  }
  ];
  for (let i = 0; i < snakes.length; i++) {
    let s = snakes[i];
    fill(0, 0, 0, 100);
    rect(10, 8 + i * 26, 310, 22, 6);
    fill(labels[i].col);
    text(`${labels[i].label}  Score: ${s.score}  Segments: ${s.segments.length}`,
         18, 24 + i * 26);
  }

  if (Vehicle.debug) {
    fill(255, 220, 50);
    text('DEBUG ON  (d = off)', 18, 24 + snakes.length * 26 + 10);
  }
  if (handDetected && handTarget.active) {
    fill(80, 200, 255);
    text('✋ Main détectée — contrôle S1', 18, 24 + snakes.length * 26 + 34);
  }
  pop();
}

// ─── Utilitaires ────────────────────────────────────────────────────────────
function spawnFood(n) {
  for (let i = 0; i < n; i++) {
    foods.push(new Food(random(40, width - 40), random(40, height - 40)));
  }
}

function findNearestFood(snake) {
  let minD = Infinity, nearest = null;
  for (let f of foods) {
    if (f.eaten) continue;
    let d = p5.Vector.dist(snake.pos, f.pos);
    if (d < minD) { minD = d; nearest = f; }
  }
  return nearest;
}

// ─── UI ─────────────────────────────────────────────────────────────────────
function setupUI() {
  let panel = createDiv('');
  panel.style('position',        'fixed');
  panel.style('bottom',          '16px');
  panel.style('left',            '16px');
  panel.style('background',      'rgba(10,25,10,0.72)');
  panel.style('border',          '1px solid rgba(100,200,80,0.35)');
  panel.style('border-radius',   '12px');
  panel.style('padding',         '12px 18px');
  panel.style('color',           '#b8ffb0');
  panel.style('font-family',     'monospace');
  panel.style('font-size',       '13px');
  panel.style('z-index',         '100');
  panel.style('backdrop-filter', 'blur(6px)');

  panel.html(`
    <div style="margin-bottom:8px;color:#7fffaa;font-weight:bold">🐍 Contrôles</div>
    <label>Vitesse S1 : <span id="v1">4</span>
      <br><input type="range" id="sl-s1" min="1" max="10" step="0.5" value="4">
    </label>
    <label>Vitesse S2 : <span id="v2">3.2</span>
      <br><input type="range" id="sl-s2" min="1" max="10" step="0.5" value="3.2">
    </label>
    <label>Nourriture : <span id="vf">${NUM_FOOD}</span>
      <br><input type="range" id="sl-food" min="3" max="25" step="1" value="${NUM_FOOD}">
    </label>
    <div style="margin-top:8px;opacity:0.65">
      <b>d</b> = debug &nbsp;|&nbsp; <b>r</b> = reset
    </div>
  `);

  setTimeout(() => {
    let s1El   = document.getElementById('sl-s1');
    let s2El   = document.getElementById('sl-s2');
    let foodEl = document.getElementById('sl-food');
    if (s1El) s1El.addEventListener('input', () => {
      if (snakes[0]) snakes[0].maxSpeed = +s1El.value;
      document.getElementById('v1').textContent = s1El.value;
    });
    if (s2El) s2El.addEventListener('input', () => {
      if (snakes[1]) snakes[1].maxSpeed = +s2El.value;
      document.getElementById('v2').textContent = s2El.value;
    });
    if (foodEl) foodEl.addEventListener('input', () => {
      let n = parseInt(foodEl.value);
      document.getElementById('vf').textContent = n;
      while (foods.length < n)
        foods.push(new Food(random(40, width - 40), random(40, height - 40)));
      while (foods.length > n) foods.pop();
    });
  }, 400);
}

// ─── MediaPipe ───────────────────────────────────────────────────────────────
function setupMediaPipe() {
  try {
    if (typeof Hands === 'undefined') {
      console.warn('MediaPipe non disponible — contrôle souris actif.');
      return;
    }
    hands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    hands.setOptions({
      maxNumHands:          1,
      modelComplexity:      1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence:  0.5
    });
    hands.onResults(results => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        let tip = results.multiHandLandmarks[0][8];
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
        onFrame: async () => { await hands.send({ image: vid }); },
        width: 640, height: 480
      });
      mpCamera.start();
    }
  } catch (e) {
    console.warn('Erreur MediaPipe :', e.message);
  }
}

// ─── Clavier / Fenêtre ───────────────────────────────────────────────────────
function keyPressed() {
  if (key === 'd' || key === 'D') Vehicle.debug = !Vehicle.debug;
  if (key === 'r' || key === 'R') {
    snakes    = [];
    foods     = [];
    particles = [];
    initBackground();
    snakes.push(new Snake(width * 0.3, height * 0.5, 110));
    snakes.push(new Snake(width * 0.7, height * 0.5,  25));
    snakes[0].maxSpeed = 4;
    snakes[1].maxSpeed = 3.2;
    spawnFood(NUM_FOOD);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initBackground();
}