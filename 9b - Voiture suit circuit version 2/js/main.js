/**
 * main.js — Neuroévolution Racing 9b
 * Contrôleur principal avec configuration dynamique de topologie,
 * génération automatique des sliders de couches cachées, bouton APPLY NETWORK,
 * contrôles d'entraînement (START, PAUSE, RESET) et visualisation schématique.
 */

// Variables locales pour la prévisualisation avant clic sur APPLY NETWORK
let pendingRays = NUM_RAYS;
let pendingHiddenLayers = [...networkConfig.hiddenLayers];

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');

    setupTrack(true);
    resetTraining(true);
    initDynamicUI();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    setupTrack(false);
}

function draw() {
    background(11, 14, 20);

    // Rendu des cartes LEGO et du tracé du circuit
    showTiles();

    // Boucle de simulation (Vitesse d'entraînement / Time Warp)
    let steps = TRAINING_PAUSED ? 0 : SIMULATION_SPEED;
    for (let s = 0; s < steps; s++) {
        updateSimulationStep();
    }

    // Caméra centrée sur le leader si activé
    push();
    if (FOCUS_BEST_CAR && bestCar && !bestCar.dead) {
        let targetX = width / 2 - bestCar.pos.x;
        let targetY = height / 2 - bestCar.pos.y;
        translate(targetX, targetY);
    }

    // 1. Dessin des Checkpoints
    for (let i = 0; i < checkpoints.length; i++) {
        checkpoints[i].show();
        if (DEBUG_MODE) {
            let center = p5.Vector.add(checkpoints[i].a, checkpoints[i].b).div(2);
            fill(0, 255, 180, 160);
            noStroke();
            textSize(9);
            textAlign(CENTER, CENTER);
            text(`CP ${i}`, center.x, center.y);
        }
    }

    // 2. Dessin des Murs du circuit
    for (let wall of walls) {
        wall.show();
    }

    // 3. Dessin des voitures
    for (let car of cars) {
        if (car !== bestCar) car.show(false, DEBUG_MODE);
    }

    if (bestCar) {
        bestCar.show(true, DEBUG_MODE);
        if (checkpoints.length > 0) {
            let target = checkpoints[bestCar.checkpointIndex % checkpoints.length];
            let center = p5.Vector.add(target.a, target.b).div(2);
            stroke(56, 189, 248, 160);
            strokeWeight(1.2);
            line(bestCar.pos.x, bestCar.pos.y, center.x, center.y);
        }
    } else if (cars.length > 0) {
        cars[0].show(true, DEBUG_MODE);
    }

    pop(); // Fin de la transformation caméra

    // 4. Visualiseur Schématique du Réseau de Neurones (Section 13 du cours)
    if (SHOW_NN_VISUALIZER) {
        drawSchematicNetworkVisualizer();
    }

    // 5. Mise à jour de la télémétrie dans le DOM et sur le canvas
    updateTelemetryUI();
}

/**
 * Une étape élémentaire de simulation physique et neuro-décisionnelle
 */
function updateSimulationStep() {
    let maxScore = -1;
    let bestDist = Infinity;
    bestCar = null;

    for (let i = cars.length - 1; i >= 0; i--) {
        let car = cars[i];

        car.look(walls);
        car.think(walls);
        car.update();
        car.checkCheckpoints(checkpoints);
        checkCollisions(car);

        if (car.dead) {
            savedCars.push(cars.splice(i, 1)[0]);
        } else {
            let distToNext = Infinity;
            if (checkpoints.length > 0) {
                let goal = checkpoints[car.checkpointIndex % checkpoints.length];
                let center = p5.Vector.add(goal.a, goal.b).div(2);
                distToNext = p5.Vector.dist(car.pos, center);
            }

            if (car.score > maxScore || (car.score === maxScore && distToNext < bestDist)) {
                maxScore = car.score;
                bestDist = distToNext;
                bestCar = car;
            }
        }
    }

    // Si toutes les voitures ont terminé ou péri -> Génération suivante
    if (cars.length === 0) {
        generation++;
        nextGeneration();
    }
}

function checkCollisions(car) {
    if (car.dead) return;

    for (let w of walls) {
        if (distPointToSegment(car.pos, w.a, w.b) < car.width * 0.55) {
            car.dead = true;
            return;
        }
    }

    if (car.pos.x < 0 || car.pos.x > width || car.pos.y < 0 || car.pos.y > height) {
        car.dead = true;
    }
}

/**
 * ============================================================================
 * VISUALISATION DU RÉSEAU DE NEURONES (Section 13 du cours)
 * ============================================================================
 * Affiche la topologie actuelle avec couches verticales/horizontales,
 * les neurones actifs illuminés et les synapses pondérées.
 */
