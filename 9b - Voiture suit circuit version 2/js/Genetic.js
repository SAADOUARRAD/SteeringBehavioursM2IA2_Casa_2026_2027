/**
 * Genetic.js
 * Algorithme génétique avancé avec élitisme, sélection par tournoi,
 * adaptation aux variations de topologie et persistance des champions.
 */

function nextGeneration() {
    calculateFitness();

    // Tri de la population par fitness décroissante
    savedCars.sort((a, b) => b.fitness - a.fitness);

    let champion = savedCars[0];
    let finishedCount = savedCars.filter(c => c.finished).length;
    let successRate = finishedCount / Math.max(1, savedCars.length);
    let avgFitness = savedCars.reduce((acc, c) => acc + c.fitness, 0) / Math.max(1, savedCars.length);

    // Mémorisation de l'historique de télémétrie (dernières 30 générations)
    generationHistory.push({
        gen: generation,
        bestFitness: champion ? champion.fitness : 0,
        avgFitness: avgFitness,
        successRate: successRate,
        finishedCount: finishedCount
    });
    if (generationHistory.length > 30) generationHistory.shift();

    if (champion) {
        championModel = champion.brain.copy();
    }

    if (successRate >= 0.6 && !trainingFinished) {
        trainingFinished = true;
        console.log(`🏆 Succès à la Génération ${generation} : ${(successRate * 100).toFixed(1)}% des véhicules ont franchi la ligne d'arrivée !`);
    }

    // Création de la nouvelle population avec la topologie actuelle
    cars = [];

    // 1. ÉLITISME : Le champion passe directement sans mutation dans la nouvelle génération
    if (champion) {
        let elite = new Car(champion.brain, NUM_RAYS);
        cars.push(elite);
    }

    // 2. REPRODUCTION : Les autres places sont complétées par sélection par tournoi + mutation
    while (cars.length < TOTAL_POP) {
        let parent = tournamentSelection(savedCars);
        let child = new Car(parent ? parent.brain : null, NUM_RAYS);

        if (!trainingFinished) {
            child.mutate(MUTATION_RATE, MUTATION_AMOUNT);
        }
        cars.push(child);
    }

    // 3. Libération de la mémoire de l'ancienne génération
    for (let i = 0; i < savedCars.length; i++) {
        savedCars[i].dispose();
    }
    savedCars = [];
}

function calculateFitness() {
    for (let car of savedCars) {
        // Base : Score de checkpoints et tours franchis
        car.fitness = car.score;

        // Gradient : Proximité du prochain checkpoint pour récompenser la progression
        if (checkpoints && checkpoints.length > 0) {
            let nextCP = checkpoints[car.checkpointIndex % checkpoints.length];
            if (nextCP) {
                let cpCenter = (typeof p5 !== 'undefined' && p5.Vector)
                    ? p5.Vector.add(nextCP.a, nextCP.b).div(2)
                    : { x: (nextCP.a.x + nextCP.b.x) / 2, y: (nextCP.a.y + nextCP.b.y) / 2 };

                let d = (typeof p5 !== 'undefined' && p5.Vector)
                    ? p5.Vector.dist(car.pos, cpCenter)
                    : Math.hypot(car.pos.x - cpCenter.x, car.pos.y - cpCenter.y);

                let proximityBonus = (typeof map === 'function')
                    ? map(d, 0, 400, 60, 0)
                    : Math.max(0, 60 * (1 - d / 400));

                car.fitness += Math.max(0, proximityBonus);
            }
        }

        // Pénalité légère si le véhicule a roulé trop lentement
        if (car.frameCount > 0) {
            let avgSpeed = car.score / car.frameCount;
            car.fitness += avgSpeed * 5;
        }
    }
}

function tournamentSelection(population) {
    if (!population || population.length === 0) return null;
    const TOURNAMENT_SIZE = Math.min(5, population.length);
    let best = null;

    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
        let ind = Math.floor(Math.random() * population.length);
        let candidate = population[ind];

        if (best === null || candidate.fitness > best.fitness) {
            best = candidate;
        }
    }
    return best;
}

/**
 * Réinitialise complètement l'entraînement avec la topologie courante
 */
function resetTraining(keepTrack = true) {
    for (let car of cars) car.dispose();
    for (let car of savedCars) car.dispose();
    cars = [];
    savedCars = [];
    generation = 0;
    bestCar = null;
    championModel = null;
    trainingFinished = false;
    generationHistory = [];

    if (!keepTrack && typeof setupTrack === 'function') {
        setupTrack(true);
    }

    for (let i = 0; i < TOTAL_POP; i++) {
        cars[i] = new Car(null, NUM_RAYS);
    }
}

/**
 * Sauvegarde le cerveau du champion actuel dans le LocalStorage ou télécharge en JSON
 */
function saveChampionModel() {
    let target = championModel || (bestCar ? bestCar.brain : (cars[0] ? cars[0].brain : null));
    if (!target) {
        alert("Aucun modèle à sauvegarder.");
        return;
    }
    const data = JSON.stringify(target.toJSON());
    try {
        localStorage.setItem('neuro_racing_champion', data);
        console.log("Cerveau champion sauvegardé dans le LocalStorage !");

        // Téléchargement du fichier JSON
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `champion_gen${generation}_rays${NUM_RAYS}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.warn("Erreur sauvegarde :", e);
    }
}

/**
 * Charge un modèle sauvegardé et l'applique à la population
 */
function loadChampionModel(jsonData) {
    try {
        let parsed = jsonData;
        if (typeof jsonData === 'string') {
            parsed = JSON.parse(jsonData);
        } else if (!jsonData) {
            let stored = localStorage.getItem('neuro_racing_champion');
            if (stored) {
                parsed = JSON.parse(stored);
            } else if (typeof DEFAULT_CHAMPION_PRESET !== 'undefined') {
                parsed = DEFAULT_CHAMPION_PRESET;
            }
        }

        if (parsed) {
            let loadedBrain = NeuralNetwork.fromJSON(parsed);
            if (loadedBrain) {
                // Adapte NUM_RAYS si le modèle a une taille d'entrée différente
                if (loadedBrain.input_nodes !== NUM_RAYS) {
                    updateRayCount(loadedBrain.input_nodes);
                }
                if (loadedBrain.topology && loadedBrain.topology.length > 2) {
                    networkConfig.hiddenLayers = loadedBrain.topology.slice(1, -1);
                    if (typeof updateActiveTopologyBadge === 'function') {
                        updateActiveTopologyBadge();
                    }
                }
                championModel = loadedBrain;
                resetTraining(true);
                for (let i = 0; i < TOTAL_POP; i++) {
                    cars[i] = new Car(loadedBrain, NUM_RAYS);
                    if (i > 0) cars[i].mutate(MUTATION_RATE, MUTATION_AMOUNT);
                }
                if (typeof newRecordNotificationTimer !== 'undefined') {
                    newRecordNotificationTimer = 180;
                    newRecordText = "🏆 CHAMPION PRÉ-ENTRAÎNÉ CHARGÉ AVEC SUCCÈS !";
                }
                console.log(`Cerveau champion chargé avec succès ! (Entrées: ${loadedBrain.input_nodes}, Topologie: [${loadedBrain.topology.join(' → ')}])`);
            }
        } else {
            alert("Aucun modèle champion sauvegardé trouvé dans le stockage local.");
        }
    } catch (e) {
        alert("Impossible de charger le modèle : " + e.message);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nextGeneration, calculateFitness, tournamentSelection, resetTraining };
}
