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

    if (typeof BrainVisualizer !== 'undefined') {
        brainVisualizer = new BrainVisualizer('neuralCanvas');
    }

    setupTrack(true);
    resetTraining(true);

    // Initialisation du moteur d'environnement futuriste
    if (typeof WorldRenderer !== 'undefined') {
        WorldRenderer.init(windowWidth, windowHeight, TRACK_THEME);
    }

    initDynamicUI();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    setupTrack(false);
    if (typeof WorldRenderer !== 'undefined') {
        WorldRenderer.init(windowWidth, windowHeight, TRACK_THEME);
    }
}

function draw() {
    background(11, 14, 20);

    // Boucle de simulation (Vitesse d'entraînement / Time Warp)
    let steps = TRAINING_PAUSED ? 0 : SIMULATION_SPEED;
    for (let s = 0; s < steps; s++) {
        updateSimulationStep();
    }

    // Caméra dynamique multi-modes (Overview, Follow leader, Chase cockpit)
    push();
    if (CAMERA_MODE === 'follow' && bestCar && !bestCar.dead) {
        let targetX = width / 2 - bestCar.pos.x;
        let targetY = height / 2 - bestCar.pos.y;
        translate(targetX, targetY);
    } else if (CAMERA_MODE === 'chase' && bestCar && !bestCar.dead) {
        let heading = (typeof bestCar.vel.heading === 'function') ? bestCar.vel.heading() : Math.atan2(bestCar.vel.y, bestCar.vel.x);
        translate(width / 2, height * 0.62);
        rotate(-heading - Math.PI / 2);
        translate(-bestCar.pos.x, -bestCar.pos.y);
    } else if (FOCUS_BEST_CAR && bestCar && !bestCar.dead) {
        let targetX = width / 2 - bestCar.pos.x;
        let targetY = height / 2 - bestCar.pos.y;
        translate(targetX, targetY);
    }

    // 0a. Environnement futuriste (ville, bâtiments, pluie de fond, ponts, néons)
    if (typeof WorldRenderer !== 'undefined') {
        let leadX = bestCar ? bestCar.pos.x : null;
        let leadY = bestCar ? bestCar.pos.y : null;
        let leadSpeed = bestCar ? (typeof bestCar.vel.mag === 'function' ? bestCar.vel.mag() : Math.hypot(bestCar.vel.x, bestCar.vel.y)) : 0;
        WorldRenderer.drawBackground(width, height, leadX, leadY, leadSpeed);
    }

    // 0b. Surface de piste asphaltée réaliste F1 & vibreurs
    if (typeof drawTrackSurface === 'function') {
        drawTrackSurface();
    }

    // Rendu des cartes LEGO et du tracé du circuit
    showTiles();

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

    // 2.5 Étincelles et débris de crash
    updateAndDrawSparks();

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

    // 3b. Effets de premier plan (pluie, vignette, brouillard cinématique) — hors transformation caméra
    if (typeof WorldRenderer !== 'undefined') {
        let leadX = bestCar ? bestCar.pos.x : null;
        let leadY = bestCar ? bestCar.pos.y : null;
        let leadSpeed = bestCar ? (typeof bestCar.vel.mag === 'function' ? bestCar.vel.mag() : Math.hypot(bestCar.vel.x, bestCar.vel.y)) : 0;
        WorldRenderer.drawForeground(width, height, leadX, leadY, leadSpeed);
    }

    // 4. Visualiseur Schématique du Réseau de Neurones (Section 13 du cours)
    if (SHOW_NN_VISUALIZER) {
        drawSchematicNetworkVisualizer();
    }

    // 5. Graphe d'évolution de la fitness (Best & Moyenne)
    if (SHOW_FITNESS_GRAPH) {
        drawFitnessEvolutionGraph();
    }

    // 6. Jauges en direct des capteurs LiDAR du leader
    if (SHOW_LIDAR_RADAR) {
        drawLidarSensorBars();
    }

    // 7. Tableau de bord Cockpit F1 (Vitesse km/h & Chrono)
    drawCockpitHUD();

    // 8. Minimap radar du circuit
    if (SHOW_MINIMAP) {
        drawTrackMinimap();
    }

    // 9. Bannière d'alerte record du tour
    drawRecordBanner();

    // 10. Mise à jour de la télémétrie dans le DOM et sur le canvas
    updateTelemetryUI();

    // 11. Visualiseur de Cerveau Haute Fidélité & Actuateurs DOM
    if (brainVisualizer) {
        brainVisualizer.render(bestCar || (cars.length > 0 ? cars[0] : null));
    }

    // 12. Graphe miniature de fitness dans le dock inférieur
    drawMiniFitnessGraph();
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

        // Hook checkpoint pour les effets lumineux WorldRenderer
        if (typeof WorldRenderer !== 'undefined' && car.score > (car._prevScoreWR || 0)) {
            WorldRenderer.onCheckpointHit(car.checkpointIndex);
            car._prevScoreWR = car.score;
        }

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
            createCrashSparks(car.pos.x, car.pos.y, 14);
            return;
        }
    }

    if (car.pos.x < 0 || car.pos.x > width || car.pos.y < 0 || car.pos.y > height) {
        car.dead = true;
        createCrashSparks(car.pos.x, car.pos.y, 8);
    }
}