function drawSchematicNetworkVisualizer() {
    let activeCar = bestCar || (cars.length > 0 ? cars[0] : null);
    if (!activeCar || !activeCar.brain) return;

    let brain = activeCar.brain;
    let topology = brain.topology;
    let activations = brain.getActivations();

    let boxW = 290;
    let boxH = 180;
    let boxX = 20;
    let boxY = height - boxH - 20;

    push();
    // Cadre sombre avec bordure cyan luminescente
    fill(13, 19, 33, 230);
    stroke(56, 189, 248, 120);
    strokeWeight(1.5);
    rect(boxX, boxY, boxW, boxH, 10);

    // Titre et topologie
    noStroke();
    fill(248, 250, 252);
    textSize(11);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    text(`🧠 TOPOLOGIE : ${topology.join(' → ')}`, boxX + 12, boxY + 10);

    textStyle(NORMAL);
    fill(148, 163, 184);
    textSize(9);
    text(`Rayons: ${NUM_RAYS} | Couches cachées: ${topology.length - 2}`, boxX + 12, boxY + 24);

    let numLayers = topology.length;
    let layerSpacing = (boxW - 40) / Math.max(1, numLayers - 1);
    let layerPositions = [];

    // Calcul des positions des neurones par couche
    for (let l = 0; l < numLayers; l++) {
        let count = topology[l];
        let x = boxX + 20 + l * layerSpacing;
        let nodes = [];
        let displayCount = Math.min(count, 12); // Plafonné visuellement si couche très dense
        let nodeSpacing = (boxH - 65) / Math.max(1, displayCount - 1);
        let startY = boxY + 42 + (boxH - 65 - (displayCount - 1) * nodeSpacing) / 2;

        for (let i = 0; i < displayCount; i++) {
            let y = startY + i * nodeSpacing;
            nodes.push({ x, y, origIndex: i });
        }
        layerPositions.push(nodes);
    }

    // 1. Tracé des synapses pondérées
    for (let l = 0; l < brain.weights.length; l++) {
        let W = brain.weights[l];
        let fromNodes = layerPositions[l];
        let toNodes = layerPositions[l + 1];

        for (let i = 0; i < fromNodes.length; i++) {
            for (let j = 0; j < toNodes.length; j++) {
                let weight = (W[i] && W[i][j] !== undefined) ? W[i][j] : 0;
                let absW = Math.abs(weight);
                let alpha = constrain(absW * 160, 25, 230);

                if (weight > 0) {
                    stroke(56, 189, 248, alpha); // Excitation : Cyan
                } else {
                    stroke(244, 63, 94, alpha);  // Inhibition : Rose/Rouge
                }
                strokeWeight(constrain(absW * 1.5, 0.4, 2.2));
                line(fromNodes[i].x, fromNodes[i].y, toNodes[j].x, toNodes[j].y);
            }
        }
    }

    // 2. Dessin des neurones avec halos d'activation
    for (let l = 0; l < numLayers; l++) {
        let acts = activations[l] || [];
        for (let i = 0; i < layerPositions[l].length; i++) {
            let pos = layerPositions[l][i];
            let act = acts[pos.origIndex] !== undefined ? acts[pos.origIndex] : 0.5;

            // Halo luminescent
            noStroke();
            fill(56, 189, 248, act * 160);
            circle(pos.x, pos.y, 11);

            // Corps du neurone
            fill(act > 0.5 ? color(16, 185, 129) : color(30, 41, 59));
            stroke(255, 255, 255, 220);
            strokeWeight(1);
            circle(pos.x, pos.y, 6.5);
        }
    }

    // Légendes en bas
    fill(148, 163, 184);
    textSize(8);
    textAlign(CENTER, CENTER);
    text("INPUT", boxX + 20, boxY + boxH - 10);
    text("OUTPUT", boxX + boxW - 22, boxY + boxH - 10);

    pop();
}

/**
 * Met à jour les statistiques de télémétrie dans le panneau HTML
 */
function updateTelemetryUI() {
    const elGen = document.getElementById('statGen');
    const elAlive = document.getElementById('statAlive');
    const elBestFit = document.getElementById('statBestFit');
    const elAvgFit = document.getElementById('statAvgFit');

    let aliveCount = cars.filter(c => !c.dead).length;
    let currentBest = 0;
    let currentAvg = 0;

    if (savedCars.length > 0 || cars.length > 0) {
        let allScores = [...cars, ...savedCars].map(c => c.score);
        if (allScores.length > 0) {
            currentBest = Math.max(...allScores);
            currentAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        }
    }

    if (currentBest > bestFitnessRecord) {
        bestFitnessRecord = currentBest;
    }

    if (elGen) elGen.innerText = generation;
    if (elAlive) elAlive.innerText = `${aliveCount} / ${TOTAL_POP}`;
    if (elBestFit) elBestFit.innerText = Math.round(bestFitnessRecord);
    if (elAvgFit) elAvgFit.innerText = Math.round(currentAvg);
}

