class Boundary {
    constructor(x1, y1, x2, y2, type = "wall") {
        // Sécurité contre les valeurs invalides
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            x1 = x2 = y1 = y2 = 0;
        }
        this.a = createVector(x1, y1);
        this.b = createVector(x2, y2);
        this.type = type;
    }

    show() {
        if (this.type === "wall") {
            let railCol = color(56, 189, 248, 170);
            if (typeof TRACK_THEME !== 'undefined') {
                if (TRACK_THEME === 'mars') railCol = color(249, 115, 22, 180);
                else if (TRACK_THEME === 'cyber') railCol = color(99, 102, 241, 180);
            }
            // Rail de sécurité luminescent moderne
            stroke(railCol);
            strokeWeight(1.8);
            line(this.a.x, this.a.y, this.b.x, this.b.y);
        } else if (this.type === "checkpoint") {
            if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
                stroke(16, 185, 129, 60);
                strokeWeight(1);
                line(this.a.x, this.a.y, this.b.x, this.b.y);
            }
        }
    }
}

/**
 * Dessine la grille futuriste d'ambiance en arrière-plan
 */
function drawCyberEnvironmentBackground() {
    if (typeof width === 'undefined' || typeof height === 'undefined') return;
    push();
    stroke(255, 255, 255, 6);
    strokeWeight(1);
    let gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
        line(0, y, width, y);
    }
    pop();
}

/**
 * Dessine la surface asphaltée complète du circuit avec vibreurs F1,
 * ligne médiane de sécurité pointillée et ligne d'arrivée à damier.
 */
function drawTrackSurface() {
    if (!trackInnerPoints || trackInnerPoints.length === 0 || !trackOuterPoints || trackOuterPoints.length === 0) return;

    const len = trackInnerPoints.length;

    push();

    // 0. Grille d'environnement futuriste
    drawCyberEnvironmentBackground();

    // Palette selon le thème sélectionné
    let kerbColorA = color(239, 68, 68, 220);
    let kerbColorB = color(255, 255, 255, 220);
    let asphaltColor = color(20, 26, 38);
    let centerLineColor = color(250, 204, 21, 140);

    if (typeof TRACK_THEME !== 'undefined') {
        if (TRACK_THEME === 'mars') {
            kerbColorA = color(234, 88, 12, 230);
            kerbColorB = color(251, 191, 36, 230);
            asphaltColor = color(26, 18, 16);
            centerLineColor = color(251, 146, 60, 160);
        } else if (TRACK_THEME === 'cyber') {
            kerbColorA = color(6, 182, 212, 230);
            kerbColorB = color(99, 102, 241, 230);
            asphaltColor = color(11, 16, 30);
            centerLineColor = color(56, 189, 248, 160);
        }
    }

    // 1. ZONES DE DÉGAGEMENT (Léger halo d'ambiance autour de la piste)
    if (trackCenterPoints && trackCenterPoints.length > 0) {
        noFill();
        stroke(16, 24, 38, 140);
        strokeWeight(TRACK_WIDTH + 28);
        strokeCap(ROUND);
        strokeJoin(ROUND);
        beginShape();
        for (let i = 0; i < trackCenterPoints.length; i++) {
            vertex(trackCenterPoints[i][0], trackCenterPoints[i][1]);
        }
        endShape(CLOSE);
    }

    // 2. SURFACE DE L'ASPHALTE NOIR DE COURSE
    noStroke();
    fill(asphaltColor);
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= len; i++) {
        let idx = i % len;
        vertex(trackInnerPoints[idx][0], trackInnerPoints[idx][1]);
        vertex(trackOuterPoints[idx][0], trackOuterPoints[idx][1]);
    }
    endShape();

    // 3. VIBREURS BICOLORES DE COURSE (Kerbs Rouge & Blanc)
    const kerbBlockSize = 5;
    const kerbThickness = 4.5;

    for (let i = 0; i < len; i++) {
        let isBlockA = Math.floor(i / kerbBlockSize) % 2 === 0;
        let c = isBlockA ? kerbColorA : kerbColorB;
        let nextI = (i + 1) % len;

        // Vibreur intérieur
        let inP1 = trackInnerPoints[i];
        let inP2 = trackInnerPoints[nextI];
        stroke(c);
        strokeWeight(kerbThickness);
        line(inP1[0], inP1[1], inP2[0], inP2[1]);

        // Vibreur extérieur
        let outP1 = trackOuterPoints[i];
        let outP2 = trackOuterPoints[nextI];
        stroke(c);
        strokeWeight(kerbThickness);
        line(outP1[0], outP1[1], outP2[0], outP2[1]);
    }

    // 4. LIGNE MÉDIANE POINTILLÉE DORÉE (Safety Centerline)
    if (trackCenterPoints && trackCenterPoints.length > 0) {
        if (typeof drawingContext !== 'undefined' && drawingContext.setLineDash) {
            drawingContext.setLineDash([12, 16]);
        }
        noFill();
        stroke(250, 204, 21, 130); // Jaune sécurité F1
        strokeWeight(1.6);
        beginShape();
        for (let i = 0; i < trackCenterPoints.length; i++) {
            vertex(trackCenterPoints[i][0], trackCenterPoints[i][1]);
        }
        endShape(CLOSE);
        if (typeof drawingContext !== 'undefined' && drawingContext.setLineDash) {
            drawingContext.setLineDash([]);
        }
    }

    // 5. LIGNE DE DÉPART / ARRIVÉE À DAMIER (Checkered Finish Line)
    if (checkpoints && checkpoints.length > 0) {
        let cp0 = checkpoints[0];
        let pA = cp0.a;
        let pB = cp0.b;
        let numCheckers = 10;

        strokeWeight(3.5);
        for (let k = 0; k < numCheckers; k++) {
            let t1 = k / numCheckers;
            let t2 = (k + 1) / numCheckers;
            let x1 = lerp(pA.x, pB.x, t1);
            let y1 = lerp(pA.y, pB.y, t1);
            let x2 = lerp(pA.x, pB.x, t2);
            let y2 = lerp(pA.y, pB.y, t2);

            stroke(k % 2 === 0 ? color(255, 255, 255, 230) : color(20, 20, 25, 230));
            line(x1, y1, x2, y2);
        }

        // Mention discrète
        noStroke();
        fill(255, 255, 255, 190);
        textSize(8);
        textAlign(CENTER, CENTER);
        let midX = (pA.x + pB.x) / 2;
        let midY = (pA.y + pB.y) / 2;
        text("🏁 FINISH", midX, midY - 12);
    }

    pop();
}

