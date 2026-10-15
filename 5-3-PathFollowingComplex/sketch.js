/**
 * 5-3 Path Following Complex — Grand Prix Moto, Circuits Multi-Niveaux & Sons Réels
 *
 * Implémentation complète :
 * - Motos de course GP (`Moto` hérite de `Vehicle`) suivant le circuit et évitant les collisions
 * - Équipes / Pelotons en aspiration (`MotoSquad` hérite de `Vehicle`)
 * - Particules d'échappement & flammes de Nitro (`ExhaustParticle` hérite de `Vehicle`)
 * - Moteur sonore Web Audio réaliste (`MotoAudio`) : rugissement moteur 4-temps modulé par les RPM et klaxon bi-ton
 * - 4 Niveaux de circuits progressifs (Speedway, Monza, Monaco Nocturne, Figure 8)
 * - Déclenchement automatique du klaxon en cas de situation de dépassement serré
 * - Touche "'" (apostrophe / quote) pour créer instantanément de nouvelles motos
 * - Mode debug complet (touche 'd') avec télémétrie de course
 */

let debug = false;
let path;
let currentLevelIndex = 0;

// Moteur Audio Synthétisé
let motoAudio;

// Collections d'entités
let motos = [];
let squads = [];
let vehicles = [];
<<<<<<< HEAD
let particles = [];
let trackObstacles = [];
let simulationPaused = false;
let obstaclePlacementArmed = false;
let obstacleEraseMode = false;

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
let btnAddMoto, btnAddSquad, btnKlaxon, btnNitro, btnAudio, btnDebug, btnNextLevel, btnClear;
let btnPause, btnReset, btnAddObstacle, sliderDetection, valDetection, sliderVolume, valVolume;
let selectRacer, selectDrivingStyle, sliderRacerSpeed, sliderForce, sliderPrecision;
let selectedRacerIndex = 0;
=======
let snakes = [];
let snakeFollowWeight = 2;
let snakeSeparationWeight = 1.2;
let circuitWidth = 20;
let snakeSpacing = 20;
let snakeSize = 22;
>>>>>>> upstream/main

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. Initialisation du moteur audio Web Audio
  motoAudio = new MotoAudio();

<<<<<<< HEAD
  // 2. Initialisation du premier niveau
  loadLevel(currentLevelIndex);

  // 3. Liaison des contrôles UI
  bindUIControls();

  // 4. Grille de départ : 4 motos individuelles et 1 écurie en aspiration
  spawnInitialRacers();
=======
  for (let i = 0; i < nbVehicules; i++) {
    newVehicle(random(width), random(height));
  }
  newSnake(path.points[0].x, path.points[0].y);
  bindSnakeControls();
>>>>>>> upstream/main
}

function draw() {
  let level = RACING_LEVELS[currentLevelIndex];

<<<<<<< HEAD
  // 1. Arrière-plan du circuit (paddock, herbe, zones de dégagement)
  drawTrackEnvironment(level);

  // 2. Rendu de la piste de course asphaltée avec vibreurs et ligne de départ
  drawRacetrack(path, level);
  for (const obstacle of trackObstacles) obstacle.render();
  if (simulationPaused) {
    for (const v of vehicles) v.render();
    for (const m of motos) m.render(debug);
    for (const squad of squads) squad.render(debug);
    if (debug) drawDebugOverlay(motos.length + squads.reduce((n, sq) => n + sq.getBikes().length, 0));
    return;
  }

  // 3. Regroupement de toutes les motos pour la séparation mutuelle
  let allBikes = [...motos];
  for (let sq of squads) {
    allBikes.push(...sq.getBikes());
  }
  let otherRacers = [...vehicles, ...allBikes];

  // 4. Mise à jour des voitures de sécurité / pace cars
  for (let i = vehicles.length - 1; i >= 0; i--) {
    let v = vehicles[i];
    v.applyBehaviors(otherRacers, path);
    v.run();
  }
=======
  const allSegments = snakes.flatMap(snake => snake.anneaux);
  const neighbors = [...vehicles, ...allSegments];
  for (let v of vehicles) {
    // On applique les comportements pour suivre le chemin
    // Comme on utilise ici plusieurs comportements, notamment un comportement qui 
    // dépend des autres véhicules, on passe en paramètre le tableau des véhicules 
    // et le chemin
    v.applyBehaviors(neighbors, path);
    // on a regroupé update, draw etc. dans une méthode run (update, borders, display, etc.)
    v.run();
  }
  for (const snake of snakes) {
    snake.move(path, neighborsForSnake(snake, neighbors));
    snake.show();
  }
}

