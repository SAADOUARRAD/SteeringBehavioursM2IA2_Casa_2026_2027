/**
 * 5-3 Path Following Complex — Snakes & Véhicules
 *
 * Implémentation avancée :
 * - Suivi de chemin complexe multi-segments par les véhicules ET par les serpents
 * - Séparation active sur la tête ET sur tous les anneaux du serpent pour éviter
 *   toute superposition avec les véhicules en circulation
 * - Poids réglables en temps réel par curseurs pour le suivi de chemin et la séparation
 * - Touche "'" (apostrophe / quote) pour créer de nouveaux serpents
 * - Mode debug complet (touche 'd')
 */

let debug = false;
let path;
let vehicles = [];
let snakes = [];

// Poids des forces réglables par curseurs
let followPathWeight = 2.0;
let separateWeight = 2.5;
let snakeSpeed = 3.5;
let targetVehicleCount = 10;

// Éléments de l'interface utilisateur
let sliderFollow, valFollow;
let sliderSeparate, valSeparate;
let sliderSpeed, valSpeed;
let sliderVehicles, valVehicles;
let btnAddSnake, btnDebug, btnNewPath, btnClearSnakes;

function setup() {
  const controlsEl = document.getElementById('controls');
  const availableHeight = windowHeight;
  createCanvas(windowWidth, availableHeight);

  // 1. Génération du circuit en boucle fermée
  newPath();

  // 2. Initialisation des contrôles UI
  bindUIControls();

  // 3. Création des véhicules initiaux sur la piste
  syncVehicleCount(targetVehicleCount);

  // 4. Création d'un serpent initial sur la piste
  let startPt = path.points[0];
  let initialSnake = new Snake(startPt.x, startPt.y, 14, 14, '#2ecc71', snakeSpeed);
  initialSnake.setWeights(followPathWeight, separateWeight);
  snakes.push(initialSnake);
}

function draw() {
  background(20, 24, 32);

  // 1. Rendu stylisé du circuit (asphalte, vibreurs, ligne centrale)
  renderStyledPath(path);

  // 2. Liste combinée pour la séparation mutuelle
  // Récupération de tous les anneaux de tous les serpents
  let allSnakeSegments = [];
  for (let s of snakes) {
    allSnakeSegments.push(...s.getSegments());
  }

  // 3. Mise à jour et affichage des véhicules ordinaires
  // Les véhicules évitent les autres véhicules ET les anneaux des serpents
  let obstaclesForVehicles = [...vehicles, ...allSnakeSegments];
  for (let i = vehicles.length - 1; i >= 0; i--) {
    let v = vehicles[i];
    v.applyBehaviors(obstaclesForVehicles, path);
    v.run();
  }

  // 4. Mise à jour et affichage des serpents
  // Chaque serpent évite les véhicules et les autres serpents
  for (let s of snakes) {
    s.setWeights(followPathWeight, separateWeight);
    s.setSpeed(snakeSpeed);

    // Les entités à éviter sont les véhicules du circuit + les segments des AUTRES serpents
    let obstaclesForThisSnake = [
      ...vehicles,
      ...allSnakeSegments.filter((seg) => !s.anneaux.includes(seg))
    ];

    s.applyBehaviors(obstaclesForThisSnake, path);
    s.run(debug);
  }

  // 5. Affichage d'informations de débogage supplémentaires
  if (debug) {
    drawDebugOverlay();
  }
}

/**
 * Génère un circuit fluide et intéressant (forme fermée organique avec 28-32 segments)
 */
function newPath() {
  path = new Path();
  path.radius = 24;

  let nbSegments = 30;
  let angleStep = TWO_PI / nbSegments;
  let centerX = width / 2;
  let centerY = height / 2;
  let minDim = min(width, height);
  let radiusBase = minDim * 0.36;

  for (let i = 0; i < nbSegments; i++) {
    let angle = i * angleStep;
    // Modulation harmonique pour donner des virages serrés et de longues lignes droites
    let variation = sin(angle * 3) * (minDim * 0.08) + cos(angle * 2) * (minDim * 0.05);
    let r = radiusBase + variation;
    let x = centerX + cos(angle) * r;
    let y = centerY + sin(angle) * r;
    path.addPoint(x, y);
  }
}

