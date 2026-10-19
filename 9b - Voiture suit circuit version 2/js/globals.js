// Variables Globales partagées pour Neuroévolution Racing 9b
// Architecture dynamique : rayons, couches et neurones adaptatifs

var TOTAL_POP = 30;
var NUM_RAYS = 5;               // Nombre de rayons capteurs (3 à 15)
var SIGHT_DIST = 150;           // Portée de détection des rayons en pixels
var FOV = Math.PI * 0.75;       // Champ de vision angulaire (~135°)

var cars = [];
var savedCars = [];
var walls = [];
var checkpoints = [];
var currentTrackPath = [];
var currentTiles = [];
var trackInnerPoints = [];
var trackOuterPoints = [];
var trackCenterPoints = [];

// Effets visuels & Particules
var sparks = [];
var newRecordNotificationTimer = 0;
var newRecordText = "";

var startX = 115;
var startY = 115;
var generation = 1;             // Commence à la génération 1
var bestCar = null;
var championModel = null;       // Meilleur cerveau immortel conservé
var bestFitnessRecord = 0;
var bestLapTimeRecord = null;
var generationHistory = [];      // Historique des scores pour télémétrie

// Paramètres Dynamiques de Véhicule & Vitesse
var GAME_SPEED_LIMIT = 5.0;     // Vitesse max en px/frame (défaut: 5.0)
var CAR_MAX_FORCE = 0.50;       // Force d'accélération et de braquage max (défaut: 0.50)
var CAR_START_IMPULSE = 1.2;    // Impulsion de départ

// Paramètres Génétiques & Entraînement
var MUTATION_RATE = 0.12;       // Taux de mutation gaussienne
var MUTATION_AMOUNT = 0.15;     // Amplitude de la mutation
var SIMULATION_SPEED = 1;       // Accélérateur temporel (0.5x, 1x, 2x, 5x, 10x, 20x)
var TRACK_DIFFICULTY = 6;
var TRACK_WIDTH = 110;
var trainingFinished = false;
var TRAINING_PAUSED = false;

// Affichage, Widgets & Debug
var DEBUG_MODE = false;         // Mode debug unifié (touche 'd')
var SHOW_NN_VISUALIZER = true;  // Affichage du réseau de neurones en direct (touche 'n')
var SHOW_FITNESS_GRAPH = true;  // Affichage du graphe d'évolution fitness (touche 'h')
var SHOW_LIDAR_RADAR = true;    // Affichage des jauges de capteurs LiDAR (touche 'v')
var SHOW_MINIMAP = true;        // Affichage de la minimap radar (touche 'm')
var FOCUS_BEST_CAR = false;     // Suivi caméra centré sur le leader (touche 'f')

// Nouveaux modes Cyberpunk AI Lab
var CAMERA_MODE = 'overview';   // 'overview' (global), 'follow' (leader), 'chase' (vue arrière)
var GAME_MODE = 'training';     // 'training' (apprentissage), 'championship' (course)
var TRACK_THEME = 'tokyo';      // 'tokyo', 'mars', 'cyber'
var SHOW_RAY_LABELS = true;     // Affiche les tags métriques "RAY 01: 0.82"
var CONFIG_PANEL_OPEN = true;   // État du dock gauche
var BRAIN_PANEL_OPEN = true;    // État du dock droite
var BOTTOM_DOCK_OPEN = true;    // État du dock bas
var brainVisualizer = null;     // Instance du visualiseur de cerveau


/**
 * ============================================================================
 * CONFIGURATION CENTRALE DU RÉSEAU DE NEURONES (Section 16 du cours)
 * ============================================================================
 * Le nombre de neurones de la couche INPUT est strictement égal au nombre de rayons.
 * Formule : numberOfRays -> inputSize -> networkConfig -> Neural Network -> Vehicle
 */
var networkConfig = {
    inputSize: NUM_RAYS,            // Toujours égal à NUM_RAYS
    hiddenLayers: [10, 6],          // Nombre de neurones par couche cachée (ex: 2 couches: [10, 6])
    outputSize: 2,                  // [0: braquage, 1: accélération]

    /**
     * Retourne la topologie complète sous forme de tableau [input, h1, h2..., output]
     */
    getTopology() {
        return [this.inputSize, ...this.hiddenLayers, this.outputSize];
    },

    /**
     * Formate la topologie sous forme lisible : "5 → 10 → 6 → 2"
     */
    formatTopology() {
        return this.getTopology().join(' → ');
    },

    /**
     * Suggère des tailles de couches cachées cohérentes en fonction du nombre de rayons
     * (Section 4 du cours)
     * Exemples :
     *   Rayons = 5  -> [10, 6]
     *   Rayons = 8  -> [16, 8]
     *   Rayons = 10 -> [20, 10, 5]
     *   Rayons = 12 -> [24, 12, 6]
     * @param {number} rays Nombre de rayons
     * @param {number} numLayers Nombre de couches cachées souhaité (1 à 5)
     * @returns {number[]} Tableau des tailles de couches suggérées
     */
    suggestLayers(rays, numLayers = this.hiddenLayers.length) {
        const multipliers = [2.0, 1.0, 0.5, 0.35, 0.25];
        let suggested = [];
        for (let l = 0; l < numLayers; l++) {
            let mult = multipliers[l] !== undefined ? multipliers[l] : Math.max(0.2, 1.0 / (l + 1));
            let neurons = Math.max(2, Math.round(rays * mult));
            suggested.push(neurons);
        }
        return suggested;
    }
};

/**
 * Rétrocompatibilité : calcule la topologie à partir de networkConfig
 */
function getTopology(numRays = NUM_RAYS) {
    if (numRays !== networkConfig.inputSize) {
        return [numRays, ...networkConfig.hiddenLayers, networkConfig.outputSize];
    }
    return networkConfig.getTopology();
}

/**
 * Met à jour le nombre de rayons et synchronise networkConfig.inputSize
 */
function updateRayCount(newRayCount) {
    NUM_RAYS = Math.max(3, Math.min(15, parseInt(newRayCount) || 5));
    networkConfig.inputSize = NUM_RAYS;
}