function neighborsForSnake(snake, allNeighbors) {
  const ownSegments = new Set(snake.anneaux);
  return allNeighbors.filter(vehicle => !ownSegments.has(vehicle));
}

function newSnake(x, y) {
  const snake = new SnakePathFollowing(x, y, 12, snakeSize,
    color(random(40, 200), random(70, 190), random(40, 200)));
  snake.followWeight = snakeFollowWeight;
  snake.separationWeight = snakeSeparationWeight;
  snake.setRingSpacing(snakeSpacing);
  snake.setSize(snakeSize);
  snakes.push(snake);
  document.getElementById('snake-count').value = `${snakes.length} serpent${snakes.length > 1 ? 's' : ''}`;
  return snake;
}

function bindSnakeControls() {
  const synchronize = () => {
    snakeFollowWeight = Number(document.getElementById('snake-follow').value);
    snakeSeparationWeight = Number(document.getElementById('snake-separation').value);
    circuitWidth = Number(document.getElementById('circuit-width').value);
    snakeSpacing = Number(document.getElementById('snake-spacing').value);
    snakeSize = Number(document.getElementById('snake-size').value);
    if (path) path.radius = circuitWidth;
    for (const snake of snakes) {
      snake.followWeight = snakeFollowWeight;
      snake.separationWeight = snakeSeparationWeight;
      snake.setRingSpacing(snakeSpacing);
      snake.setSize(snakeSize);
    }
    document.getElementById('snake-follow-value').value = snakeFollowWeight.toFixed(1);
    document.getElementById('snake-separation-value').value = snakeSeparationWeight.toFixed(1);
    document.getElementById('circuit-width-value').value = `${circuitWidth.toFixed(0)} px`;
    document.getElementById('snake-spacing-value').value = `${snakeSpacing.toFixed(0)} px`;
    document.getElementById('snake-size-value').value = `${snakeSize.toFixed(0)} px`;
  };
  for (const id of ['snake-follow', 'snake-separation', 'circuit-width', 'snake-spacing', 'snake-size']) {
    document.getElementById(id).addEventListener('input', synchronize);
  }
  synchronize();
}
>>>>>>> upstream/main

  // 5. Suivi des métriques sonores (vitesse max, nitro, freinages intenses, klaxon automatique)
  let topSpeed = 0;
  let anyNitro = false;
  let anyBraking = false;
  let closeEncounterDetected = false;

  // 6. Mise à jour et pilotage des motos individuelles
  for (let m of motos) {
    m.followPathWeight = followPathWeight;
    m.separateWeight = separateWeight;

    let otherEntities = otherRacers.filter((b) => b !== m);
    m.applyBehaviors(otherEntities, path, particles, trackObstacles);
    m.update();
    m.render(debug);

    let spd = m.vel.mag();
    if (spd > topSpeed) topSpeed = spd;
    if (m.isNitro) anyNitro = true;
    if (m.isBraking) anyBraking = true;

    // Détection d'un dépassement serré avec un autre bolide (distance < 28px)
    for (let other of otherEntities) {
      if (p5.Vector.dist(m.pos, other.pos) < m.r * 1.8) {
        closeEncounterDetected = true;
        break;
      }
    }
  }

  // 7. Mise à jour des écuries en aspiration (MotoSquad)
  for (let sq of squads) {
    sq.setWeights(followPathWeight, separateWeight);
    let otherEntities = otherRacers.filter((b) => !sq.getBikes().includes(b));
    sq.applyBehaviors(otherEntities, path, particles, trackObstacles);
    sq.render(debug);

    for (let b of sq.getBikes()) {
      let spd = b.vel.mag();
      if (spd > topSpeed) topSpeed = spd;
      if (b.isNitro) anyNitro = true;
      if (b.isBraking) anyBraking = true;
    }
  }

  // 8. Modulation en temps réel du rugissement moteur de moto
  if (motoAudio) {
    motoAudio.updateEngine(topSpeed, anyNitro, anyBraking);

    // Klaxon automatique si situation de dépassement à haut risque (1 chance sur 120 frames)
    if (closeEncounterDetected && frameCount % 60 === 0 && random() < 0.35) {
      motoAudio.playKlaxon();
    }
  }

  // 9. Particules d'échappement et nitro
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.render();
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }

  // 10. Télémétrie et diagnostics en mode debug
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

