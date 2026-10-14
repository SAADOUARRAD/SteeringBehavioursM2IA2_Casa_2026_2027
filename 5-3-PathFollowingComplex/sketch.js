/**
 * 5-3 Path Following Complex — Grand Prix Moto & Circuits Multi-Niveaux
 *
 * Implémentation complète :
 * - Motos de course GP (`Moto` hérite de `Vehicle`) suivant le circuit et évitant les collisions
 * - Équipes / Pelotons en aspiration (`MotoSquad` hérite de `Vehicle`)
 * - Particules d'échappement & flammes de Nitro (`ExhaustParticle` hérite de `Vehicle`)
 * - 4 Niveaux de circuits progressifs (Speedway, Monza, Monaco Nocturne, Figure 8)
 * - Séparation active et intelligente pour empêcher tout chevauchement entre motos
 * - Touche "'" (apostrophe / quote) pour créer instantanément de nouvelles motos
 * - Mode debug complet (touche 'd') avec télémétrie de course
 */

let debug = false;
let path;
let currentLevelIndex = 0;

// Collections d'entités
let motos = [];
let squads = [];
let vehicles = [];
let particles = [];

// Paramètres de pilotage
let followPathWeight = 2.2;
let separateWeight = 2.8;
let motoBaseSpeed = 4.2;
let paceCarCount = 4;

// Éléments UI
let selectLevel;
let sliderFollow, valFollow;
let sliderSeparate, valSeparate;
let sliderSpeed, valSpeed;
let btnAddMoto, btnAddSquad, btnNitro, btnDebug, btnNextLevel, btnClear;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. Initialisation du premier niveau
  loadLevel(currentLevelIndex);

  // 2. Liaison des contrôles UI
  bindUIControls();

  // 3. Grille de départ : 4 motos individuelles et 1 écurie en aspiration
  spawnInitialRacers();
}

function draw() {
  let level = RACING_LEVELS[currentLevelIndex];

  // 1. Arrière-plan du circuit (paddock, herbe, zones de dégagement)
  drawTrackEnvironment(level);

  // 2. Rendu de la piste de course asphaltée avec vibreurs et ligne de départ
  drawRacetrack(path, level);

  // 3. Regroupement de toutes les motos pour la séparation mutuelle
  let allBikes = [...motos];
  for (let sq of squads) {
    allBikes.push(...sq.getBikes());
  }
  let allObstacles = [...vehicles, ...allBikes];

  // 4. Mise à jour des voitures de sécurité / pace cars
  for (let i = vehicles.length - 1; i >= 0; i--) {
    let v = vehicles[i];
    v.applyBehaviors(allObstacles, path);
    v.run();
  }

  // 5. Mise à jour et pilotage des motos individuelles
  for (let m of motos) {
    m.followPathWeight = followPathWeight;
    m.separateWeight = separateWeight;
    // La moto évite tous les autres bolides sauf elle-même
    let otherEntities = allObstacles.filter((b) => b !== m);
    m.applyBehaviors(otherEntities, path, particles);
    m.update();
    m.render(debug);
  }

  // 6. Mise à jour des écuries en aspiration (MotoSquad)
  for (let sq of squads) {
    sq.setWeights(followPathWeight, separateWeight);
    let otherEntities = allObstacles.filter((b) => !sq.getBikes().includes(b));
    sq.applyBehaviors(otherEntities, path, particles);
    sq.render(debug);
  }

  // 7. Particules d'échappement et nitro
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.render();
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }

  // 8. Télémétrie et diagnostics en mode debug
  if (debug) {
    drawDebugOverlay(allBikes.length);
  }
}

/**
 * Charge un niveau donné
 */
function loadLevel(index) {
  currentLevelIndex = (index + RACING_LEVELS.length) % RACING_LEVELS.length;
  let level = RACING_LEVELS[currentLevelIndex];
  path = level.buildPath(width, height);

  // Repositionne les motos existantes sur le nouveau tracé
  repositionRacersOnPath();

  if (selectLevel) {
    selectLevel.value = currentLevelIndex;
  }
}

/**
 * Repositionne les pilotes sur le tracé actif
 */
function repositionRacersOnPath() {
  if (!path || path.points.length === 0) return;
  let step = Math.floor(path.points.length / Math.max(1, motos.length + squads.length));

  for (let i = 0; i < motos.length; i++) {
    let pt = path.points[(i * step) % path.points.length];
    motos[i].pos.set(pt.x + random(-10, 10), pt.y + random(-10, 10));
    motos[i].vel.set(motos[i].maxSpeed, 0);
  }
}

/**
 * Crée les pilotes initiaux de la grille de départ
 */
