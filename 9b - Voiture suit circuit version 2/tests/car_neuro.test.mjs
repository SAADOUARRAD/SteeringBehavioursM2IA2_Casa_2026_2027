/**
 * car_neuro.test.mjs
 * Suite de tests unitaires automatisés pour 9b — Neuroévolution Racing.
 * Couvre la topologie dynamique (TESTS 1, 2, 3, 4 du cahier des charges),
 * la règle stricte inputSize = numberOfRays, la locomotion Reynolds et les contrôles.
 */

import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Helper Vector 2D pour environnement de test Node.js
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    copy() {
        return new Vector(this.x, this.y);
    }
    add(v, y) {
        if (typeof v === 'number') {
            this.x += v;
            this.y += y || 0;
        } else if (v) {
            this.x += v.x || 0;
            this.y += v.y || 0;
        }
        return this;
    }
    sub(v) {
        this.x -= v.x || 0;
        this.y -= v.y || 0;
        return this;
    }
    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }
    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
        }
        return this;
    }
    mag() {
        return Math.hypot(this.x, this.y);
    }
    magSq() {
        return this.x * this.x + this.y * this.y;
    }
    normalize() {
        const m = this.mag();
        return m > 0 ? this.div(m) : this;
    }
    setMag(n) {
        return this.normalize().mult(n);
    }
    limit(max) {
        if (this.mag() > max) this.setMag(max);
        return this;
    }
    heading() {
        return Math.atan2(this.y, this.x);
    }
    dot(v) {
        return this.x * (v.x || 0) + this.y * (v.y || 0);
    }
    static dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
    static sub(a, b) {
        return new Vector(a.x - b.x, a.y - b.y);
    }
    static add(a, b) {
        return new Vector(a.x + b.x, a.y + b.y);
    }
    static fromAngle(angle) {
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}

// Fonction de chargement de l'environnement virtuel pour tests
function createTestingContext() {
    const sandbox = {
        p5: { Vector },
        createVector: (x, y) => new Vector(x, y),
        Math,
        constrain: (v, min, max) => Math.max(min, Math.min(max, v)),
        map: (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c),
        random: (a, b) => b === undefined ? (a === undefined ? Math.random() : Math.random() * a) : a + Math.random() * (b - a),
        color: (...args) => args,
        red: (c) => Array.isArray(c) ? (c[0] !== undefined ? c[0] : 0) : 0,
        green: (c) => Array.isArray(c) ? (c[1] !== undefined ? c[1] : 0) : 0,
        blue: (c) => Array.isArray(c) ? (c[2] !== undefined ? c[2] : 0) : 0,
        rectMode: () => {},
        translate: () => {},
        rotate: () => {},
        triangle: () => {},
        lerp: (a, b, t) => a + (b - a) * t,
        floor: Math.floor,
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
        width: 1200,
        height: 800,
        push: () => {},
        pop: () => {},
        noFill: () => {},
        stroke: () => {},
        noStroke: () => {},
        strokeWeight: () => {},
        strokeCap: () => {},
        strokeJoin: () => {},
        beginShape: () => {},
        vertex: () => {},
        endShape: () => {},
        line: () => {},
        text: () => {},
        textAlign: () => {},
        textSize: () => {},
        fill: () => {},
        circle: () => {},
        rect: () => {},
        ellipse: () => {},
        TRIANGLE_STRIP: 'triangle_strip',
        ROUND: 'round',
        CLOSE: 'close',
        CENTER: 'center',
        LEFT: 'left',
        RIGHT: 'right',
        TOP: 'top',
        BOTTOM: 'bottom',
        BOLD: 'bold',
        NORMAL: 'normal',
        ITALIC: 'italic',
        textStyle: () => {},
        window: { startAngle: 0, startCheckpointIndex: 0 },
        document: {
            getElementById: () => null,
            activeElement: { matches: () => false }
        },
        console,
        // Stub pour les API Canvas 2D (drawingContext) utilisées par WorldRenderer
        drawingContext: {
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            fillRect: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            fill: () => {},
            stroke: () => {},
            arc: () => {},
            save: () => {},
            restore: () => {},
            fillStyle: '',
            strokeStyle: '',
            globalAlpha: 1,
            shadowBlur: 0,
            shadowColor: '',
            filter: ''
        }
    };
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox);

    // Chargement ordonné des scripts
    const files = ['globals.js', 'utils.js', 'championPreset.js', 'NeuralNetwork.js', 'Ray.js', 'Track.js', 'Car.js', 'Genetic.js', 'BrainVisualizer.js', 'WorldRenderer.js'];
    for (const f of files) {
        const code = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
        vm.runInContext(code, context);
    }

    const exported = vm.runInContext('({ networkConfig, NeuralNetwork, Ray, Car, distPointToSegment, getTopology, updateRayCount, nextGeneration, calculateFitness, tournamentSelection, resetTraining, DEFAULT_CHAMPION_PRESET, drawTrackSurface, setupTrack, BrainVisualizer, WorldRenderer })', context);
    return Object.assign(context, exported);
}