<<<<<<< HEAD
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
=======
function keyPressed(event) {
  if (document.activeElement?.matches('input, select, textarea')) return;
  if (key.toLowerCase() == "t") {
    if (!event?.repeat) newSnake(constrain(mouseX, 0, width), constrain(mouseY, 0, height));
  } else if (key == "d") {
    debug = !debug;
    Vehicle.debug = debug;
  } else if(key == "s") {
    let v = newVehicle(mouseX, mouseY);
    v.maxspeed = 10;
    v.couleur = "red"
  } else if (key == "w") {
    // on cree un véhicule wander
    let v = new Vehicle(mouseX, mouseY, 2, 0.25);
    v.wanderWeight = 1;
    v.followPathWeight = 0;
    v.separateWeight = 0;
    v.r = 30;
    v.couleur = "lightgreen";
>>>>>>> upstream/main
    vehicles.push(v);
  }
  refreshRacerOptions();
}

/**
 * Ajoute une nouvelle moto de course
 * Déclenché par la touche "'" (apostrophe) ou le bouton UI
 */
function addMoto(x, y) {
  if (motoAudio) motoAudio.init();

  let posX = x !== undefined ? x : mouseX;
  let posY = y !== undefined ? y : mouseY;

  if (posX <= 10 || posX >= width - 10 || posY <= 60 || posY >= height - 10) {
    let randPt = path.points[Math.floor(random(path.points.length))];
    posX = randPt.x + random(-12, 12);
    posY = randPt.y + random(-12, 12);
  }

  let m = new Moto(posX, posY, motoBaseSpeed + random(-0.4, 0.5));
  m.followPathWeight = followPathWeight;
  m.separateWeight = separateWeight;
  motos.push(m);
  refreshRacerOptions();

  // Petit coup de gaz sonore à l'arrivée d'une moto
  if (motoAudio) motoAudio.playBackfire();
  return m;
}

/**
 * Ajoute une écurie de 3 motos en formation d'aspiration
 */
function addMotoSquad(x, y) {
  if (motoAudio) motoAudio.init();

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
  refreshRacerOptions();
  return squad;
}

/**
 * Déclenche le Nitro pour toutes les motos
 */
function triggerGlobalNitro() {
  if (motoAudio) motoAudio.init();
  for (let m of motos) m.triggerNitro(90);
  for (let sq of squads) sq.triggerNitro(90);
}

/**
 * Arrière-plan du circuit adapté au niveau
 */