/**
 * ============================================================================
 * INTERFACE DYNAMIQUE ET ÉVÉNEMENTS (Sections 1 à 14 du cours)
 * ============================================================================
 */
function initDynamicUI() {
    const link = (id, event, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, callback);
        return el;
    };

    // 1. Slider NOMBRE DE RAYONS
    link('raysSlider', 'input', (e) => {
        pendingRays = parseInt(e.target.value) || 5;
        document.getElementById('raysVal').innerText = pendingRays;
        // Met à jour automatiquement les suggestions de neurones pour rester cohérent avec les rayons
        let numLayers = pendingHiddenLayers.length;
        pendingHiddenLayers = networkConfig.suggestLayers(pendingRays, numLayers);
        renderDynamicLayerSliders();
        updatePendingTopologyDisplay();
    });

    // 2. Slider NOMBRE DE COUCHES CACHÉES (1 à 5)
    link('hiddenLayersSlider', 'input', (e) => {
        let numLayers = parseInt(e.target.value) || 2;
        document.getElementById('hiddenLayersVal').innerText = numLayers;
        // Adapte le tableau pendingHiddenLayers à la nouvelle taille
        pendingHiddenLayers = networkConfig.suggestLayers(pendingRays, numLayers);
        renderDynamicLayerSliders();
        updatePendingTopologyDisplay();
    });

    // 3. Portée et FOV
    link('sightSlider', 'input', (e) => {
        SIGHT_DIST = parseInt(e.target.value);
        document.getElementById('sightVal').innerText = `${SIGHT_DIST} px`;
    });

    link('fovSlider', 'input', (e) => {
        let deg = parseInt(e.target.value);
        FOV = (deg * Math.PI) / 180;
        document.getElementById('fovVal').innerText = `${deg}°`;
    });

    // 4. VITESSE MAXIMALE & FORCE DE STEERING
    link('speedSlider', 'input', (e) => {
        GAME_SPEED_LIMIT = parseFloat(e.target.value);
        document.getElementById('speedVal').innerText = GAME_SPEED_LIMIT.toFixed(1);
    });

    link('forceSlider', 'input', (e) => {
        CAR_MAX_FORCE = parseFloat(e.target.value);
        document.getElementById('forceVal').innerText = CAR_MAX_FORCE.toFixed(2);
    });

    // 5. VITESSE DE SIMULATION
    link('simSpeedSelect', 'change', (e) => {
        SIMULATION_SPEED = parseFloat(e.target.value) || 1;
    });

    // 6. POPULATION & MUTATION
    link('popSlider', 'input', (e) => {
        TOTAL_POP = parseInt(e.target.value);
        document.getElementById('popVal').innerText = TOTAL_POP;
    });

    link('mutSlider', 'input', (e) => {
        MUTATION_RATE = parseFloat(e.target.value);
        document.getElementById('mutVal').innerText = `${Math.round(MUTATION_RATE * 100)}%`;
    });

    // 7. BOUTON MAJEUR : [ APPLY NETWORK ] (Section 11 du cours)
    link('btnApplyNetwork', 'click', () => {
        applyNewNetworkTopology();
    });

    // 8. BOUTONS D'ENTRAÎNEMENT : [ START ], [ PAUSE ], [ RESET ], [ FORCE GEN ]
    link('btnStart', 'click', () => {
        TRAINING_PAUSED = false;
        console.log("Entraînement démarré.");
    });

    link('btnPause', 'click', () => {
        TRAINING_PAUSED = !TRAINING_PAUSED;
        console.log("Entraînement en pause :", TRAINING_PAUSED);
    });

    link('btnReset', 'click', () => {
        resetTraining(true);
    });

    link('btnNextGen', 'click', () => {
        for (let car of cars) car.dead = true;
    });

    // Boutons utilitaires
    link('btnToggleNN', 'click', () => {
        SHOW_NN_VISUALIZER = !SHOW_NN_VISUALIZER;
    });

    link('btnToggleDebug', 'click', () => {
        DEBUG_MODE = !DEBUG_MODE;
    });

    link('btnSaveModel', 'click', () => {
        saveChampionModel();
    });

    link('btnLoadModel', 'click', () => {
        loadChampionModel();
    });

    // Génération initiale des sliders de couches cachées
    renderDynamicLayerSliders();
    updatePendingTopologyDisplay();
    updateActiveTopologyBadge();
}