function spawnInitialRacers() {
  motos = [];
  squads = [];
  vehicles = [];
  particles = [];

  // Création de 4 motos de tête
  for (let i = 0; i < 4; i++) {
    let pt = path.points[(i * 3) % path.points.length];
    let m = new Moto(pt.x, pt.y, motoBaseSpeed + random(-0.3, 0.4));
    motos.push(m);
  }

  // Création d'une écurie en aspiration (3 motos)
  let squadPt = path.points[path.points.length - 4];
  let squad = new MotoSquad(squadPt.x, squadPt.y, 3, '#e74c3c', motoBaseSpeed);
  squads.push(squad);

  // Voiture de sécurité
  for (let i = 0; i < paceCarCount; i++) {
    let vPt = path.points[(i * 6 + 10) % path.points.length];
    let v = new Vehicle(vPt.x, vPt.y, 3.2, 0.3);
    v.couleur = '#ffffff';
    v.r = 12;
    vehicles.push(v);
  }
}

/**
 * Ajoute une nouvelle moto de course
 * Déclenché par la touche "'" (apostrophe) ou le bouton UI
 */
function addMoto(x, y) {
  let posX = x !== undefined ? x : mouseX;
  let posY = y !== undefined ? y : mouseY;

  // Si position hors champ ou sur les contrôles
  if (posX <= 10 || posX >= width - 10 || posY <= 60 || posY >= height - 10) {
    let randPt = path.points[Math.floor(random(path.points.length))];
    posX = randPt.x + random(-12, 12);
    posY = randPt.y + random(-12, 12);
  }

  let m = new Moto(posX, posY, motoBaseSpeed + random(-0.4, 0.5));
  m.followPathWeight = followPathWeight;
  m.separateWeight = separateWeight;
  motos.push(m);
  return m;
}

/**
 * Ajoute une écurie de 3 motos en formation d'aspiration
 */
function addMotoSquad(x, y) {
  let posX = x !== undefined ? x : mouseX;
  let posY = y !== undefined ? y : mouseY;

  if (posX <= 10 || posX >= width - 10 || posY <= 60 || posY >= height - 10) {
    let randPt = path.points[0];
    posX = randPt.x;
    posY = randPt.y;
  }

  let squad = new MotoSquad(posX, posY, 3, null, motoBaseSpeed);
  squad.setWeights(followPathWeight, separateWeight);
  squads.push(squad);
  return squad;
}

/**
 * Déclenche le Nitro pour toutes les motos
 */
function triggerGlobalNitro() {
  for (let m of motos) m.triggerNitro(90);
  for (let sq of squads) sq.triggerNitro(90);
}

/**
 * Arrière-plan du circuit adapté au niveau
 */
function drawTrackEnvironment(level) {
  if (level.id === 3) {
    // Ambiance urbaine nocturne : bitume bleu-nuit, lumières citadines
    background(10, 13, 20);
    // Légers halos d'éclairage urbain
    noStroke();
    fill(0, 180, 255, 6);
    circle(width * 0.25, height * 0.3, 400);
    circle(width * 0.75, height * 0.7, 450);
  } else if (level.id === 4) {
    // Ambiance technologique futuriste
    background(14, 16, 24);
  } else {
    // Ambiance Grand Prix classique : pelouse verte avec relief
    background(24, 38, 26);
    // Bandes de pelouse tondue
    noStroke();
    fill(28, 44, 30);
    for (let y = 0; y < height; y += 40) {
      rect(0, y, width, 20);
    }
  }
}

/**
 * Dessin réaliste du circuit de course
 */
function drawRacetrack(p, level) {
  if (!p || p.points.length < 2) return;

  push();
  strokeJoin(ROUND);
  strokeCap(ROUND);

  // 1. Zone de dégagement extérieure / gravier
  noFill();
  stroke(55, 50, 40, 180);
  strokeWeight(p.radius * 2 + 18);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 2. Vibreurs bicolores sur les bords (rouge & blanc ou cyan & vert)
  let curbCol1 = level.curbColors[0];
  let curbCol2 = level.curbColors[1];
  stroke(curbCol1);
  strokeWeight(p.radius * 2 + 8);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 3. Asphalte de course
  let [r, g, b] = level.asphaltColor;
  stroke(r, g, b);
  strokeWeight(p.radius * 2);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 4. Ligne médiane blanche discontinue (marquage de voie)
  stroke(220, 225, 235, 110);
  strokeWeight(1.8);
  beginShape();
  for (let pt of p.points) vertex(pt.x, pt.y);
  endShape(CLOSE);

  // 5. Ligne de départ / arrivée avec damier à la position du premier segment
  drawStartFinishLine(p.points[0], p.points[1], p.radius);

  pop();
}

/**
 * Dessine la ligne de départ / arrivée avec motif en damier 🏁
 */
