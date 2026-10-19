/**
 * championPreset.js
 * Modèle champion pré-entraîné prêt à l'emploi (Topologie standard 5 → 10 → 6 → 2).
 * Permet une démonstration instantanée sans attendre les générations d'apprentissage.
 */

const DEFAULT_CHAMPION_PRESET = {
    topology: [5, 10, 6, 2],
    weights: [
        // Couche 0 : [5 inputs, 10 cachés]
        [
            [3.5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [2.5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 4.0, -4.0, 0, 0, 0, 0, 0, 0],
            [0, 2.5, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 3.5, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        // Couche 1 : [10 cachés, 6 cachés]
        [
            [3.0, -1.5, 0, 0, 0, 0],
            [-1.5, 3.0, 0, 0, 0, 0],
            [1.0, 0, -3.0, 0, 0, 0],
            [0, 0, 3.0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ],
        // Couche 2 : [6 cachés, 2 sorties (braquage, poussée)]
        [
            [4.0, 0],
            [-4.0, 0],
            [0, 3.5],
            [0, 0],
            [0, 0],
            [0, 0]
        ]
    ],
    biases: [
        [-1.0, -1.0, -1.0, 1.5, 0, 0, 0, 0, 0, 0],
        [0, 0, 0.5, 0, 0, 0],
        [0.0, 1.0]
    ]
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULT_CHAMPION_PRESET };
}
