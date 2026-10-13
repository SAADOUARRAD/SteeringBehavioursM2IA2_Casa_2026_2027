let pursuer;
let targets = [];
let flares = [];

// Paramètres et options
let debugMode = false;
let flaresEnabled = true;

// Éléments d'interface utilisateur (UI)
let pursuerSpeedSlider, pursuerSpeedValue;
let targetSpeedSlider, targetSpeedValue;
let detectionRadiusSlider, detectionRadiusValue;
let toggleDebugBtn, toggleFlaresBtn;

function setup() {
  const controls = document.getElementById('controls');
  const canvasHeight = Math.max(1, windowHeight - (controls ? controls.offsetHeight : 0));
  const canvas = createCanvas(windowWidth, canvasHeight);
  canvas.parent('canvas-container');

  // 1. Création du poursuiveur (Pursuer hérite de Vehicle)
  pursuer = new Pursuer(width / 2, height / 2);

  // 2. Création de 4 cibles actives en même temps (exigence 2)
  targets = [];
  for (let i = 0; i < 4; i++) {
    const t = new Target(random(50, width - 50), random(50, height - 50));
    targets.push(t);
  }

  // 3. Liaison avec les contrôles de l'interface
  pursuerSpeedSlider = document.getElementById('pursuer-speed');
  pursuerSpeedValue = document.getElementById('pursuer-speed-value');
  targetSpeedSlider = document.getElementById('target-speed');
  targetSpeedValue = document.getElementById('target-speed-value');
  detectionRadiusSlider = document.getElementById('detection-radius');
  detectionRadiusValue = document.getElementById('detection-radius-value');
  toggleDebugBtn = document.getElementById('toggle-debug');
  toggleFlaresBtn = document.getElementById('toggle-flares');

  if (pursuerSpeedSlider) {
    pursuerSpeedSlider.addEventListener('input', () => {
      pursuerSpeedValue.textContent = pursuerSpeedSlider.value;
      if (pursuer) pursuer.maxSpeed = Number(pursuerSpeedSlider.value);
    });
  }

  if (targetSpeedSlider) {
    targetSpeedSlider.addEventListener('input', () => {
      targetSpeedValue.textContent = targetSpeedSlider.value;
      const spd = Number(targetSpeedSlider.value);
      for (const t of targets) {
        t.normalSpeed = spd;
        t.fleeSpeed = spd * 1.8;
      }
    });
  }

  if (detectionRadiusSlider) {
    detectionRadiusSlider.addEventListener('input', () => {
      detectionRadiusValue.textContent = `${detectionRadiusSlider.value} px`;
      const rad = Number(detectionRadiusSlider.value);
      for (const t of targets) {
        t.rayonDetection = rad;
      }
    });
  }

  function toggleDebug() {
    debugMode = !debugMode;
    if (toggleDebugBtn) {
      toggleDebugBtn.textContent = debugMode ? '🛠️ Debug [D] : ON' : '🛠️ Debug [D] : OFF';
      toggleDebugBtn.style.borderColor = debugMode ? '#00ff66' : '#4a5568';
    }
  }

  if (toggleDebugBtn) {
    toggleDebugBtn.addEventListener('click', toggleDebug);
  }

  if (toggleFlaresBtn) {
    toggleFlaresBtn.addEventListener('click', () => {
      flaresEnabled = !flaresEnabled;
      toggleFlaresBtn.textContent = flaresEnabled ? '✨ Leurres (Flares) : ON' : '✨ Leurres (Flares) : OFF';
    });
  }

  // Raccourci touche 'd' pour le mode debug
  window.addEventListener('keydown', event => {
    if (event.key === 'd' || event.key === 'D') {
      toggleDebug();
    }
  });
}