/**
 * Rendu esthétique de la piste (asphalte foncé, bordures / vibreurs, ligne médiane en pointillés)
 */
function renderStyledPath(p) {
  if (!p || p.points.length < 2) return;

  push();
  strokeJoin(ROUND);
  strokeCap(ROUND);

  // 1. Bordure extérieure / Vibreurs (rouge et blanc alterné ou liseré cyan)
  noFill();
  stroke(40, 50, 68);
  strokeWeight(p.radius * 2 + 10);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 2. Asphalte de la route
  stroke(28, 33, 44);
  strokeWeight(p.radius * 2);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 3. Ligne médiane discrète
  stroke(100, 130, 170, 70);
  strokeWeight(1.5);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // Si debug, afficher les points de contrôle
  if (debug) {
    stroke(255, 100, 100, 120);
    strokeWeight(1);
    for (let pt of p.points) {
      fill(255, 150, 0);
      noStroke();
      circle(pt.x, pt.y, 6);
    }
  }

  pop();
}

/**
 * Crée un nouveau véhicule ordinaire sur la piste
 */
function newVehicle(x, y) {
  let ms = random(2.5, 4.5);
  let mf = 0.35;
  let v = new Vehicle(x, y, ms, mf);
  v.r = 10;
  v.couleur = random(['#3498db', '#9b59b6', '#e74c3c', '#f1c40f', '#e67e22']);
  v.followPathWeight = 2.0;
  v.separateWeight = 2.0;
  vehicles.push(v);
  return v;
}

/**
 * Ajuste la population de véhicules
 */
function syncVehicleCount(targetCount) {
  while (vehicles.length < targetCount) {
    let randPt = path.points[Math.floor(random(path.points.length))];
    let offset = p5.Vector.random2D().mult(random(path.radius * 0.8));
    newVehicle(randPt.x + offset.x, randPt.y + offset.y);
  }
  while (vehicles.length > targetCount) {
    vehicles.pop();
  }
}

/**
 * Crée un nouveau serpent complet à la position spécifiée
 */
function addSnake(x, y) {
  let posX = x !== undefined ? x : mouseX;
  let posY = y !== undefined ? y : mouseY;

  // Si position hors champ, utiliser un point du circuit
  if (posX <= 0 || posX >= width || posY <= 0 || posY >= height) {
    let pt = path.points[Math.floor(random(path.points.length))];
    posX = pt.x;
    posY = pt.y;
  }

  let nbAnneaux = Math.floor(random(10, 16));
  let taille = random(12, 16);
  let snake = new Snake(posX, posY, nbAnneaux, taille, null, snakeSpeed);
  snake.setWeights(followPathWeight, separateWeight);
  snakes.push(snake);
  return snake;
}

/**
 * Liaison des curseurs et boutons HTML
 */
