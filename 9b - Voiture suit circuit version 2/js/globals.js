// Variables Globales partagées pour Neuroévolution Racing 9b
// Architecture dynamique : rayons, couches et neurones adaptatifs

var TOTAL_POP = 40;
var NUM_RAYS = 5;               // Nombre de rayons capteurs (3 à 15)
var NB_ASSETS = NUM_RAYS + 1;   // Nombre total d'entrées du réseau (rayons + vitesse)
var SIGHT_DIST = 160;           // Portée de détection des rayons en pixels
var FOV = Math.PI * 0.75;       // Champ de vision angulaire (~135°)

var cars = [];
var savedCars = [];
var walls = [];
var checkpoints = [];
var currentTrackPath = [];
var currentTiles = [];

var startX = 115;
var startY = 115;
var generation = 0;
var bestCar = null;
var championModel = null;       // Meilleur cerveau immortel conservé
var bestLapTimeRecord = null;
var generationHistory = [];      // Historique des scores pour télémétrie

// Paramètres Dynamiques de Véhicule & Vitesse
var GAME_SPEED_LIMIT = 8;       // Vitesse max en px/frame
var CAR_MAX_FORCE = 0.55;       // Force d'accélération et de braquage max
var CAR_START_IMPULSE = 1.8;    // Impulsion de départ

// Paramètres Génétiques & Entraînement
var MUTATION_RATE = 0.12;       // Taux de mutation gaussienne
var MUTATION_AMOUNT = 0.15;     // Amplitude de la mutation
var SIMULATION_SPEED = 1;       // Accélérateur temporel (1x, 2x, 5x, 10x, 20x)
var TRACK_DIFFICULTY = 6;
var TRACK_WIDTH = 110;
var trainingFinished = false;
var TRAINING_PAUSED = false;

// Topologie Réseau de Neurones Multicouche
var HIDDEN_LAYERS_COUNT = 2;    // Nombre de couches cachées (1, 2 ou 3)
var AUTO_NEURONS_PER_LAYER = true; // Si vrai, varie automatiquement selon le nombre de rayons
var NEURON_RATIO_PER_RAY = 2.0; // Multiplicateur de neurones par rayon
var MANUAL_LAYER_NEURONS = [16, 10, 6]; // Réglage manuel par couche si non-auto

// Affichage & Debug
var DEBUG_MODE = false;         // Mode debug unifié (touche 'd')
var SHOW_NN_VISUALIZER = true;  // Affichage du réseau de neurones en direct (touche 'n')
var FOCUS_BEST_CAR = false;     // Suivi caméra centré sur le leader (touche 'f')

/**
 * Calcule la topologie complète du réseau : [inputs, ...couches_cachées, outputs]
 * Le nombre de neurones varie directement en fonction des rayons d'entrée !
 * @param {number} numRays Nombre de rayons capteurs
 * @returns {number[]} Tableau décrivant les tailles des couches [n_in, n_h1, ..., n_out]
 */
function getTopology(numRays = NUM_RAYS) {
    const inputs = numRays + 1; // Rayons + Vitesse instantanée
    const outputs = 2;          // [Braquage, Accélération]

    let hidden = [];
    if (AUTO_NEURONS_PER_LAYER) {
        // Formule adaptative : la première couche extrait les caractéristiques spatiales,
        // les couches suivantes compressent vers les commandes de direction
        const base = Math.max(6, Math.round(inputs * NEURON_RATIO_PER_RAY));
        if (HIDDEN_LAYERS_COUNT === 1) {
            hidden = [base];
        } else if (HIDDEN_LAYERS_COUNT === 2) {
            hidden = [
                Math.round(base * 1.25),
                Math.max(4, Math.round(base * 0.7))
            ];
        } else {
            hidden = [
                Math.round(base * 1.5),
                base,
                Math.max(4, Math.round(base * 0.5))
            ];
        }
    } else {
        // Mode manuel selon les curseurs de couches
        hidden = MANUAL_LAYER_NEURONS.slice(0, HIDDEN_LAYERS_COUNT);
    }

    return [inputs, ...hidden, outputs];
}

/**
 * Met à jour le nombre d'assets et les dimensions globales
 */
function updateRayCount(newRayCount) {
    NUM_RAYS = Math.max(3, Math.min(15, parseInt(newRayCount) || 5));
    NB_ASSETS = NUM_RAYS + 1;
}