function drawStartFinishLine(p1, p2, trackRadius) {
  if (!p1 || !p2) return;
  push();
  let dir = p5.Vector.sub(p2, p1).normalize();
  let normal = createVector(-dir.y, dir.x); // Perpendiculaire à la piste

  let leftPt = p5.Vector.add(p1, p5.Vector.mult(normal, trackRadius));
  let rightPt = p5.Vector.sub(p1, p5.Vector.mult(normal, trackRadius));

  // Damier
  let steps = 8;
  for (let i = 0; i < steps; i++) {
    let t1 = i / steps;
    let t2 = (i + 1) / steps;
    let ptA = p5.Vector.lerp(leftPt, rightPt, t1);
    let ptB = p5.Vector.lerp(leftPt, rightPt, t2);
    stroke(i % 2 === 0 ? 255 : 20);
    strokeWeight(6);
    line(ptA.x, ptA.y, ptB.x, ptB.y);
  }

  // Panneau START / FINISH
  noStroke();
  fill(255, 215, 0);
  textSize(9);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text('🏁 START', leftPt.x, leftPt.y - 12);
  pop();
}

/**
 * Liaison des curseurs et boutons HTML
 */
function bindUIControls() {
  selectLevel = document.getElementById('select-level');
  sliderFollow = document.getElementById('slider-follow');
  valFollow = document.getElementById('val-follow');
  sliderSeparate = document.getElementById('slider-separate');
  valSeparate = document.getElementById('val-separate');
  sliderSpeed = document.getElementById('slider-speed');
  valSpeed = document.getElementById('val-speed');

  btnAddMoto = document.getElementById('btn-add-moto');
  btnAddSquad = document.getElementById('btn-add-squad');
  btnNitro = document.getElementById('btn-nitro');
  btnDebug = document.getElementById('btn-debug');
  btnNextLevel = document.getElementById('btn-next-level');
  btnClear = document.getElementById('btn-clear');

  if (selectLevel) {
    selectLevel.addEventListener('change', () => {
      loadLevel(parseInt(selectLevel.value, 10));
    });
  }

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
      motoBaseSpeed = parseFloat(sliderSpeed.value);
      if (valSpeed) valSpeed.textContent = motoBaseSpeed.toFixed(1);
      for (let m of motos) m.originalMaxSpeed = motoBaseSpeed;
      for (let sq of squads) sq.setSpeed(motoBaseSpeed);
    });
  }

  if (btnAddMoto) {
    btnAddMoto.addEventListener('click', () => addMoto(mouseX, mouseY));
  }

  if (btnAddSquad) {
    btnAddSquad.addEventListener('click', () => addMotoSquad(mouseX, mouseY));
  }

  if (btnNitro) {
    btnNitro.addEventListener('click', triggerGlobalNitro);
  }

  if (btnDebug) {
    btnDebug.addEventListener('click', toggleDebug);
  }

  if (btnNextLevel) {
    btnNextLevel.addEventListener('click', () => {
      loadLevel(currentLevelIndex + 1);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      motos = [];
      squads = [];
      particles = [];
    });
  }
}

/**
 * Bascule du mode debug (touche D)
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
 * Overlay de télémétrie en mode debug
 */
function drawDebugOverlay(totalBikes) {
  push();
  noStroke();
  fill(0, 0, 0, 180);
  rect(12, 70, 275, 130, 8);

  fill('#ebcb8b');
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(`[TÉLÉMÉTRIE GP - MODE DEBUG]`, 20, 78);

  let lvl = RACING_LEVELS[currentLevelIndex];
  textStyle(NORMAL);
  fill('#eceff4');
  text(`Circuit : ${lvl.name}`, 20, 96);
  text(`Difficulté : ${lvl.difficulty}`, 20, 112);
  text(`Motos en piste : ${totalBikes}`, 20, 128);
  text(`Pace cars : ${vehicles.length}`, 20, 144);
  text(`Poids Trajectoire / Séparation : ${followPathWeight.toFixed(1)} / ${separateWeight.toFixed(1)}`, 20, 160);
  text(`Vitesse de base : ${(motoBaseSpeed * 30).toFixed(0)} km/h`, 20, 176);
  pop();
}

/**
 * Gestion du clavier
 * Touche "'" (apostrophe / quote) -> Ajoute une nouvelle moto de course
 */
function keyPressed(event) {
  if (key === "'" || (event && (event.key === "'" || event.code === 'Quote'))) {
    addMoto(mouseX, mouseY);
  } else if (key === 'd' || key === 'D') {
    toggleDebug();
  } else if (key === 'n' || key === 'N') {
    loadLevel(currentLevelIndex + 1);
  } else if (key === 's' || key === 'S') {
    addMotoSquad(mouseX, mouseY);
  } else if (key === ' ' || key === 'b' || key === 'B') {
    triggerGlobalNitro();
  }
}

function mouseDragged() {
  const controlsEl = document.getElementById('controls');
  if (controlsEl && mouseY < controlsEl.offsetHeight + 15) return;
  if (frameCount % 6 === 0) {
    addMoto(mouseX, mouseY);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  loadLevel(currentLevelIndex);
}