// --- VFX : Particules d'étincelles lors des crashs ---
function createCrashSparks(x, y, count = 12) {
    if (typeof createVector !== 'function' || typeof p5 === 'undefined') return;
    for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 1.5 + Math.random() * 4.5;
        sparks.push({
            pos: createVector(x, y),
            vel: createVector(Math.cos(angle) * speed, Math.sin(angle) * speed),
            lifespan: 25 + Math.floor(Math.random() * 20),
            maxLife: 45,
            size: 2 + Math.random() * 3,
            isGold: Math.random() > 0.4
        });
    }
}

function updateAndDrawSparks() {
    if (!sparks || sparks.length === 0 || typeof push !== 'function') return;
    push();
    noStroke();
    for (let i = sparks.length - 1; i >= 0; i--) {
        let p = sparks[i];
        p.pos.add(p.vel);
        p.vel.mult(0.92);
        p.lifespan--;

        let alpha = map(p.lifespan, 0, p.maxLife, 0, 255);
        if (p.isGold) {
            fill(245, 158, 11, alpha);
        } else {
            fill(56, 189, 248, alpha);
        }
        circle(p.pos.x, p.pos.y, p.size * (p.lifespan / p.maxLife));

        if (p.lifespan <= 0) {
            sparks.splice(i, 1);
        }
    }
    pop();
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
 * ============================================================================
 * GRAPHE D'ÉVOLUTION DE LA FITNESS (Best & Moyenne en temps réel)
 * ============================================================================
 */
function drawFitnessEvolutionGraph() {
    let boxW = 280;
    let boxH = 180;
    let boxX = 315;
    let boxY = height - boxH - 20;

    // Si l'écran est compact, ajuster pour ne pas déborder
    if (boxX + boxW > width - 360) {
        boxX = 20;
        boxY = height - boxH * 2 - 30;
    }

    push();
    // Cadre cyberpunk
    fill(13, 19, 33, 230);
    stroke(16, 185, 129, 120);
    strokeWeight(1.5);
    rect(boxX, boxY, boxW, boxH, 10);

    // Titre
    noStroke();
    fill(248, 250, 252);
    textSize(11);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    text("📈 ÉVOLUTION FITNESS", boxX + 12, boxY + 10);

    fill(148, 163, 184);
    textSize(9);
    textStyle(NORMAL);
    text(`Générations 1 à ${generation}`, boxX + 12, boxY + 24);

    let graphX = boxX + 42;
    let graphY = boxY + 42;
    let graphW = boxW - 58;
    let graphH = boxH - 68;

    // Grille millimétrée
    stroke(255, 255, 255, 20);
    strokeWeight(1);
    for (let k = 0; k <= 3; k++) {
        let gy = graphY + (graphH * k) / 3;
        line(graphX, gy, graphX + graphW, gy);
    }

    if (generationHistory.length < 2) {
        fill(148, 163, 184);
        textSize(10);
        textAlign(CENTER, CENTER);
        text("Données d'apprentissage...\n(Visible dès la Gen 2)", graphX + graphW / 2, graphY + graphH / 2);
        pop();
        return;
    }

    // Trouver le maximum de fitness pour l'échelle
    let maxFit = Math.max(100, ...generationHistory.map(g => Math.max(g.bestFitness, g.avgFitness)));

    // Tracer les courbes Best et Avg
    let n = generationHistory.length;
    let stepX = graphW / Math.max(1, n - 1);

    // 1. Courbe Moyenne (Cyan)
    noFill();
    stroke(56, 189, 248, 180);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < n; i++) {
        let x = graphX + i * stepX;
        let y = graphY + graphH - (generationHistory[i].avgFitness / maxFit) * graphH;
        vertex(x, y);
    }
    endShape();

    // 2. Courbe Best (Émeraude lumineux)
    stroke(16, 185, 129, 240);
    strokeWeight(2.2);
    beginShape();
    for (let i = 0; i < n; i++) {
        let x = graphX + i * stepX;
        let y = graphY + graphH - (generationHistory[i].bestFitness / maxFit) * graphH;
        vertex(x, y);
    }
    endShape();

    // Point sur le dernier record
    let lastX = graphX + (n - 1) * stepX;
    let lastBestY = graphY + graphH - (generationHistory[n - 1].bestFitness / maxFit) * graphH;
    noStroke();
    fill(16, 185, 129);
    circle(lastX, lastBestY, 5.5);

    // Valeur max Y
    fill(148, 163, 184);
    textSize(8);
    textAlign(RIGHT, CENTER);
    text(Math.round(maxFit), graphX - 4, graphY + 4);
    text("0", graphX - 4, graphY + graphH);

    // Légende en bas
    textAlign(LEFT, CENTER);
    textSize(8);
    fill(16, 185, 129);
    text("● Best", boxX + 15, boxY + boxH - 12);
    fill(56, 189, 248);
    text("● Moyenne", boxX + 70, boxY + boxH - 12);

    pop();
}