function draw() {
  background(12, 14, 20);

  // Grille subtile d'arrière-plan pour apprécier les trajectoires de précision
  drawSubtleGrid();

  const dt = (typeof deltaTime !== 'undefined' && deltaTime > 0)
    ? Math.min(0.1, deltaTime / 1000)
    : (1 / 60);

  // Maintenir exactement 4 cibles en permanence
  while (targets.length < 4) {
    targets.push(new Target(random(width), random(height)));
  }

  // 1. Trouver en permanence la cible la plus proche (exigence 3)
  const target = cibleLaPlusProche(pursuer, targets);

  // 2. Poursuite prédictive et tracé de la trajectoire de haute précision
  if (target) {
    const force = pursuer.pursueWithPrecision(target);
    pursuer.applyForce(force);

    // Dessin de la trajectoire prédictive laser et du réticule de ciblage
    pursuer.drawPrecisionTrajectory(target);
  }

  // Déplacement et rendu du poursuiveur
  pursuer.update();
  pursuer.edges();
  pursuer.show();

  // 3. Mise à jour et affichage des 4 cibles
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];

    // Mise à jour de la détection et largage éventuel de leurres (Flares)
    t.updateBehavior(pursuer, flares, dt, flaresEnabled);
    t.show(debugMode);

    // Collision : si le poursuiveur attrape une cible, elle réapparaît aléatoirement
    const d = p5.Vector.dist(pursuer.pos, t.pos);
    if (d < pursuer.r + t.r) {
      // Réapparition aléatoire pour conserver toujours 4 cibles
      t.pos.set(random(50, width - 50), random(50, height - 50));
      t.vel = p5.Vector.random2D().mult(t.normalSpeed);
    }
  }

  // 4. Gestion des leurres (Flares) : mise à jour, affichage et destruction après 1 seconde (exigence 4)
  for (let i = flares.length - 1; i >= 0; i--) {
    const flare = flares[i];
    flare.update(dt);
    flare.show();

    // Destruction automatique après 1s
    if (flare.isDead()) {
      flares.splice(i, 1);
    }
  }

  // Affichage d'informations en mode debug
  if (debugMode && target) {
    drawDebugOverlay(target);
  }
}

// Fonction de recherche de la cible la plus proche du poursuiveur
function cibleLaPlusProche(vehicle, targetList) {
  if (!targetList || targetList.length === 0) return null;
  let cibleProche = null;
  let distanceMin = Infinity;

  for (let i = 0; i < targetList.length; i++) {
    const t = targetList[i];
    const d = p5.Vector.dist(vehicle.pos, t.pos);
    if (d < distanceMin) {
      distanceMin = d;
      cibleProche = t;
    }
  }

  return cibleProche;
}

// Téléportation au clic de souris pour tester des scénarios d'interception
function mouseClicked() {
  const controls = document.getElementById('controls');
  if (controls && mouseY < controls.offsetHeight) return;
  if (pursuer) {
    pursuer.pos.set(mouseX, mouseY);
  }
}

function windowResized() {
  const controls = document.getElementById('controls');
  const canvasHeight = Math.max(1, windowHeight - (controls ? controls.offsetHeight : 0));
  resizeCanvas(windowWidth, canvasHeight);
}

function drawSubtleGrid() {
  push();
  stroke(255, 255, 255, 12);
  strokeWeight(1);
  const step = 60;
  for (let x = 0; x < width; x += step) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += step) {
    line(0, y, width, y);
  }
  pop();
}

function drawDebugOverlay(currentTarget) {
  push();
  fill(255);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  const d = Math.round(p5.Vector.dist(pursuer.pos, currentTarget.pos));
  text(`[DEBUG] Cibles actives : ${targets.length}`, 16, 16);
  text(`[DEBUG] Distance cible la plus proche : ${d} px`, 16, 32);
  text(`[DEBUG] Anticipation : ${Math.round(pursuer.predictionLookaheadFrames || 0)} frames`, 16, 48);
  text(`[DEBUG] Leurres actifs en vol : ${flares.length}`, 16, 64);
  pop();
}