function bindUIControls() {
  sliderFollow = document.getElementById('slider-follow');
  valFollow = document.getElementById('val-follow');
  sliderSeparate = document.getElementById('slider-separate');
  valSeparate = document.getElementById('val-separate');
  sliderSpeed = document.getElementById('slider-speed');
  valSpeed = document.getElementById('val-speed');
  sliderVehicles = document.getElementById('slider-vehicles');
  valVehicles = document.getElementById('val-vehicles');

  btnAddSnake = document.getElementById('btn-add-snake');
  btnDebug = document.getElementById('btn-debug');
  btnNewPath = document.getElementById('btn-new-path');
  btnClearSnakes = document.getElementById('btn-clear-snakes');

  if (sliderFollow) {
    sliderFollow.addEventListener('input', () => {
      followPathWeight = parseFloat(sliderFollow.value);
      if (valFollow) valFollow.textContent = followPathWeight.toFixed(1);
    });
  }

  if (sliderSeparate) {
    sliderSeparate.addEventListener('input', () => {
      separateWeight = parseFloat(sliderSeparate.value);
      if (valSeparate) valSeparate.textContent = separateWeight.toFixed(1);
    });
  }

  if (sliderSpeed) {
    sliderSpeed.addEventListener('input', () => {
      snakeSpeed = parseFloat(sliderSpeed.value);
      if (valSpeed) valSpeed.textContent = snakeSpeed.toFixed(1);
      for (let s of snakes) s.setSpeed(snakeSpeed);
    });
  }

  if (sliderVehicles) {
    sliderVehicles.addEventListener('input', () => {
      targetVehicleCount = parseInt(sliderVehicles.value, 10);
      if (valVehicles) valVehicles.textContent = targetVehicleCount;
      syncVehicleCount(targetVehicleCount);
    });
  }

  if (btnAddSnake) {
    btnAddSnake.addEventListener('click', () => {
      addSnake(mouseX, mouseY);
    });
  }

  if (btnDebug) {
    btnDebug.addEventListener('click', toggleDebug);
  }

  if (btnNewPath) {
    btnNewPath.addEventListener('click', () => {
      newPath();
    });
  }

  if (btnClearSnakes) {
    btnClearSnakes.addEventListener('click', () => {
      snakes = [];
    });
  }
}

/**
 * Bascule du mode debug (touche D ou bouton UI)
 */
function toggleDebug() {
  debug = !debug;
  Vehicle.debug = debug;
  if (btnDebug) {
    btnDebug.textContent = `Debug [D] : ${debug ? 'ON' : 'OFF'}`;
    btnDebug.style.borderColor = debug ? '#ebcb8b' : 'rgba(255,255,255,0.18)';
  }
}

/**
 * Affichage des métriques et diagnostics en mode debug
 */
function drawDebugOverlay() {
  push();
  noStroke();
  fill(255);
  textSize(13);
  textAlign(LEFT, TOP);

  let startY = 80;
  fill(0, 0, 0, 160);
  rect(12, startY - 6, 260, 110, 8);

  fill('#ebcb8b');
  text(`[MODE DEBUG ACTIF]`, 20, startY);
  fill('#eceff4');
  text(`Serpents actifs : ${snakes.length}`, 20, startY + 20);
  text(`Total anneaux (sub-vehicles) : ${snakes.reduce((acc, s) => acc + s.anneaux.length, 0)}`, 20, startY + 38);
  text(`Véhicules circuit : ${vehicles.length}`, 20, startY + 56);
  text(`Poids Follow / Separate : ${followPathWeight.toFixed(1)} / ${separateWeight.toFixed(1)}`, 20, startY + 74);
  pop();
}

/**
 * Gestion du clavier
 * Exigence : la touche "'" sert à créer de nouveaux serpents
 */
function keyPressed(event) {
  // Touche ' (apostrophe / quote) pour créer un nouveau Snake
  if (key === "'" || (event && (event.key === "'" || event.code === 'Quote'))) {
    addSnake(mouseX, mouseY);
  } else if (key === 'd' || key === 'D') {
    toggleDebug();
  } else if (key === 'w' || key === 'W') {
    // Créer un serpent libre (SnakeWander)
    let sw = new SnakeWander(mouseX, mouseY, 12, 14, '#f39c12');
    sw.setWeights(followPathWeight, separateWeight);
    snakes.push(sw);
  } else if (key === 'v' || key === 'V') {
    newVehicle(mouseX, mouseY);
  }
}

/**
 * Clic ou glisser de souris pour générer des véhicules
 */
function mouseDragged() {
  const controlsEl = document.getElementById('controls');
  if (controlsEl && mouseY < controlsEl.offsetHeight + 20) return;
  if (frameCount % 4 === 0) {
    newVehicle(mouseX, mouseY);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  newPath();
}
