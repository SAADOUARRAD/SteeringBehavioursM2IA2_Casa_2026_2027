/**
 * main.js
 * Contrôleur principal de Neuroévolution Racing 9b.
 * Gère la boucle de simulation accélérée, la télémétrie motorsport,
 * le visualiseur de réseau de neurones en direct et l'interface utilisateur.
 */

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');

    setupTrack(true);
    resetTraining(true);
    bindUIControls();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    setupTrack(false);
}

function draw() {
    background(11, 14, 20);

    // Rendu des tuiles de décor et piste
    showTiles();

    // Boucle de simulation temporelle (Accélérateur d'entraînement)
    let steps = TRAINING_PAUSED ? 0 : SIMULATION_SPEED;
    for (let s = 0; s < steps; s++) {
        updateSimulationStep();
    }

    // Caméra centrée sur le leader si le mode FOCUS est activé
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

    // 3. Dessin des voitures (les autres d'abord, puis le leader en surbrillance)
    for (let car of cars) {
        if (car !== bestCar) car.show(false, DEBUG_MODE);
    }

    if (bestCar) {
        bestCar.show(true, DEBUG_MODE);
        // Trait laser bleu guidant vers le prochain checkpoint
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

    // 4. Visualiseur de Réseau de Neurones en Direct (HUD haute technologie)
    if (SHOW_NN_VISUALIZER) {
        drawNeuralNetworkVisualizer();
    }

    // 5. Dashboard et Télémétrie Motorsport
    drawHUD();
}

/**
 * Une étape élémentaire d'évolution physique et décisionnelle
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
            // Détection du leader actuel
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

    // Sortie de l'écran
    if (car.pos.x < 0 || car.pos.x > width || car.pos.y < 0 || car.pos.y > height) {
        car.dead = true;
    }
}

/**
 * Visualiseur interactif du Réseau de Neurones en direct (HUD)
 * Dessine les neurones par couche, leurs activations instantanées et les synapses pondérées
 */
function drawNeuralNetworkVisualizer() {
    let activeCar = bestCar || (cars.length > 0 ? cars[0] : null);
    if (!activeCar || !activeCar.brain) return;

    let brain = activeCar.brain;
    let topology = brain.topology;
    let activations = brain.getActivations();

    let boxW = 280;
    let boxH = 175;
    let boxX = width - boxW - 20;
    let boxY = height - boxH - 20;

    push();
    // Cadre futuriste semi-transparent
    fill(15, 23, 42, 220);
    stroke(56, 189, 248, 100);
    strokeWeight(1.5);
    rect(boxX, boxY, boxW, boxH, 8);

    // Titre de l'architecture
    noStroke();
    fill(203, 213, 225);
    textSize(11);
    textAlign(LEFT, TOP);
    text(`🧠 RÉSEAU IA : [${topology.join('-')}] (${NUM_RAYS} rayons)`, boxX + 12, boxY + 8);

    let numLayers = topology.length;
    let layerSpacing = (boxW - 40) / Math.max(1, numLayers - 1);
    let layerPositions = [];

    // Calcul des positions de chaque neurone
    for (let l = 0; l < numLayers; l++) {
        let count = topology[l];
        let x = boxX + 20 + l * layerSpacing;
        let nodes = [];
        let nodeSpacing = (boxH - 45) / Math.max(1, count);
        let startY = boxY + 30 + (boxH - 45 - (count - 1) * nodeSpacing) / 2;

        for (let i = 0; i < count; i++) {
            let y = startY + i * nodeSpacing;
            nodes.push({ x, y });
        }
        layerPositions.push(nodes);
    }

    // 1. Dessin des synapses avec couleurs selon le signe et intensité du poids
    for (let l = 0; l < brain.weights.length; l++) {
        let W = brain.weights[l];
        let fromNodes = layerPositions[l];
        let toNodes = layerPositions[l + 1];

        for (let i = 0; i < fromNodes.length; i++) {
            for (let j = 0; j < toNodes.length; j++) {
                let weight = W[i] ? W[i][j] : 0;
                let absW = Math.abs(weight);
                let alpha = constrain(absW * 140, 20, 220);

                if (weight > 0) {
                    stroke(56, 189, 248, alpha); // Cyan pour excitation
                } else {
                    stroke(244, 63, 94, alpha);  // Rose / Rouge pour inhibition
                }
                strokeWeight(constrain(absW * 1.5, 0.4, 2.2));
                line(fromNodes[i].x, fromNodes[i].y, toNodes[j].x, toNodes[j].y);
            }
        }
    }

    // 2. Dessin des neurones avec halo selon leur niveau d'activation
    for (let l = 0; l < numLayers; l++) {
        let acts = activations[l] || [];
        for (let i = 0; i < layerPositions[l].length; i++) {
            let pos = layerPositions[l][i];
            let act = acts[i] !== undefined ? acts[i] : 0.5;

            // Halo d'énergie
            noStroke();
            fill(56, 189, 248, act * 150);
            circle(pos.x, pos.y, 11);

            // Corps du neurone
            fill(act > 0.5 ? color(16, 185, 129) : color(30, 41, 59));
            stroke(255, 255, 255, 200);
            strokeWeight(1);
            circle(pos.x, pos.y, 6.5);
        }
    }

    // Étiquettes Entrées / Sorties
    fill(148, 163, 184);
    textSize(8.5);
    textAlign(CENTER, CENTER);
    text("Capteurs", boxX + 20, boxY + boxH - 8);
    text("Commandes", boxX + boxW - 25, boxY + boxH - 8);

    pop();
}

/**
 * Télémétrie Motorsport & HUD haute performance
 */
function drawHUD() {
    push();
    textAlign(LEFT, TOP);

    const marginX = 25;
    const startY = 20;

    // Panneau de télémétrie moderne
    fill(15, 23, 42, 190);
    stroke(56, 189, 248, 80);
    strokeWeight(1);
    rect(marginX - 10, startY - 10, 250, 160, 8);

    // Titre
    fill(56, 189, 248);
    textSize(13);
    textStyle(BOLD);
    text("🏁 TÉLÉMÉTRIE MOTORSPORT", marginX, startY);

    textStyle(NORMAL);
    textSize(11);
    fill(226, 232, 240);

    let aliveCount = cars.filter(c => !c.dead).length;
    let curSpeed = (bestCar && !bestCar.dead) ? bestCar.vel.mag() : 0;
    let kmh = (curSpeed * 18).toFixed(0);

    text(`🧬 Génération : ${generation}`, marginX, startY + 22);
    text(`🏎️ Voitures en piste : ${aliveCount} / ${TOTAL_POP}`, marginX, startY + 38);
    text(`⚡ Vitesse Leader : ${kmh} km/h (max: ${(GAME_SPEED_LIMIT * 18).toFixed(0)})`, marginX, startY + 54);
    text(`📡 Rayons actifs : ${NUM_RAYS} (Portée: ${SIGHT_DIST}px)`, marginX, startY + 70);
    text(`🧠 Topologie : [${getTopology(NUM_RAYS).join('-')}]`, marginX, startY + 86);
    text(`⏱️ Vitesse simu : ${SIMULATION_SPEED}x ${TRAINING_PAUSED ? '(PAUSE)' : ''}`, marginX, startY + 102);

    if (bestLapTimeRecord) {
        fill(245, 158, 11);
        text(`🏆 Record du tour : ${bestLapTimeRecord.toFixed(2)}s`, marginX, startY + 118);
    } else {
        fill(148, 163, 184);
        text(`🎯 Record du tour : En attente...`, marginX, startY + 118);
    }

    // Barre de progression du tour pour le leader
    if (bestCar && checkpoints.length > 0) {
        let progress = (bestCar.checkpointIndex / checkpoints.length);
        fill(30, 41, 59);
        rect(marginX, startY + 136, 220, 8, 4);
        fill(16, 185, 129);
        rect(marginX, startY + 136, 220 * progress, 8, 4);
    }

    // Message d'entraînement terminé si 60% de réussite
    if (trainingFinished) {
        fill(16, 185, 129, 230);
        stroke(255);
        strokeWeight(2);
        rect(width / 2 - 200, 30, 400, 50, 10);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(18);
        textStyle(BOLD);
        text("🏆 ENTRAÎNEMENT RÉUSSI (> 60%) !", width / 2, 55);
    }

    pop();
}

/**
 * Raccourcis clavier interactifs
 */
function keyPressed() {
    if (document.activeElement?.matches('input, select, textarea')) return;

    if (key === 'd' || key === 'D') {
        DEBUG_MODE = !DEBUG_MODE;
        console.log("Mode Debug:", DEBUG_MODE ? "ON" : "OFF");
    } else if (key === 'n' || key === 'N') {
        SHOW_NN_VISUALIZER = !SHOW_NN_VISUALIZER;
    } else if (key === 'g' || key === 'G') {
        // Forcer immédiatement la génération suivante
        for (let car of cars) car.dead = true;
    } else if (key === 'f' || key === 'F') {
        FOCUS_BEST_CAR = !FOCUS_BEST_CAR;
    } else if (key === 'r' || key === 'R') {
        resetTraining(false);
    } else if (key === ' ') {
        TRAINING_PAUSED = !TRAINING_PAUSED;
    } else if (key === 's' || key === 'S') {
        saveChampionModel();
    } else if (key === 'l' || key === 'L') {
        loadChampionModel();
    } else if (key === '+' || key === '=') {
        SIMULATION_SPEED = Math.min(20, SIMULATION_SPEED + 1);
        updateSpeedUI();
    } else if (key === '-' || key === '_') {
        SIMULATION_SPEED = Math.max(1, SIMULATION_SPEED - 1);
        updateSpeedUI();
    }
}

function updateSpeedUI() {
    const sel = document.getElementById('simSpeedSelect');
    if (sel) sel.value = SIMULATION_SPEED;
}

/**
 * Liaison des événements des curseurs et contrôles DOM
 */
function bindUIControls() {
    const link = (id, event, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, callback);
        return el;
    };

    // Vitesse Max
    link('speedSlider', 'input', (e) => {
        GAME_SPEED_LIMIT = parseFloat(e.target.value);
        document.getElementById('speedVal').innerText = GAME_SPEED_LIMIT;
    });

    // Accélération / Braquage
    link('forceSlider', 'input', (e) => {
        CAR_MAX_FORCE = parseFloat(e.target.value);
        document.getElementById('forceVal').innerText = CAR_MAX_FORCE.toFixed(2);
    });

    // Nombre de Rayons Capteurs
    link('raysSlider', 'input', (e) => {
        updateRayCount(e.target.value);
        document.getElementById('raysVal').innerText = NUM_RAYS;
        updateDynamicTopologyUI();
        resetTraining(true);
    });

    // Portée des Rayons
    link('sightSlider', 'input', (e) => {
        SIGHT_DIST = parseInt(e.target.value);
        document.getElementById('sightVal').innerText = `${SIGHT_DIST}px`;
    });

    // Champ de Vision (FOV)
    link('fovSlider', 'input', (e) => {
        let deg = parseInt(e.target.value);
        FOV = (deg * Math.PI) / 180;
        document.getElementById('fovVal').innerText = `${deg}°`;
    });

    // Nombre de Couches Cachées
    link('layersCountSlider', 'input', (e) => {
        HIDDEN_LAYERS_COUNT = parseInt(e.target.value);
        document.getElementById('layersCountVal').innerText = HIDDEN_LAYERS_COUNT;
        updateDynamicTopologyUI();
        resetTraining(true);
    });

    // Case à cocher : Neurones variables selon les rayons
    link('autoNeuronsCheck', 'change', (e) => {
        AUTO_NEURONS_PER_LAYER = e.target.checked;
        const manualGroup = document.getElementById('manualNeuronsGroup');
        const autoGroup = document.getElementById('autoNeuronsGroup');
        if (manualGroup) manualGroup.style.display = AUTO_NEURONS_PER_LAYER ? 'none' : 'block';
        if (autoGroup) autoGroup.style.display = AUTO_NEURONS_PER_LAYER ? 'block' : 'none';
        updateDynamicTopologyUI();
        resetTraining(true);
    });

    // Multiplicateur / Ratio de neurones par rayon
    link('ratioNeuronsSlider', 'input', (e) => {
        NEURON_RATIO_PER_RAY = parseFloat(e.target.value);
        document.getElementById('ratioNeuronsVal').innerText = `${NEURON_RATIO_PER_RAY.toFixed(1)}x`;
        updateDynamicTopologyUI();
        resetTraining(true);
    });

    // Sliders manuels par couche
    ['layer1Slider', 'layer2Slider', 'layer3Slider'].forEach((id, idx) => {
        link(id, 'input', (e) => {
            MANUAL_LAYER_NEURONS[idx] = parseInt(e.target.value);
            document.getElementById(`${id}Val`).innerText = e.target.value;
            updateDynamicTopologyUI();
            resetTraining(true);
        });
    });

    // Vitesse de Simulation (Time Warp)
    link('simSpeedSelect', 'change', (e) => {
        SIMULATION_SPEED = parseInt(e.target.value);
    });

    // Taux de Mutation
    link('mutSlider', 'input', (e) => {
        MUTATION_RATE = parseFloat(e.target.value);
        document.getElementById('mutVal').innerText = `${(MUTATION_RATE * 100).toFixed(0)}%`;
    });

    // Taille de la Population
    link('popSlider', 'input', (e) => {
        TOTAL_POP = parseInt(e.target.value);
        document.getElementById('popVal').innerText = TOTAL_POP;
        resetTraining(true);
    });

    // Complexité du Circuit
    link('diffSlider', 'input', (e) => {
        TRACK_DIFFICULTY = parseInt(e.target.value);
        document.getElementById('diffVal').innerText = TRACK_DIFFICULTY;
        trainingFinished = false;
        setupTrack(true);
    });

    // Largeur de la piste
    link('widthSlider', 'input', (e) => {
        TRACK_WIDTH = parseInt(e.target.value);
        document.getElementById('widthVal').innerText = TRACK_WIDTH;
        trainingFinished = false;
        setupTrack(true);
    });

    // Boutons d'Action Rapide
    link('btnNextGen', 'click', () => {
        for (let car of cars) car.dead = true;
    });

    link('btnResetTrain', 'click', () => {
        resetTraining(true);
    });

    link('btnSaveModel', 'click', () => {
        saveChampionModel();
    });

    link('btnLoadModel', 'click', () => {
        loadChampionModel();
    });

    link('btnToggleNN', 'click', () => {
        SHOW_NN_VISUALIZER = !SHOW_NN_VISUALIZER;
    });

    link('btnToggleDebug', 'click', () => {
        DEBUG_MODE = !DEBUG_MODE;
    });

    link('btnTogglePause', 'click', () => {
        TRAINING_PAUSED = !TRAINING_PAUSED;
        document.getElementById('btnTogglePause').innerText = TRAINING_PAUSED ? "▶ Reprendre" : "⏸ Pause";
    });

    updateDynamicTopologyUI();
}

/**
 * Affiche la formule et la topologie résultante dans la UI
 */
function updateDynamicTopologyUI() {
    const topo = getTopology(NUM_RAYS);
    const badge = document.getElementById('topologyBadge');
    if (badge) {
        badge.innerText = `[${topo.join(' → ')}]`;
    }
}