/**
 * ============================================================================
 * JAUGES EN TEMPS RÉEL DES CAPTEURS LIDAR DU LEADER
 * ============================================================================
 */
function drawLidarSensorBars() {
    let activeCar = bestCar || (cars.length > 0 ? cars[0] : null);
    if (!activeCar || !activeCar.rays || activeCar.rays.length === 0) return;

    let rays = activeCar.rays;
    let count = rays.length;
    let boxW = 210;
    let boxH = 36 + count * 15;
    let boxX = 20;
    let boxY = 105;

    push();
    fill(13, 19, 33, 220);
    stroke(56, 189, 248, 110);
    strokeWeight(1.2);
    rect(boxX, boxY, boxW, boxH, 8);

    noStroke();
    fill(248, 250, 252);
    textSize(10);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    text("📡 CAPTEURS LIDAR (LEADER)", boxX + 10, boxY + 8);

    textStyle(NORMAL);
    let barStartX = boxX + 38;
    let barMaxW = 110;

    for (let i = 0; i < count; i++) {
        let r = rays[i];
        let frac = (r && r.hitFraction !== undefined) ? r.hitFraction : 1.0;
        let y = boxY + 28 + i * 15;

        // Label rayon
        fill(148, 163, 184);
        textSize(8);
        textAlign(LEFT, CENTER);
        text(`R${i + 1}`, boxX + 10, y + 4);

        // Fond barre
        fill(30, 41, 59);
        rect(barStartX, y, barMaxW, 8, 2.5);

        // Barre active colorée
        let barW = Math.max(3, frac * barMaxW);
        if (frac < 0.3) {
            fill(239, 68, 68); // Rouge danger
        } else if (frac < 0.65) {
            fill(245, 158, 11); // Ambre
        } else {
            fill(16, 185, 129); // Vert dégagé
        }
        rect(barStartX, y, barW, 8, 2.5);

        // Pourcentage
        fill(248, 250, 252);
        textSize(8);
        textAlign(LEFT, CENTER);
        text(`${Math.round(frac * 100)}%`, barStartX + barMaxW + 8, y + 4);
    }

    pop();
}

/**
 * ============================================================================
 * TABLEAU DE BORD COCKPIT F1 (Vitesse km/h & Chronomètre)
 * ============================================================================
 */