function drawTrackEnvironment(level) {
  if (level.id === 3) {
    background(10, 13, 20);
    noStroke();
    fill(0, 180, 255, 6);
    circle(width * 0.25, height * 0.3, 400);
    circle(width * 0.75, height * 0.7, 450);
  } else if (level.id === 4) {
    background(14, 16, 24);
  } else {
    background(24, 38, 26);
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

  // 2. Vibreurs bicolores sur les bords
  let curbCol1 = level.curbColors[0];
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

  // 4. Ligne médiane blanche discontinue
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
  let normal = createVector(-dir.y, dir.x);

  let leftPt = p5.Vector.add(p1, p5.Vector.mult(normal, trackRadius));
  let rightPt = p5.Vector.sub(p1, p5.Vector.mult(normal, trackRadius));

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
  btnKlaxon = document.getElementById('btn-klaxon');
  btnNitro = document.getElementById('btn-nitro');
  btnAudio = document.getElementById('btn-audio');
  btnDebug = document.getElementById('btn-debug');
  btnNextLevel = document.getElementById('btn-next-level');
  btnClear = document.getElementById('btn-clear');
  btnPause = document.getElementById('btn-pause');
  btnReset = document.getElementById('btn-reset');
  btnAddObstacle = document.getElementById('btn-add-obstacle');
  sliderDetection = document.getElementById('slider-detection');
  valDetection = document.getElementById('val-detection');
  sliderVolume = document.getElementById('slider-volume');
  valVolume = document.getElementById('val-volume');

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

  if (sliderDetection) sliderDetection.addEventListener('input', () => {
    const distance = Number(sliderDetection.value);
    if (valDetection) valDetection.textContent = `${distance}px`;
    const racer = getAllRacers()[selectedRacerIndex];
    if (racer) racer.configure({ detectionDistance: distance });
  });

  if (sliderVolume) sliderVolume.addEventListener('input', () => {
    const volume = Number(sliderVolume.value);
    if (valVolume) valVolume.textContent = `${Math.round(volume * 100)}%`;
    if (motoAudio) motoAudio.setVolume(volume);
  });

  if (btnAddMoto) {
    btnAddMoto.addEventListener('click', () => addMoto(mouseX, mouseY));
  }

  if (btnAddSquad) {
    btnAddSquad.addEventListener('click', () => addMotoSquad(mouseX, mouseY));
  }

  if (btnKlaxon) {
    btnKlaxon.addEventListener('click', () => {
      if (motoAudio) {
        motoAudio.init();
        motoAudio.playKlaxon();
      }
    });
  }

  if (btnNitro) {
    btnNitro.addEventListener('click', triggerGlobalNitro);
  }

  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      if (motoAudio) {
        motoAudio.init();
        let state = motoAudio.toggle();
        btnAudio.textContent = state ? '🔊 Son : ON' : '🔇 Son : OFF';
      }
    });
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
  if (btnPause) btnPause.addEventListener('click', togglePause);
  if (btnReset) btnReset.addEventListener('click', resetRace);
  if (btnAddObstacle) btnAddObstacle.addEventListener('click', () => {
    obstacleEraseMode = false;
    obstaclePlacementArmed = true;
    btnAddObstacle.textContent = 'Cliquez sur la piste…';
    const removeButton = document.getElementById('btn-remove-obstacle');
    if (removeButton) removeButton.textContent = 'Supprimer obstacle [X]';
  });
  const btnRemoveObstacle = document.getElementById('btn-remove-obstacle');
  if (btnRemoveObstacle) btnRemoveObstacle.addEventListener('click', toggleObstacleEraseMode);

  selectRacer = document.getElementById('select-racer');
  selectDrivingStyle = document.getElementById('select-driving-style');
  sliderRacerSpeed = document.getElementById('slider-racer-speed');
  sliderForce = document.getElementById('slider-force');
  sliderPrecision = document.getElementById('slider-precision');
  if (selectRacer) selectRacer.addEventListener('change', () => {
    selectedRacerIndex = Number(selectRacer.value) || 0;
    syncRacerControls();
  });
  if (selectDrivingStyle) selectDrivingStyle.addEventListener('change', () => {
    const racer = getAllRacers()[selectedRacerIndex];
    if (racer) racer.configure({ drivingStyle: selectDrivingStyle.value });
  });
  if (sliderRacerSpeed) sliderRacerSpeed.addEventListener('input', () => {
    const value = Number(sliderRacerSpeed.value);
    const racer = getAllRacers()[selectedRacerIndex];
    if (racer) racer.configure({ maxSpeed: value });
    if (document.getElementById('val-racer-speed')) document.getElementById('val-racer-speed').textContent = value.toFixed(1);
  });
  if (sliderForce) sliderForce.addEventListener('input', () => {
    const value = Number(sliderForce.value);
    const racer = getAllRacers()[selectedRacerIndex];
    if (racer) racer.configure({ maxForce: value });
    if (document.getElementById('val-force')) document.getElementById('val-force').textContent = value.toFixed(2);
  });
  if (sliderPrecision) sliderPrecision.addEventListener('input', () => {
    const value = Number(sliderPrecision.value);
    const racer = getAllRacers()[selectedRacerIndex];
    if (racer) racer.configure({ followPrecision: value });
    if (document.getElementById('val-precision')) document.getElementById('val-precision').textContent = value.toFixed(2);
  });
}

function getAllRacers() {
  return [...motos, ...squads.flatMap((squad) => squad.getBikes())];
}

function refreshRacerOptions() {
  if (!selectRacer) return;
  const racers = getAllRacers();
  const previous = Math.min(selectedRacerIndex, Math.max(0, racers.length - 1));
  selectRacer.replaceChildren();
  racers.forEach((racer, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Moto #${racer.number}`;
    selectRacer.appendChild(option);
  });
  selectedRacerIndex = previous;
  selectRacer.value = String(previous);
  syncRacerControls();
}

function syncRacerControls() {
  const racer = getAllRacers()[selectedRacerIndex];
  if (!racer) return;
  if (sliderDetection) sliderDetection.value = racer.obstacleDetectionDistance;
  if (valDetection) valDetection.textContent = `${racer.obstacleDetectionDistance}px`;
  if (sliderRacerSpeed) sliderRacerSpeed.value = racer.originalMaxSpeed;
  if (sliderForce) sliderForce.value = racer.originalMaxForce;
  if (sliderPrecision) sliderPrecision.value = racer.followPrecision;
  if (selectDrivingStyle) selectDrivingStyle.value = racer.drivingStyle;
  const speedOutput = document.getElementById('val-racer-speed');
  const forceOutput = document.getElementById('val-force');
  const precisionOutput = document.getElementById('val-precision');
  if (speedOutput) speedOutput.textContent = Number(racer.originalMaxSpeed).toFixed(1);
  if (forceOutput) forceOutput.textContent = Number(racer.originalMaxForce).toFixed(2);
  if (precisionOutput) precisionOutput.textContent = Number(racer.followPrecision).toFixed(2);
}