/**
 * Génère dynamiquement les sliders pour chaque couche cachée (Section 3 & 4 du cours)
 */
function renderDynamicLayerSliders() {
    const container = document.getElementById('dynamicLayersContainer');
    if (!container) return;

    container.innerHTML = '';

    pendingHiddenLayers.forEach((neurons, index) => {
        const row = document.createElement('div');
        row.className = 'dynamic-layer-item';

        const labelRow = document.createElement('div');
        labelRow.className = 'label-info';

        const label = document.createElement('label');
        label.innerText = `Couche Cachée ${index + 1} :`;

        const valSpan = document.createElement('span');
        valSpan.className = 'value-tag';
        valSpan.id = `layer_${index}_val`;
        valSpan.innerText = `${neurons} n`;

        labelRow.appendChild(label);
        labelRow.appendChild(valSpan);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '2';
        slider.max = '40';
        slider.step = '1';
        slider.value = neurons;
        slider.id = `layer_${index}_slider`;

        slider.addEventListener('input', (e) => {
            let n = parseInt(e.target.value) || 2;
            pendingHiddenLayers[index] = n;
            valSpan.innerText = `${n} n`;
            updatePendingTopologyDisplay();
        });

        row.appendChild(labelRow);
        row.appendChild(slider);
        container.appendChild(row);
    });
}

/**
 * Met à jour l'affichage de la topologie en cours de configuration
 */
function updatePendingTopologyDisplay() {
    const previewEl = document.getElementById('pendingTopologyDisplay');
    if (previewEl) {
        let topo = [pendingRays, ...pendingHiddenLayers, networkConfig.outputSize];
        previewEl.innerText = topo.join(' → ');
    }
}

/**
 * Met à jour le badge de la topologie actuellement active dans la simulation
 */
function updateActiveTopologyBadge() {
    const badge = document.getElementById('topologyBadge');
    if (badge) {
        badge.innerText = networkConfig.formatTopology();
    }
}

/**
 * ============================================================================
 * APPLICATION DU NOUVEAU RÉSEAU (Section 11 du cours)
 * ============================================================================
 * 1. Arrête temporairement l'entraînement
 * 2. Reconstruit le réseau de neurones
 * 3. Adapte automatiquement le nombre d'inputs aux rayons
 * 4. Recrée les couches cachées
 * 5. Conserve le nombre de sorties nécessaire (2)
 * 6. Recrée les cerveaux des véhicules
 * 7. Remet la génération à 1
 * 8. Permet de recommencer l'entraînement
 */
function applyNewNetworkTopology() {
    TRAINING_PAUSED = true;

    // 1. Mise à jour de la configuration globale
    NUM_RAYS = pendingRays;
    networkConfig.inputSize = NUM_RAYS;
    networkConfig.hiddenLayers = [...pendingHiddenLayers];

    // 2. Mise à jour des badges
    updateActiveTopologyBadge();

    // 3. Réinitialisation complète de la population
    for (let car of cars) car.dispose();
    for (let car of savedCars) car.dispose();
    cars = [];
    savedCars = [];
    bestCar = null;
    championModel = null;
    bestFitnessRecord = 0;
    generation = 1;
    trainingFinished = false;

    // 4. Instanciation des véhicules avec le nouveau cerveau et les nouveaux rayons
    for (let i = 0; i < TOTAL_POP; i++) {
        cars.push(new Car(null, NUM_RAYS));
    }

    TRAINING_PAUSED = false;
    console.log(`✅ Nouveau réseau appliqué avec succès ! Topologie : ${networkConfig.formatTopology()}`);
}

/**
 * Raccourcis clavier
 */
function keyPressed() {
    if (document.activeElement?.matches('input, select, textarea')) return;

    if (key === 'd' || key === 'D') {
        DEBUG_MODE = !DEBUG_MODE;
    } else if (key === 'n' || key === 'N') {
        SHOW_NN_VISUALIZER = !SHOW_NN_VISUALIZER;
    } else if (key === 'g' || key === 'G') {
        for (let car of cars) car.dead = true;
    } else if (key === 'f' || key === 'F') {
        FOCUS_BEST_CAR = !FOCUS_BEST_CAR;
    } else if (key === 'r' || key === 'R') {
        resetTraining(true);
    } else if (key === ' ') {
        TRAINING_PAUSED = !TRAINING_PAUSED;
    } else if (key === 's' || key === 'S') {
        saveChampionModel();
    } else if (key === 'l' || key === 'L') {
        loadChampionModel();
    }
}