function drawCockpitHUD() {
    let activeCar = bestCar || (cars.length > 0 ? cars[0] : null);
    let speedKmh = 0;
    let lapTimeStr = "--:--";

    if (activeCar && !activeCar.dead) {
        let mag = (typeof activeCar.vel.mag === 'function') ? activeCar.vel.mag() : Math.hypot(activeCar.vel.x, activeCar.vel.y);
        speedKmh = Math.round(mag * 26);
        let curLapSeconds = ((activeCar.frameCount - activeCar.lapStartTime) / 60).toFixed(2);
        lapTimeStr = `${curLapSeconds}s`;
    }

    let boxW = 210;
    let boxH = 75;
    let boxX = 20;
    let boxY = 20;

    push();
    fill(13, 19, 33, 230);
    stroke(245, 158, 11, 130);
    strokeWeight(1.5);
    rect(boxX, boxY, boxW, boxH, 8);

    // Compteur Vitesse
    noStroke();
    fill(148, 163, 184);
    textSize(8);
    textAlign(LEFT, TOP);
    text("VITESSE LEADER", boxX + 12, boxY + 10);

    fill(248, 250, 252);
    textSize(22);
    textStyle(BOLD);
    text(speedKmh, boxX + 12, boxY + 22);

    fill(245, 158, 11);
    textSize(9);
    text("KM/H", boxX + 65, boxY + 34);

    // Chrono au tour
    textStyle(NORMAL);
    fill(148, 163, 184);
    textSize(8);
    text("CHRONO TOUR", boxX + 115, boxY + 10);

    fill(56, 189, 248);
    textSize(14);
    textStyle(BOLD);
    text(lapTimeStr, boxX + 115, boxY + 24);

    // Record du tour
    fill(148, 163, 184);
    textSize(8);
    textStyle(NORMAL);
    let recStr = bestLapTimeRecord ? `${bestLapTimeRecord.toFixed(2)}s` : "--";
    text(`Record: ${recStr}`, boxX + 115, boxY + 46);

    // Barre d'accélération en bas
    let maxSpeedKmh = Math.round(GAME_SPEED_LIMIT * 26);
    let speedRatio = constrain(speedKmh / Math.max(1, maxSpeedKmh), 0, 1);
    fill(30, 41, 59);
    rect(boxX + 12, boxY + 58, boxW - 24, 7, 2);

    fill(speedRatio > 0.8 ? color(239, 68, 68) : color(16, 185, 129));
    rect(boxX + 12, boxY + 58, (boxW - 24) * speedRatio, 7, 2);

    pop();
}

/**
 * ============================================================================
 * RADAR MINIMAP DU CIRCUIT EN HAUT À DROITE
 * ============================================================================
 */
function drawTrackMinimap() {
    if (!trackCenterPoints || trackCenterPoints.length === 0) return;

    let boxW = 135;
    let boxH = 95;
    let boxX = width - 360 - boxW - 15;
    let boxY = 15;

    if (boxX < 240) return; // Écran trop petit

    push();
    fill(13, 19, 33, 210);
    stroke(56, 189, 248, 90);
    strokeWeight(1);
    rect(boxX, boxY, boxW, boxH, 8);

    noStroke();
    fill(148, 163, 184);
    textSize(8);
    textAlign(LEFT, TOP);
    text("🗺️ RADAR CIRCUIT", boxX + 8, boxY + 6);

    // Calcul de l'échelle miniature
    let scaleX = (boxW - 24) / Math.max(1, width);
    let scaleY = (boxH - 28) / Math.max(1, height);
    let miniScale = Math.min(scaleX, scaleY);
    let offX = boxX + 12 + (boxW - 24 - width * miniScale) / 2;
    let offY = boxY + 20 + (boxH - 28 - height * miniScale) / 2;

    // Tracé miniature du circuit
    noFill();
    stroke(56, 189, 248, 120);
    strokeWeight(1.2);
    beginShape();
    for (let p of trackCenterPoints) {
        vertex(offX + p[0] * miniScale, offY + p[1] * miniScale);
    }
    endShape(CLOSE);

    // Points des voitures vivantes
    noStroke();
    fill(56, 189, 248, 160);
    for (let c of cars) {
        if (!c.dead && c !== bestCar) {
            circle(offX + c.pos.x * miniScale, offY + c.pos.y * miniScale, 2.5);
        }
    }

    // Point vert leader
    if (bestCar && !bestCar.dead) {
        fill(16, 185, 129);
        circle(offX + bestCar.pos.x * miniScale, offY + bestCar.pos.y * miniScale, 4.5);
    }

    pop();
}