function addTrackObstacle(x, y) {
  const px = Number.isFinite(x) ? x : width / 2;
  const py = Number.isFinite(y) ? y : height / 2;
  trackObstacles.push(new TrackObstacle(px, py, random(18, 34)));
}

function toggleObstacleEraseMode() {
  obstacleEraseMode = !obstacleEraseMode;
  obstaclePlacementArmed = false;
  if (btnAddObstacle) btnAddObstacle.textContent = '+ Obstacle [O]';
  const button = document.getElementById('btn-remove-obstacle');
  if (button) button.textContent = obstacleEraseMode ? 'Cliquez sur un obstacle…' : 'Supprimer obstacle [X]';
}

function togglePause() {
  simulationPaused = !simulationPaused;
  if (btnPause) btnPause.textContent = simulationPaused ? '▶ Reprendre' : '⏸ Pause';
}

function resetRace() {
  simulationPaused = false;
  trackObstacles = [];
  if (btnPause) btnPause.textContent = '⏸ Pause';
  obstacleEraseMode = false;
  obstaclePlacementArmed = false;
  const removeButton = document.getElementById('btn-remove-obstacle');
  if (removeButton) removeButton.textContent = 'Supprimer obstacle [X]';
  spawnInitialRacers();
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
 * Touche "k" ou "h" -> Déclenche le klaxon de course
 */
function keyPressed(event) {
  if (motoAudio) motoAudio.init();

  if (key === "'" || (event && (event.key === "'" || event.code === 'Quote'))) {
    addMoto(mouseX, mouseY);
  } else if (key === 'k' || key === 'K' || key === 'h' || key === 'H') {
    if (motoAudio) motoAudio.playKlaxon();
  } else if (key === 'm' || key === 'M') {
    if (motoAudio) {
      let state = motoAudio.toggle();
      if (btnAudio) btnAudio.textContent = state ? '🔊 Son : ON' : '🔇 Son : OFF';
    }
  } else if (key === 'd' || key === 'D') {
    toggleDebug();
  } else if (key === 'n' || key === 'N') {
    loadLevel(currentLevelIndex + 1);
  } else if (key === 'p' || key === 'P') {
    togglePause();
  } else if (key === 'r' || key === 'R') {
    resetRace();
  } else if (key === 'o' || key === 'O') {
    addTrackObstacle(mouseX, mouseY);
  } else if (key === 'x' || key === 'X') {
    toggleObstacleEraseMode();
  } else if (key === 's' || key === 'S') {
    addMotoSquad(mouseX, mouseY);
  } else if (key === ' ' || key === 'b' || key === 'B') {
    triggerGlobalNitro();
  }
}

function mousePressed() {
  if (motoAudio) motoAudio.init();
  const controlsEl = document.getElementById('controls');
  if (controlsEl && mouseY < controlsEl.offsetHeight + 15) return;
  if (mouseY > height - 55) return;
  if (obstacleEraseMode) {
    const removed = removeTrackObstacleAt(trackObstacles, mouseX, mouseY);
    if (removed) {
      obstacleEraseMode = false;
      const removeButton = document.getElementById('btn-remove-obstacle');
      if (removeButton) removeButton.textContent = 'Supprimer obstacle [X]';
    }
  } else {
    addTrackObstacle(mouseX, mouseY);
  }
  if (obstaclePlacementArmed) {
    obstaclePlacementArmed = false;
    if (btnAddObstacle) btnAddObstacle.textContent = '+ Obstacle [O]';
  }
}

function mouseDragged() {
<<<<<<< HEAD
  if (motoAudio) motoAudio.init();
  const controlsEl = document.getElementById('controls');
  if (controlsEl && mouseY < controlsEl.offsetHeight + 15) return;
  if (frameCount % 6 === 0) {
    addMoto(mouseX, mouseY);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  loadLevel(currentLevelIndex);
=======
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) newVehicle(mouseX, mouseY);
>>>>>>> upstream/main
}