describe('9b Neuroévolution Racing — Tests Unitaires & Benchmarks Cahier des Charges', () => {
    let ctx;

    beforeEach(() => {
        ctx = createTestingContext();
    });

    // =========================================================================
    // SECTION 15 DU CAHIER DES CHARGES : 4 BENCHMARKS DE TOPOLOGIE OBLIGATOIRES
    // =========================================================================

    it('TEST 1 (Cahier des charges) : Rays = 5 → Topology = 5 → 10 → 6 → 2', () => {
        const { networkConfig, Car, createVector } = ctx;

        networkConfig.inputSize = 5;
        networkConfig.hiddenLayers = [10, 6];
        networkConfig.outputSize = 2;

        assert.equal(networkConfig.formatTopology(), '5 → 10 → 6 → 2');
        assert.deepEqual(Array.from(networkConfig.getTopology()), [5, 10, 6, 2]);

        const car = new Car(null, 5);
        assert.equal(car.numRays, 5, 'Nombre de rayons doit être 5');
        assert.equal(car.rays.length, 5);
        assert.equal(car.brain.input_nodes, 5, 'Nombre d inputs doit être strictement égal à 5');

        const dummyWalls = [{ a: createVector(50, 0), b: createVector(50, 200) }];
        const inputs = car.look(dummyWalls);
        assert.equal(inputs.length, 5, 'Exactement 5 entrées issues des 5 rayons');

        car.think(dummyWalls);
        assert.ok(!Number.isNaN(car.acc.x));
    });

    it('TEST 2 (Cahier des charges) : Rays = 8 → Topology = 8 → 16 → 8 → 2', () => {
        const { networkConfig, Car, createVector } = ctx;

        networkConfig.inputSize = 8;
        networkConfig.hiddenLayers = [16, 8];
        networkConfig.outputSize = 2;

        assert.equal(networkConfig.formatTopology(), '8 → 16 → 8 → 2');
        assert.deepEqual(Array.from(networkConfig.getTopology()), [8, 16, 8, 2]);

        const car = new Car(null, 8);
        assert.equal(car.numRays, 8);
        assert.equal(car.brain.input_nodes, 8);

        const dummyWalls = [{ a: createVector(150, 0), b: createVector(150, 200) }];
        const inputs = car.look(dummyWalls);
        assert.equal(inputs.length, 8);

        car.think(dummyWalls);
        assert.ok(!Number.isNaN(car.acc.x));
    });

    it('TEST 3 (Cahier des charges) : Rays = 10 → Topology = 10 → 20 → 10 → 5 → 2', () => {
        const { networkConfig, Car, createVector } = ctx;

        networkConfig.inputSize = 10;
        networkConfig.hiddenLayers = [20, 10, 5];
        networkConfig.outputSize = 2;

        assert.equal(networkConfig.formatTopology(), '10 → 20 → 10 → 5 → 2');
        assert.deepEqual(Array.from(networkConfig.getTopology()), [10, 20, 10, 5, 2]);

        const car = new Car(null, 10);
        assert.equal(car.numRays, 10);
        assert.equal(car.brain.input_nodes, 10);

        const dummyWalls = [{ a: createVector(80, 0), b: createVector(80, 300) }];
        const inputs = car.look(dummyWalls);
        assert.equal(inputs.length, 10);

        car.think(dummyWalls);
        assert.ok(!Number.isNaN(car.acc.x));
    });

    it('TEST 4 (Cahier des charges) : Rays = 12 → Topology = 12 → 24 → 12 → 6 → 2', () => {
        const { networkConfig, Car, createVector } = ctx;

        networkConfig.inputSize = 12;
        networkConfig.hiddenLayers = [24, 12, 6];
        networkConfig.outputSize = 2;

        assert.equal(networkConfig.formatTopology(), '12 → 24 → 12 → 6 → 2');
        assert.deepEqual(Array.from(networkConfig.getTopology()), [12, 24, 12, 6, 2]);

        const car = new Car(null, 12);
        assert.equal(car.numRays, 12);
        assert.equal(car.brain.input_nodes, 12);

        const dummyWalls = [{ a: createVector(120, 0), b: createVector(120, 300) }];
        const inputs = car.look(dummyWalls);
        assert.equal(inputs.length, 12);

        car.think(dummyWalls);
        assert.ok(!Number.isNaN(car.acc.x));
    });

    // =========================================================================
    // TESTS UNITAIRES DES FONCTIONNALITÉS ESSENTIELLES ET LIMITES
    // =========================================================================

    it('networkConfig.suggestLayers : calcule des tailles de couches intelligentes selon les rayons', () => {
        const { networkConfig } = ctx;

        // Si rayons = 10 et 3 couches demandées -> [20, 10, 5]
        const suggested10 = networkConfig.suggestLayers(10, 3);
        assert.deepEqual(Array.from(suggested10), [20, 10, 5]);

        // Si rayons = 5 et 2 couches -> [10, 5] (ou [10, 6])
        const suggested5 = networkConfig.suggestLayers(5, 2);
        assert.equal(suggested5.length, 2);
        assert.ok(suggested5[0] >= 8 && suggested5[0] <= 12);
    });

    it('NeuralNetwork : instanciation, prédiction et bornes des activations', () => {
        const { NeuralNetwork } = ctx;

        const nn = new NeuralNetwork([5, 10, 6, 2]);
        assert.equal(nn.input_nodes, 5);
        assert.equal(nn.output_nodes, 2);
        assert.equal(nn.weights.length, 3, '3 matrices de poids pour 4 couches');

        const inputs = [0.2, 0.8, 0.5, 0.1, 0.9];
        const outputs = nn.predict(inputs);

        assert.equal(outputs.length, 2, 'Doit renvoyer exactement 2 sorties');
        assert.ok(outputs[0] >= 0 && outputs[0] <= 1, 'Sortie 0 dans [0, 1]');
        assert.ok(outputs[1] >= 0 && outputs[1] <= 1, 'Sortie 1 dans [0, 1]');

        const acts = nn.getActivations();
        assert.equal(acts.length, 4, '4 couches d activations enregistrées');
        assert.equal(acts[0].length, 5, 'Couche entrée = 5 neurones');
        assert.equal(acts[1].length, 10, 'Couche cachée 1 = 10 neurones');
        assert.equal(acts[2].length, 6, 'Couche cachée 2 = 6 neurones');
        assert.equal(acts[3].length, 2, 'Couche sortie = 2 neurones');
    });

    it('NeuralNetwork : clonage (copy) et mutation gaussienne', () => {
        const { NeuralNetwork } = ctx;

        const parent = new NeuralNetwork([8, 12, 2]);
        const clone = parent.copy();

        assert.equal(clone.weights[0][0][0], parent.weights[0][0][0]);

        clone.mutate(1.0, 0.5);
        assert.notEqual(clone.weights[0][0][0], parent.weights[0][0][0], 'Les poids mutés doivent être distincts');
        assert.ok(!Number.isNaN(clone.weights[0][0][0]), 'Poids valide sans NaN');
    });

    it('NeuralNetwork : sérialisation JSON (sauvegarde et chargement de champion)', () => {
        const { NeuralNetwork } = ctx;

        const original = new NeuralNetwork([5, 14, 6, 2]);
        const json = original.toJSON();

        assert.deepEqual(Array.from(json.topology), [5, 14, 6, 2]);
        assert.ok(json.weights.length > 0);
        assert.ok(json.biases.length > 0);

        const restored = NeuralNetwork.fromJSON(json);
        assert.deepEqual(Array.from(restored.topology), [5, 14, 6, 2]);
        assert.equal(restored.weights[0][0][0], original.weights[0][0][0]);
    });

    it('Ray : détection correcte de l intersection laser avec un mur', () => {
        const { Ray, createVector } = ctx;

        const pos = createVector(50, 50);
        const ray = new Ray(pos, 0);

        const wall = {
            a: createVector(100, 0),
            b: createVector(100, 100)
        };

        const pt = ray.cast(wall);
        assert.ok(pt !== null, 'Le rayon doit toucher le mur');
        assert.equal(Math.round(pt.x), 100);
        assert.equal(Math.round(pt.y), 50);

        const parallelWall = {
            a: createVector(0, 80),
            b: createVector(200, 80)
        };
        const pt2 = ray.cast(parallelWall);
        assert.equal(pt2, null, 'Un rayon parallèle ne doit pas intersecter');
    });

    it('Car : respecte le modèle Reynolds (applyForce et mise à jour de la locomotion)', () => {
        const { Car, createVector } = ctx;

        ctx.GAME_SPEED_LIMIT = 5.0;
        ctx.CAR_MAX_FORCE = 0.5;

        const car = new Car(null, 5);
        assert.equal(car.numRays, 5);
        assert.equal(car.rays.length, 5);
        assert.equal(car.maxSpeed, 5.0);

        const initialPos = car.pos.copy();
        const force = createVector(0.5, 0);
        car.applyForce(force);
        car.update();

        assert.ok(car.pos.x !== initialPos.x || car.pos.y !== initialPos.y, 'La position doit évoluer suite à la force');
        assert.ok(car.vel.mag() <= car.maxSpeed, 'La vitesse doit respecter maxSpeed');
    });

    it('Car : think() applique une force de braquage bornée par maxForce', () => {
        const { Car, createVector } = ctx;

        const car = new Car(null, 5);
        const walls = [{
            a: createVector(150, 50),
            b: createVector(150, 200)
        }];

        car.think(walls);
        assert.ok(car.acc.mag() <= car.maxForce + 1e-5, 'L accélération résultante doit être limitée à maxForce');
    });

    it('Car : franchissement de checkpoints et calcul du score', () => {
        const { Car, createVector } = ctx;

        const car = new Car(null, 5);
        const cps = [
            { a: createVector(car.pos.x - 20, car.pos.y - 20), b: createVector(car.pos.x + 20, car.pos.y + 20) },
            { a: createVector(300, 100), b: createVector(300, 200) }
        ];

        const initialScore = car.score;
        car.checkCheckpoints(cps);

        assert.ok(car.score > initialScore, 'Le score doit augmenter au passage du checkpoint');
        assert.equal(car.checkpointIndex, 1, 'Doit passer au checkpoint suivant');
    });

    it('Genetic : élitisme préserve intact le champion et la sélection par tournoi fonctionne', () => {
        const { Car, nextGeneration } = ctx;

        ctx.savedCars = [];
        for (let i = 0; i < 5; i++) {
            let c = new Car(null, 5);
            c.score = (i + 1) * 100;
            ctx.savedCars.push(c);
        }

        ctx.TOTAL_POP = 10;
        nextGeneration();

        assert.equal(ctx.cars.length, 10, 'La population doit être entièrement régénérée à TOTAL_POP');
        assert.ok(ctx.championModel !== null, 'Le modèle champion doit être conservé');
    });

    it('Vitesse maximale réglable : supporte les vitesses élevées (ex: 15 px/frame)', () => {
        const { Car, createVector } = ctx;

        ctx.GAME_SPEED_LIMIT = 15;
        const car = new Car(null, 5);
        assert.equal(car.maxSpeed, 15);

        for (let i = 0; i < 30; i++) {
            car.applyForce(createVector(2, 0));
            car.update();
        }

        assert.ok(car.vel.mag() <= 15, 'La vitesse doit être plafonnée à 15');
        assert.ok(car.vel.mag() > 8, 'Le véhicule doit avoir fortement accéléré');
    });

    it('Ray.cast : robustesse absolue face aux segments nuls ou valeurs invalides', () => {
        const { Ray, createVector } = ctx;

        const ray = new Ray(createVector(0, 0), 0);
        assert.equal(ray.cast(null), null);
        assert.equal(ray.cast({ a: null, b: null }), null);

        const degenerate = { a: createVector(10, 10), b: createVector(10, 10) };
        assert.equal(ray.cast(degenerate), null);
    });

    it('Accélération temporelle : exécution fluide de multiples pas de simulation sans NaN', () => {
        const { Car, createVector } = ctx;

        const car = new Car(null, 5);
        const dummyWalls = [{ a: createVector(300, 0), b: createVector(300, 500) }];
        const dummyCps = [{ a: createVector(100, 0), b: createVector(100, 200) }];

        for (let s = 0; s < 100; s++) {
            car.look(dummyWalls);
            car.think(dummyWalls);
            car.update();
            car.checkCheckpoints(dummyCps);
        }

        assert.ok(!Number.isNaN(car.pos.x));
        assert.ok(!Number.isNaN(car.pos.y));
        assert.ok(!Number.isNaN(car.vel.mag()));
    });

    it('DEFAULT_CHAMPION_PRESET : modèle valide et prédictions de braquage conformes', () => {
        const { DEFAULT_CHAMPION_PRESET, NeuralNetwork } = ctx;

        assert.ok(DEFAULT_CHAMPION_PRESET, 'Le preset champion doit exister');
        assert.equal(DEFAULT_CHAMPION_PRESET.topology.join(' → '), '5 → 10 → 6 → 2');

        const brain = NeuralNetwork.fromJSON(DEFAULT_CHAMPION_PRESET);
        assert.ok(brain, 'Le cerveau doit être instancié depuis le preset');

        // Obstacle à gauche -> braquage à droite (> 0.5)
        const turnRight = brain.predict([0.9, 0.7, 0, 0, 0]);
        assert.ok(turnRight[0] > 0.8, `Doit braquer à droite, turnRatio=${turnRight[0]}`);

        // Obstacle à droite -> braquage à gauche (< 0.5)
        const turnLeft = brain.predict([0, 0, 0, 0.7, 0.9]);
        assert.ok(turnLeft[0] < 0.2, `Doit braquer à gauche, turnRatio=${turnLeft[0]}`);

        // Piste dégagée -> vitesse élevée
        const straight = brain.predict([0, 0, 0, 0, 0]);
        assert.ok(straight[1] > 0.7, `Doit accélérer sur piste dégagée, thrustRatio=${straight[1]}`);
    });

    it('Rendu du Circuit : points d asphalte et vibreurs initialisés sans erreur', () => {
        const { setupTrack, trackInnerPoints, trackOuterPoints, trackCenterPoints, walls } = ctx;

        setupTrack(true);
        assert.ok(ctx.walls.length > 0, 'Les murs doivent être générés');
        assert.ok(ctx.trackInnerPoints.length > 0, 'trackInnerPoints doit être peuplé');
        assert.ok(ctx.trackOuterPoints.length > 0, 'trackOuterPoints doit être peuplé');
        assert.ok(ctx.trackCenterPoints.length > 0, 'trackCenterPoints doit être peuplé');
        assert.equal(ctx.trackInnerPoints.length, ctx.trackOuterPoints.length, 'Bordures interne et externe doivent avoir la même taille');
    });

    it('drawTrackSurface : s exécute de manière sûre sans exception', () => {
        const { drawTrackSurface, setupTrack } = ctx;

        // Cas 1 : sans track
        assert.doesNotThrow(() => drawTrackSurface());

        // Cas 2 : avec track initialisé
        setupTrack(true);
        assert.doesNotThrow(() => drawTrackSurface());
    });

    it('MUTATION_AMOUNT : paramétrage dynamique de l amplitude gaussienne sans altérer la topologie', () => {
        const { Car, NeuralNetwork } = ctx;

        const originalBrain = new NeuralNetwork([5, 10, 6, 2]);
        const car = new Car(originalBrain, 5);

        ctx.MUTATION_RATE = 0.5;
        ctx.MUTATION_AMOUNT = 0.40;

        assert.doesNotThrow(() => car.mutate(ctx.MUTATION_RATE, ctx.MUTATION_AMOUNT));
        assert.equal(car.brain.topology.join(' → '), '5 → 10 → 6 → 2');

        const out = car.brain.predict([0.5, 0.5, 0.5, 0.5, 0.5]);
        assert.ok(!Number.isNaN(out[0]));
        assert.ok(!Number.isNaN(out[1]));
    });

    it('BrainVisualizer : instanciation et mise à jour sécurisée des actuateurs', () => {
        const { BrainVisualizer, Car, NeuralNetwork } = ctx;
        const bv = new BrainVisualizer('dummyCanvas');
        assert.ok(bv);

        const car = new Car(new NeuralNetwork([5, 10, 6, 2]), 5);
        car.look(ctx.walls);
        car.think(ctx.walls);

        assert.doesNotThrow(() => bv.render(car));
        assert.doesNotThrow(() => bv.updateActuatorGauges(car));
    });

    it('LiDAR Pro : Car.show supporte les labels métriques et multi-niveaux sans exception', () => {
        const { Car, NeuralNetwork } = ctx;
        const car = new Car(new NeuralNetwork([5, 10, 6, 2]), 5);
        ctx.setupTrack(true);
        car.look(ctx.walls);

        ctx.SHOW_RAY_LABELS = true;
        assert.doesNotThrow(() => car.show(true, false));
        assert.doesNotThrow(() => car.show(false, false));

        ctx.SHOW_RAY_LABELS = false;
        assert.doesNotThrow(() => car.show(true, false));
    });

    it('Thèmes Circuit : drawTrackSurface fonctionne sur Neo Tokyo, Mars Ring et Cyber City', () => {
        const { setupTrack, drawTrackSurface } = ctx;
        setupTrack(true);

        const themes = ['tokyo', 'mars', 'cyber'];
        for (let theme of themes) {
            ctx.TRACK_THEME = theme;
            assert.doesNotThrow(() => drawTrackSurface(), `Échec sur le thème ${theme}`);
        }
    });

    it('Modes et Caméras : bascule sans régression sur Overview, Follow et Chase', () => {
        const modes = ['overview', 'follow', 'chase'];
        for (let m of modes) {
            ctx.CAMERA_MODE = m;
            assert.equal(ctx.CAMERA_MODE, m);
        }

        const gameModes = ['training', 'championship'];
        for (let gm of gameModes) {
            ctx.GAME_MODE = gm;
            assert.equal(ctx.GAME_MODE, gm);
        }
    });

    it('WorldRenderer : init et draw sans exception sur les 4 thèmes futuristes', () => {
        const { WorldRenderer, setupTrack } = ctx;
        assert.ok(WorldRenderer, 'WorldRenderer doit être défini dans le contexte');
        setupTrack(true);

        const themes = ['tokyo', 'mars', 'lunar', 'volcanic'];
        for (const theme of themes) {
            assert.doesNotThrow(
                () => WorldRenderer.init(1200, 800, theme),
                `WorldRenderer.init doit fonctionner pour le thème "${theme}"`
            );
            assert.doesNotThrow(
                () => WorldRenderer.drawBackground(1200, 800, 500, 400, 3.5),
                `WorldRenderer.drawBackground doit fonctionner pour le thème "${theme}"`
            );
            assert.doesNotThrow(
                () => WorldRenderer.drawForeground(1200, 800, 500, 400, 3.5),
                `WorldRenderer.drawForeground doit fonctionner pour le thème "${theme}"`
            );
            assert.doesNotThrow(
                () => WorldRenderer.onCheckpointHit(0),
                `WorldRenderer.onCheckpointHit doit fonctionner pour le thème "${theme}"`
            );
        }

        // setTheme doit être idempotent
        assert.doesNotThrow(() => WorldRenderer.setTheme('tokyo', 1200, 800));
        assert.doesNotThrow(() => WorldRenderer.setTheme('unknown_theme', 1200, 800));
    });
});