/**
 * ============================================================================
 * BANNIÈRE D'ALERTE NOUVEAU RECORD DU TOUR
 * ============================================================================
 */
function drawRecordBanner() {
    if (newRecordNotificationTimer <= 0) return;

    push();
    let alpha = constrain(newRecordNotificationTimer * 4, 0, 240);
    let bannerW = 340;
    let bannerH = 34;
    let bannerX = (width - 350) / 2 - bannerW / 2;
    let bannerY = 22;

    fill(245, 158, 11, alpha);
    stroke(255, 255, 255, alpha);
    strokeWeight(1.5);
    rect(bannerX, bannerY, bannerW, bannerH, 8);

    noStroke();
    fill(0, 0, 0, alpha);
    textSize(11);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(newRecordText, bannerX + bannerW / 2, bannerY + bannerH / 2);

    newRecordNotificationTimer--;
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
    const elDiversity = document.getElementById('statDiversity');
    const elBestLap = document.getElementById('statBestLap');

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

    // Calcul de la diversité génétique de la population (% d'écart moyen sur les poids)
    let diversityPct = 100;
    let activeCars = cars.length > 0 ? cars : savedCars;
    if (activeCars.length > 1 && activeCars[0].brain && activeCars[0].brain.weights && activeCars[0].brain.weights[0]) {
        let sampleSize = Math.min(8, activeCars.length);
        let diffSum = 0;
        let comparisons = 0;
        let w0 = activeCars[0].brain.weights[0];

        for (let k = 1; k < sampleSize; k++) {
            let wk = activeCars[k].brain?.weights ? activeCars[k].brain.weights[0] : null;
            if (wk && w0) {
                for (let r = 0; r < Math.min(w0.length, wk.length); r++) {
                    for (let c = 0; c < Math.min(w0[r].length, wk[r].length); c++) {
                        diffSum += Math.abs(w0[r][c] - wk[r][c]);
                        comparisons++;
                    }
                }
            }
        }
        let avgDiff = comparisons > 0 ? diffSum / comparisons : 0;
        diversityPct = Math.round(constrain(avgDiff * 120, 15, 100));
    }

    if (elGen) elGen.innerText = generation;
    if (elAlive) elAlive.innerText = `${aliveCount} / ${TOTAL_POP}`;
    if (elBestFit) elBestFit.innerText = Math.round(bestFitnessRecord);
    if (elAvgFit) elAvgFit.innerText = Math.round(currentAvg);
    if (elDiversity) elDiversity.innerText = `${diversityPct}%`;
    if (elBestLap) elBestLap.innerText = bestLapTimeRecord ? `${bestLapTimeRecord.toFixed(2)}s` : '--';

    let cockpitSpeed = document.getElementById('cockpitSpeedVal');
    let cockpitLap = document.getElementById('cockpitLapVal');
    let statGraphBest = document.getElementById('statGraphBest');

    let activeCar = bestCar || (cars.length > 0 ? cars[0] : null);
    if (activeCar && !activeCar.dead && cockpitSpeed) {
        let mag = (typeof activeCar.vel.mag === 'function') ? activeCar.vel.mag() : Math.hypot(activeCar.vel.x, activeCar.vel.y);
        cockpitSpeed.innerText = Math.round(mag * 26);
        let curLapSeconds = ((activeCar.frameCount - activeCar.lapStartTime) / 60).toFixed(2);
        if (cockpitLap) cockpitLap.innerText = `${curLapSeconds}s`;
    } else if (cockpitSpeed) {
        cockpitSpeed.innerText = '0';
        if (cockpitLap) cockpitLap.innerText = '0.00s';
    }

    if (statGraphBest) statGraphBest.innerText = Math.round(bestFitnessRecord);
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

    link('mutAmountSlider', 'input', (e) => {
        MUTATION_AMOUNT = parseFloat(e.target.value);
        document.getElementById('mutAmountVal').innerText = MUTATION_AMOUNT.toFixed(2);
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

    // Bouton Démo Champion Instantanée
    link('btnDemoChampion', 'click', () => {
        loadChampionModel();
    });

    // Boutons utilitaires & Toggles HUD
    link('btnToggleNN', 'click', () => {
        SHOW_NN_VISUALIZER = !SHOW_NN_VISUALIZER;
    });

    link('btnToggleGraph', 'click', () => {
        SHOW_FITNESS_GRAPH = !SHOW_FITNESS_GRAPH;
    });

    link('btnToggleRadar', 'click', () => {
        SHOW_LIDAR_RADAR = !SHOW_LIDAR_RADAR;
    });

    link('btnToggleMinimap', 'click', () => {
        SHOW_MINIMAP = !SHOW_MINIMAP;
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

    // 9. Contrôles de repliement des panneaux latéraux (Collapsible Docks)
    link('btnToggleConfigPanel', 'click', () => {
        CONFIG_PANEL_OPEN = !CONFIG_PANEL_OPEN;
        const panel = document.getElementById('ai-config-panel');
        const btn = document.getElementById('btnToggleConfigPanel');
        if (panel) panel.classList.toggle('collapsed', !CONFIG_PANEL_OPEN);
        if (btn) btn.innerText = CONFIG_PANEL_OPEN ? '◀' : '▶';
    });

    link('btnToggleBrainPanel', 'click', () => {
        BRAIN_PANEL_OPEN = !BRAIN_PANEL_OPEN;
        const panel = document.getElementById('ai-brain-panel');
        const btn = document.getElementById('btnToggleBrainPanel');
        if (panel) panel.classList.toggle('collapsed', !BRAIN_PANEL_OPEN);
        if (btn) btn.innerText = BRAIN_PANEL_OPEN ? '▶' : '◀';
    });

    link('btnToggleBottomDock', 'click', () => {
        BOTTOM_DOCK_OPEN = !BOTTOM_DOCK_OPEN;
        const panel = document.getElementById('ai-bottom-dock');
        const btn = document.getElementById('btnToggleBottomDock');
        if (panel) panel.classList.toggle('collapsed', !BOTTOM_DOCK_OPEN);
        if (btn) btn.innerText = BOTTOM_DOCK_OPEN ? '▼' : '▲';
    });

    // 10. Barre de caméra rapide (Overview, Follow, Chase)
    const setCamMode = (mode) => {
        CAMERA_MODE = mode;
        ['btnCamOverview', 'btnCamFollow', 'btnCamChase'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
        if (mode === 'overview') document.getElementById('btnCamOverview')?.classList.add('active');
        if (mode === 'follow') document.getElementById('btnCamFollow')?.classList.add('active');
        if (mode === 'chase') document.getElementById('btnCamChase')?.classList.add('active');
    };
    link('btnCamOverview', 'click', () => setCamMode('overview'));
    link('btnCamFollow', 'click', () => setCamMode('follow'));
    link('btnCamChase', 'click', () => setCamMode('chase'));

    // 11. Overlays rapides (Tags LiDAR)
    link('btnToggleRayLabels', 'click', (e) => {
        SHOW_RAY_LABELS = !SHOW_RAY_LABELS;
        e.currentTarget?.classList.toggle('active', SHOW_RAY_LABELS);
    });

    // 12. Sélecteur de Mode (Training vs Championship)
    link('btnModeTraining', 'click', () => {
        GAME_MODE = 'training';
        document.getElementById('btnModeTraining')?.classList.add('active');
        document.getElementById('btnModeRace')?.classList.remove('active');
    });

    link('btnModeRace', 'click', () => {
        GAME_MODE = 'championship';
        document.getElementById('btnModeRace')?.classList.add('active');
        document.getElementById('btnModeTraining')?.classList.remove('active');
        loadChampionModel();
    });

    // 13. Sélecteur de Thème de Circuit
    link('themeSelect', 'change', (e) => {
        TRACK_THEME = e.target.value;
        if (typeof document !== 'undefined' && document.body) {
            document.body.className = `theme-${TRACK_THEME}`;
        }
        if (typeof WorldRenderer !== 'undefined') {
            WorldRenderer.setTheme(TRACK_THEME, width, height);
        }
    });

    // 14. Initialisation du Modal Pédagogique Interactif
    initEducationalModal();

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
    } else if (key === 'h' || key === 'H') {
        SHOW_FITNESS_GRAPH = !SHOW_FITNESS_GRAPH;
    } else if (key === 'v' || key === 'V') {
        SHOW_LIDAR_RADAR = !SHOW_LIDAR_RADAR;
    } else if (key === 'm' || key === 'M') {
        SHOW_MINIMAP = !SHOW_MINIMAP;
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

/**
 * ============================================================================
 * MINI GRAPHE DE FITNESS DANS LE DOCK INFÉRIEUR (HTML5 Canvas 2D)
 * ============================================================================
 */
function drawMiniFitnessGraph() {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('fitnessGraphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grille millimétrée
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
        let gy = (h * k) / 4;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
    }

    if (!generationHistory || generationHistory.length < 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText("Données dès la Génération 2...", w / 2, h / 2 + 3);
        return;
    }

    let maxFit = Math.max(100, ...generationHistory.map(g => Math.max(g.bestFitness, g.avgFitness)));
    let n = generationHistory.length;
    let stepX = w / Math.max(1, n - 1);

    // 1. Courbe Moyenne (Cyan)
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        let x = i * stepX;
        let y = h - (generationHistory[i].avgFitness / maxFit) * (h - 10) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Courbe Best (Émeraude)
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        let x = i * stepX;
        let y = h - (generationHistory[i].bestFitness / maxFit) * (h - 10) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.4;
    ctx.stroke();
}

/**
 * ============================================================================
 * MODAL PÉDAGOGIQUE INTERACTIF : "HOW AI WORKS" (6 Étapes)
 * ============================================================================
 */
let currentPipelineStep = 1;

function initEducationalModal() {
    if (typeof document === 'undefined') return;

    const modal = document.getElementById('howAiWorksModal');
    const btnOpen = document.getElementById('btnHowAiWorks');
    const btnClose = document.getElementById('btnCloseModal');
    const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');

    if (!modal) return;

    const openModal = () => {
        modal.classList.remove('hidden');
        renderPipelineStep(currentPipelineStep);
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    if (btnOpen) btnOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // Navigation étapes
    const stepItems = modal.querySelectorAll('.step-item');
    stepItems.forEach(item => {
        item.addEventListener('click', () => {
            let step = parseInt(item.getAttribute('data-step')) || 1;
            currentPipelineStep = step;
            renderPipelineStep(currentPipelineStep);
        });
    });

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPipelineStep > 1) {
                currentPipelineStep--;
                renderPipelineStep(currentPipelineStep);
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (currentPipelineStep < 6) {
                currentPipelineStep++;
                renderPipelineStep(currentPipelineStep);
            } else {
                closeModal();
            }
        });
    }

    // Rendu initial
    renderPipelineStep(1);
}

function renderPipelineStep(step) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('pipelineStepContent');
    const modal = document.getElementById('howAiWorksModal');
    if (!container || !modal) return;

    // Mise à jour des classes active sur le stepper
    const stepItems = modal.querySelectorAll('.step-item');
    stepItems.forEach(item => {
        let s = parseInt(item.getAttribute('data-step'));
        item.classList.toggle('active', s === step);
    });

    const stepDots = document.getElementById('stepDots');
    if (stepDots) {
        stepDots.innerHTML = [1, 2, 3, 4, 5, 6].map(i => `<span class="step-dot ${i === step ? 'active' : ''}"></span>`).join('');
    }

    const btnNext = document.getElementById('btnNextStep');
    if (btnNext) {
        btnNext.innerText = step === 6 ? "TERMINER & TESTER EN DIRECT 🚀" : "ÉTAPE SUIVANTE ▶";
    }

    const stepsData = [
        {
            title: "1. PERCEPTION LIDAR (VISION LASER 2D)",
            badge: "SENSORS",
            formula: "p_hit = p_car + t · d_ray,   t ∈ [0, 1]",
            desc: "Chaque véhicule projette une couronne de télémètres laser (de 3 à 15 rayons) sur un champ de vision angulaire (FOV). Chaque rayon calcule en temps réel son intersection de segment avec les rails du circuit selon le modèle de détection vectoriel.",
            insight: "💡 Pédagogie : La longueur du rayon affiché à l'écran correspond exactement à la distance réelle perçue par le véhicule. S'il n'y a pas d'obstacle, le rayon s'arrête à sa portée maximale."
        },
        {
            title: "2. NORMALISATION MATHÉMATIQUE DES ENTRÉES",
            badge: "INPUTS",
            formula: "Input_i = max(0, 1 - Distance_i / Portée_Max)",
            desc: "Pour que le réseau de neurones apprenne de manière stable, les distances physiques en pixels sont converties en entrées adimensionnelles normalisées entre 0.0 et 1.0. Une valeur de 1.0 indique un impact immédiat (danger critique rouge) et 0.0 une piste dégagée (vert).",
            insight: "💡 Règle absolue : Le nombre de neurones de la couche d'entrée est STRICTEMENT égal au nombre de rayons configurés (ex: 5 rayons = 5 neurones d'entrée)."
        },
        {
            title: "3. PROPAGATION AVANT DANS LE RÉSEAU NEURONAL (MLP)",
            badge: "BRAIN FEEDFORWARD",
            formula: "a^(l+1) = σ( W^(l) · a^(l) + b^(l) ),   σ(z) = 1 / (1 + e^-z)",
            desc: "Le cerveau est un Perceptron Multicouche (MLP) paramétrable (1 à 5 couches cachées). Les signaux se propagent couche par couche à travers les matrices de poids W et les vecteurs de biais b. Les connexions cyan sont excitatrices (poids > 0), les connexions roses sont inhibitrices (poids < 0).",
            insight: "💡 Visualisation : Dans le panneau de droite, vous pouvez observer les impulsions électriques circuler en temps réel des capteurs vers les actuateurs."
        },
        {
            title: "4. MODÈLE DE STEERING & LOCOMOTION DE CRAIG REYNOLDS",
            badge: "ACTUATION",
            formula: "Steering = limit( v_desired - v_current, maxForce )",
            desc: "La couche de sortie fournit deux activations : [Braquage, Poussée]. Conformément à l'article fondateur de Craig W. Reynolds (GDC 1999), l'IA ne déplace pas la voiture par téléportation : elle calcule une force de pilotage (steering) appliquée à la masse du véhicule selon l'intégration d'Euler.",
            insight: "💡 Locomotion : a = a + F/m,  v = v + a (plafonné à maxSpeed),  p = p + v. Cela garantit un comportement physique réaliste avec inertie et dérapage."
        },
        {
            title: "5. FONCTION DE FITNESS & SURVIE SÉLECTIVE",
            badge: "FITNESS",
            formula: "Score = (Checkpoints × 1000) + Distance - Pénalité_Camping",
            desc: "La fitness mesure l'aptitude d'un individu à piloter sur le circuit. Plus une voiture franchit de checkpoints rapidement sans percuter de mur, plus sa note de fitness explose. Un système anti-camping élimine immédiatement les individus tournant en rond sur eux-mêmes.",
            insight: "💡 Objectif : Fournir un gradient de récompense continu pour guider la sélection naturelle vers la trajectoire de course idéale."
        },
        {
            title: "6. NEURO-ÉVOLUTION & SÉLECTION GÉNÉTIQUE",
            badge: "GENETIC ALGORITHM",
            formula: "W_mutated = W + N(0, σ_mutation)",
            desc: "À chaque fin de génération : 1. Le meilleur pilote absolu (Champion) est préservé intact sans mutation (Élitisme strict). 2. Les autres parents sont choisis par sélection par tournoi. 3. Une mutation gaussienne est injectée dans les poids synaptiques pour explorer de nouvelles trajectoires.",
            insight: "💡 Résultat : En 10 à 15 générations seulement, la population passe d'un chaos total à une meute de bolides négociant les virages comme des pilotes de F1 professionnels."
        }
    ];

    const data = stepsData[step - 1];
    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
            <h3 style="font-size: 0.95rem; font-weight: 800; color: #fff;">${data.title}</h3>
            <span style="font-family: var(--font-mono); font-size: 0.65rem; font-weight: 700; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 2px 8px; border-radius: 4px;">
                ${data.badge}
            </span>
        </div>
        <div style="background: rgba(10, 15, 25, 0.7); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 10px; text-align: center;">
            <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: #10b981;">
                ${data.formula}
            </span>
        </div>
        <p style="font-size: 0.78rem; line-height: 1.5; color: #cbd5e1;">
            ${data.desc}
        </p>
        <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 8px 10px; border-radius: 0 6px 6px 0; font-size: 0.72rem; color: #a7f3d0;">
            ${data.insight}
        </div>
    `;
}