function showTiles() {
    if (!currentTiles || currentTiles.length === 0) return;
    push();
    rectMode(CENTER);
    noFill();
    stroke(255, 255, 255, 20); // Gris très léger
    strokeWeight(1);
    for (let t of currentTiles) {
        // Dessin de la "carte"
        rect(t.x, t.y, t.w, t.h, 4);

        // Petite indication de type (optionnel)
        fill(255, 255, 255, 5);
        rect(t.x, t.y, t.w * 0.9, t.h * 0.9, 2);
    }
    pop();
}

// Variables globales définies dans globals.js (walls, checkpoints)

/**
 * Calcul de la coque convexe (Algorithm Monotone Chain)
 * Retourne les points formant la boucle externe.
 */
function getConvexHull(points) {
    if (points.length <= 3) return points;

    // Trier par X, puis Y
    let pts = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);

    const crossProduct = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

    let upper = [];
    for (let p of pts) {
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    let lower = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        let p = pts[i];
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    upper.pop();
    lower.pop();
    return upper.concat(lower);
}

/**
 * Vérifie si deux segments [p1, p2] et [p3, p4] se croisent.
 */
function doSegmentsIntersect(p1, p2, p3, p4) {
    const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

/**
 * Vérifie si un nouveau segment [p1, p2] intersecte le chemin existant.
 * On ignore les 'ignoreCount' derniers points pour permettre la continuité.
 */
function checkPathIntersection(p1, p2, path, ignoreCount = 15) {
    if (path.length < ignoreCount + 2) return false;
    for (let i = 0; i < path.length - ignoreCount - 1; i++) {
        if (doSegmentsIntersect(p1, p2, path[i], path[i + 1])) return true;
    }
    return false;
}
function interpolatePoints(points, resolution = 10) {
    let newPoints = [];
    const n = points.length;

    for (let i = 0; i < n; i++) {
        // On interpole entre p1 et p2
        let p0 = points[(i - 1 + n) % n];
        let p1 = points[i];
        let p2 = points[(i + 1) % n];
        let p3 = points[(i + 2) % n];

        for (let t = 0; t < 1; t += 1 / resolution) {
            let t2 = t * t;
            let t3 = t2 * t;

            let x = 0.5 * (
                (2 * p1[0]) +
                (-p0[0] + p2[0]) * t +
                (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            );
            let y = 0.5 * (
                (2 * p1[1]) +
                (-p0[1] + p2[1]) * t +
                (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            );
            newPoints.push([x, y]);
        }
    }
    return newPoints;
}

// Ré-échantillonnage pour une densité de points parfaitement uniforme et un bouclage parfait
function resamplePoints(points, spacing = 8) {
    let resampled = [];
    let totalDist = 0;
    const n = points.length;

    let segmentDistances = [];
    for (let i = 0; i < n; i++) {
        let d = dist(points[i][0], points[i][1], points[(i + 1) % n][0], points[(i + 1) % n][1]);
        segmentDistances.push(d);
        totalDist += d;
    }

    // On veut un nombre entier de segments pour boucler parfaitement
    let numSegments = Math.round(totalDist / spacing);
    let actualSpacing = totalDist / numSegments;

    let accumulatedDist = 0;
    let currentSegment = 0;

    for (let i = 0; i < numSegments; i++) {
        let targetDist = i * actualSpacing;

        while (accumulatedDist + segmentDistances[currentSegment] < targetDist && currentSegment < n - 1) {
            accumulatedDist += segmentDistances[currentSegment];
            currentSegment++;
        }

        let t = (targetDist - accumulatedDist) / segmentDistances[currentSegment];
        let p1 = points[currentSegment];
        let p2 = points[(currentSegment + 1) % n];

        resampled.push([
            lerp(p1[0], p2[0], t),
            lerp(p1[1], p2[1], t)
        ]);
    }

    return resampled;
}

// Lissage Laplacien Multi-Passes (Amélioré)
function smoothPoints(points, factor = 0.5, iterations = 10) {
    let current = JSON.parse(JSON.stringify(points));
    let jaggedness = map(TRACK_DIFFICULTY, 0, 50, 0, 0.15); // Plus d'aléa si dur

    for (let iter = 0; iter < iterations; iter++) {
        let next = [];
        const n = current.length;
        for (let i = 0; i < n; i++) {
            let pPrev = current[(i - 1 + n) % n];
            let pCurr = current[i];
            let pNext = current[(i + 1) % n];

            // Calcul du milieu avec une pincée d'aléatoire pour varier les angles
            let jitterX = (random() - 0.5) * jaggedness * 100;
            let jitterY = (random() - 0.5) * jaggedness * 100;

            let midX = (pPrev[0] + pNext[0]) / 2 + jitterX;
            let midY = (pPrev[1] + pNext[1]) / 2 + jitterY;

            next.push([
                pCurr[0] + (midX - pCurr[0]) * factor,
                pCurr[1] + (midY - pCurr[1]) * factor
            ]);
        }
        current = next;
    }
    return current;
}

function setupTrack(fullRegen = true) {
    walls = [];
    checkpoints = [];

    // --- MOTEUR "MASTER LEGO" (v5) ---
    if (fullRegen || currentTrackPath.length === 0) {
        // 1. Taille des cellules strictement liée à la largeur
        const cellSize = max(40, TRACK_WIDTH * 1.5);
        const gridCols = floor(width / cellSize);
        const gridRows = floor(height / cellSize);

        let grid = [];
        for (let i = 0; i < gridCols; i++) grid[i] = new Array(gridRows).fill(false);

        let path = [];
        let start = [floor(gridCols / 2), floor(gridRows / 2)];

        // Budget de recherche étendu pour la complexité
        let attempts = 0;
        const maxAttempts = 50000;

        function findLoop(x, y, targetX, targetY, currentPath, minLen) {
            attempts++;
            if (attempts > maxAttempts) return false;

            if (currentPath.length >= minLen) {
                if (abs(x - targetX) + abs(y - targetY) === 1) return true;
            }
            if (currentPath.length >= gridCols * gridRows * 0.98) return false;

            let directions = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort(() => random() - 0.5);
            for (let [dx, dy] of directions) {
                let nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows && !grid[nx][ny]) {
                    grid[nx][ny] = true;
                    currentPath.push([nx, ny]);
                    if (findLoop(nx, ny, targetX, targetY, currentPath, minLen)) return true;
                    currentPath.pop();
                    grid[nx][ny] = false;
                }
            }
            return false;
        }

        grid[start[0]][start[1]] = true;
        path.push(start);

        // Longueur de chemin très réactive à la difficulté (v6 Pro)
        const gridCap = gridCols * gridRows;
        const targetLen = min(gridCap - 2, 10 + floor(TRACK_DIFFICULTY * 2.5));

        let success = findLoop(start[0], start[1], start[0], start[1], path, targetLen);

        if (!success || path.length < 4) {
            // Fallback : Ovale dynamique sur la grille actuelle
            path = [[1, 1], [gridCols - 2, 1], [gridCols - 2, gridRows - 2], [1, gridRows - 2]];
        }

        // Conversion Grille -> Monde
        let worldPointsArray = [];
        let cellW = width / gridCols;
        let cellH = height / gridRows;

        currentTiles = [];
        for (let [gx, gy] of path) {
            currentTiles.push({
                x: (gx + 0.5) * cellW,
                y: (gy + 0.5) * cellH,
                w: cellW,
                h: cellH,
                gx: gx, gy: gy
            });
            worldPointsArray.push([(gx + 0.5) * cellW, (gy + 0.5) * cellH]);
        }

        // LISSAGE ADAPTATIF : Moins de lissage = angles plus complexes et "LEGO"
        let smoothPasses = max(3, 15 - floor(TRACK_DIFFICULTY / 4));
        let smooth = interpolatePoints(worldPointsArray, 15);
        smooth = smoothPoints(smooth, 0.5, smoothPasses);
        currentTrackPath = resamplePoints(smooth, 8);
    }

    // CALCUL DES MURS
    let centerPoints = currentTrackPath;
    const innerPoints = [], outerPoints = [];

    for (let i = 0; i < centerPoints.length; i++) {
        let p1 = centerPoints[(i - 15 + centerPoints.length) % centerPoints.length];
        let p2 = centerPoints[(i + 15) % centerPoints.length];
        let normal = createVector(-(p2[1] - p1[1]), p2[0] - p1[0]).normalize();

        let pCurr = centerPoints[i];
        let halfW = TRACK_WIDTH / 2;

        innerPoints.push([pCurr[0] + normal.x * halfW, pCurr[1] + normal.y * halfW]);
        outerPoints.push([pCurr[0] - normal.x * halfW, pCurr[1] - normal.y * halfW]);
    }

    // NORMALISATION
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    [...innerPoints, ...outerPoints].forEach(p => {
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    });

    let margin = 100;
    let trackW = (maxX - minX) || 1;
    let trackH = (maxY - minY) || 1;
    let scale = min(1, min((width - margin) / trackW, (height - margin) / trackH));
    let shiftX = (width - trackW * scale) / 2 - minX * scale;
    let shiftY = (height - trackH * scale) / 2 - minY * scale;

    const apply = (pts) => pts.forEach(p => { p[0] = p[0] * scale + shiftX; p[1] = p[1] * scale + shiftY; });
    apply(innerPoints); apply(outerPoints); apply(centerPoints);
    currentTiles.forEach(t => { t.x = t.x * scale + shiftX; t.y = t.y * scale + shiftY; t.w *= scale; t.h *= scale; });

    // Mémorisation globale pour le rendu de la surface d'asphalte
    trackInnerPoints = innerPoints;
    trackOuterPoints = outerPoints;
    trackCenterPoints = centerPoints;

    // CONSTRUCTION & CHECKPOINTS
    const cpStep = 4;
    for (let i = 0; i < innerPoints.length; i++) {
        let pi1 = innerPoints[i], pi2 = innerPoints[(i + 1) % innerPoints.length];
        walls.push(new Boundary(pi1[0], pi1[1], pi2[0], pi2[1], "wall"));
        let po1 = outerPoints[i], po2 = outerPoints[(i + 1) % outerPoints.length];
        walls.push(new Boundary(po1[0], po1[1], po2[0], po2[1], "wall"));

        if (i % cpStep === 0) {
            checkpoints.push(new Boundary(innerPoints[i][0], innerPoints[i][1], outerPoints[i][0], outerPoints[i][1], "checkpoint"));
        }
    }

    let startIdx = floor(centerPoints.length * 0.05);
    startX = centerPoints[startIdx][0]; startY = centerPoints[startIdx][1];
    let nextIdx = (startIdx + 10) % centerPoints.length;
    window.startAngle = Math.atan2(centerPoints[nextIdx][1] - startY, centerPoints[nextIdx][0] - startX);
    window.startCheckpointIndex = (Math.floor(startIdx / cpStep) + 1) % checkpoints.length;
}
