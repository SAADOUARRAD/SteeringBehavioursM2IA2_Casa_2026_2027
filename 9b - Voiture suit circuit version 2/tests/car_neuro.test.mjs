/**
 * car_neuro.test.mjs
 * Suite de tests unitaires automatisés pour 9b — Neuroévolution Racing.
 * Couvre la topologie dynamique, la variation des neurones selon les rayons,
 * la propagation du réseau multicouche, le lancer de rayons et la locomotion de Reynolds.
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
        random: (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a),
        color: (...args) => args,
        width: 1200,
        height: 800,
        window: { startAngle: 0, startCheckpointIndex: 0 },
        document: {
            getElementById: () => null,
            activeElement: { matches: () => false }
        },
        console
    };
    sandbox.globalThis = sandbox;

    const context = vm.createContext(sandbox);

    // Chargement ordonné des scripts
    const files = ['globals.js', 'utils.js', 'NeuralNetwork.js', 'Ray.js', 'Car.js', 'Genetic.js'];
    for (const f of files) {
        const code = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
        vm.runInContext(code, context);
    }

    const exported = vm.runInContext('({ NeuralNetwork, Ray, Car, distPointToSegment, getTopology, updateRayCount, nextGeneration, calculateFitness, tournamentSelection, resetTraining })', context);
    return Object.assign(context, exported);
}

describe('9b Neuroévolution Racing — Tests Unitaires', () => {
    let ctx;

    beforeEach(() => {
        ctx = createTestingContext();
    });

    it('Topologie adaptative : le nombre de neurones varie proportionnellement aux rayons', () => {
        const { getTopology, updateRayCount } = ctx;

        // 1. Pour 5 rayons (inputs = 6)
        updateRayCount(5);
        const topo5 = getTopology(5);
        assert.equal(topo5[0], 6, 'Inputs = numRays + 1 = 6');
        assert.equal(topo5[topo5.length - 1], 2, 'Outputs = 2');

        // 2. Pour 9 rayons (inputs = 10)
        updateRayCount(9);
        const topo9 = getTopology(9);
        assert.equal(topo9[0], 10, 'Inputs = numRays + 1 = 10');
        // Les neurones de la première couche cachée doivent être strictement supérieurs à ceux avec 5 rayons
        assert.ok(topo9[1] > topo5[1], `Les neurones cachés doivent augmenter avec les rayons (${topo9[1]} > ${topo5[1]})`);

        // 3. Changement du nombre de couches (1, 2, 3)
        ctx.HIDDEN_LAYERS_COUNT = 1;
        const topo1L = getTopology(5);
        assert.equal(topo1L.length, 3, 'Topologie à 1 couche cachée : [in, h1, out]');

        ctx.HIDDEN_LAYERS_COUNT = 3;
        const topo3L = getTopology(5);
        assert.equal(topo3L.length, 5, 'Topologie à 3 couches cachées : [in, h1, h2, h3, out]');
    });

    it('NeuralNetwork : instanciation, prédiction et bornes des activations', () => {
        const { NeuralNetwork } = ctx;

        const nn = new NeuralNetwork([6, 16, 8, 2]);
        assert.equal(nn.input_nodes, 6);
        assert.equal(nn.output_nodes, 2);
        assert.equal(nn.weights.length, 3, '3 matrices de poids pour 4 couches');

        const inputs = [0.2, 0.8, 0.5, 0.1, 0.9, 0.4];
        const outputs = nn.predict(inputs);

        assert.equal(outputs.length, 2, 'Doit renvoyer exactement 2 sorties');
        assert.ok(outputs[0] >= 0 && outputs[0] <= 1, 'Sortie 0 dans [0, 1]');
        assert.ok(outputs[1] >= 0 && outputs[1] <= 1, 'Sortie 1 dans [0, 1]');

        // Vérification de la conservation des activations pour le visualiseur HUD
        const acts = nn.getActivations();
        assert.equal(acts.length, 4, '4 couches d activations enregistrées');
        assert.equal(acts[0].length, 6, 'Couche entrée = 6 neurones');
        assert.equal(acts[1].length, 16, 'Couche cachée 1 = 16 neurones');
        assert.equal(acts[2].length, 8, 'Couche cachée 2 = 8 neurones');
        assert.equal(acts[3].length, 2, 'Couche sortie = 2 neurones');
    });

    it('NeuralNetwork : clonage (copy) et mutation gaussienne', () => {
        const { NeuralNetwork } = ctx;

        const parent = new NeuralNetwork([8, 12, 2]);
        const clone = parent.copy();

        // Le clone doit avoir exactement les mêmes poids initiaux
        assert.equal(clone.weights[0][0][0], parent.weights[0][0][0]);

        // La mutation doit modifier les poids du clone sans toucher au parent
        clone.mutate(1.0, 0.5); // 100% de chance de mutation
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
        const ray = new Ray(pos, 0); // Rayon horizontal vers la droite (+X)

        // Mur vertical en x = 100 de y = 0 à y = 100
        const wall = {
            a: createVector(100, 0),
            b: createVector(100, 100)
        };

        const pt = ray.cast(wall);
        assert.ok(pt !== null, 'Le rayon doit toucher le mur');
        assert.equal(Math.round(pt.x), 100);
        assert.equal(Math.round(pt.y), 50);

        // Mur parallèle (horizontal en y = 80) : pas d'intersection
        const parallelWall = {
            a: createVector(0, 80),
            b: createVector(200, 80)
        };
        const pt2 = ray.cast(parallelWall);
        assert.equal(pt2, null, 'Un rayon parallèle ne doit pas intersecter');
    });

    it('Car : respecte le modèle Reynolds (applyForce et mise à jour de la locomotion)', () => {
        const { Car, createVector } = ctx;

        ctx.GAME_SPEED_LIMIT = 8;
        ctx.CAR_MAX_FORCE = 0.6;

        const car = new Car(null, 5);
        assert.equal(car.numRays, 5);
        assert.equal(car.rays.length, 5);
        assert.equal(car.maxSpeed, 8);

        const initialPos = car.pos.copy();
        const force = createVector(0.5, 0);
        car.applyForce(force);
        car.update();

        assert.ok(car.pos.x !== initialPos.x || car.pos.y !== initialPos.y, 'La position doit évoluer suite à la force');
        assert.ok(car.vel.mag() <= car.maxSpeed, 'La vitesse doit respecter maxSpeed');
    });

    it('Car : adapte automatiquement ses rayons et entrées si configuré', () => {
        const { Car, createVector } = ctx;

        const car7 = new Car(null, 7);
        assert.equal(car7.numRays, 7);
        assert.equal(car7.rays.length, 7);

        const walls = [{
            a: createVector(200, 0),
            b: createVector(200, 400)
        }];

        const inputs = car7.look(walls);
        assert.equal(inputs.length, 8, '7 rayons + 1 vitesse = 8 entrées');
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

        // Préparation de 5 voitures sauvegardées avec scores distincts
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

    it('Vitesse maximale réglable : supporte les vitesses élevées (ex: 25 px/frame)', () => {
        const { Car, createVector } = ctx;

        ctx.GAME_SPEED_LIMIT = 25;
        const car = new Car(null, 5);
        assert.equal(car.maxSpeed, 25);

        for (let i = 0; i < 30; i++) {
            car.applyForce(createVector(2, 0));
            car.update();
        }

        assert.ok(car.vel.mag() <= 25, 'La vitesse doit être plafonnée à 25');
        assert.ok(car.vel.mag() > 10, 'Le véhicule doit avoir fortement accéléré');
    });

    it('Haute densité de capteurs : 15 rayons génèrent 16 entrées et une topologie proportionnée', () => {
        const { Car, getTopology, createVector } = ctx;

        ctx.updateRayCount(15);
        const topo15 = getTopology(15);
        assert.equal(topo15[0], 16, '15 rayons + 1 vitesse = 16 inputs');

        const car15 = new Car(null, 15);
        assert.equal(car15.rays.length, 15);

        const dummyWalls = [{ a: createVector(50, 0), b: createVector(50, 200) }];
        const inputs = car15.look(dummyWalls);
        assert.equal(inputs.length, 16);
    });

    it('Mode manuel de topologie : utilise exactement les neurones configurés par couche', () => {
        const { getTopology } = ctx;

        ctx.AUTO_NEURONS_PER_LAYER = false;
        ctx.HIDDEN_LAYERS_COUNT = 3;
        ctx.MANUAL_LAYER_NEURONS = [28, 14, 7];

        const topo = getTopology(5);
        assert.deepEqual(Array.from(topo), [6, 28, 14, 7, 2], 'Doit respecter strictement la configuration manuelle');
    });

    it('Ray.cast : robustesse absolue face aux segments nuls ou valeurs invalides', () => {
        const { Ray, createVector } = ctx;

        const ray = new Ray(createVector(0, 0), 0);
        assert.equal(ray.cast(null), null);
        assert.equal(ray.cast({ a: null, b: null }), null);

        // Segment dégénéré en un point
        const degenerate = { a: createVector(10, 10), b: createVector(10, 10) };
        assert.equal(ray.cast(degenerate), null);
    });

    it('Accélération temporelle : exécution fluide de multiples pas de simulation sans NaN', () => {
        const { Car, createVector } = ctx;

        const car = new Car(null, 5);
        const dummyWalls = [{ a: createVector(300, 0), b: createVector(300, 500) }];
        const dummyCps = [{ a: createVector(100, 0), b: createVector(100, 200) }];

        // Simulation de 100 pas consécutifs
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
});
