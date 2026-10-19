/**
 * NeuralNetwork.js
 * Réseau de neurones multicouche dynamique pour véhicules autonomes.
 * Supporte un nombre arbitraire de couches cachées et de neurones par couche.
 * Exécution ultra-rapide (pur JS avec activations traçables pour le visualiseur HUD)
 * et compatibilité avec les tests Node.js et le navigateur.
 */

class NeuralNetwork {
    /**
     * @param {number[]|number} a Tableau de topologie [in, h1, h2..., out] OU nombre d'inputs
     * @param {number} [b] Nombre de neurones cachés (signature rétrocompatible)
     * @param {number} [c] Nombre d'outputs (signature rétrocompatible)
     */
    constructor(a, b, c) {
        if (Array.isArray(a)) {
            // Signature moderne avec topologie personnalisée : [inputs, ...hidden, outputs]
            this.topology = [...a];
        } else if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number') {
            // Signature rétrocompatible à 3 arguments : (inputs, hidden, outputs)
            this.topology = [a, b, c];
        } else if (a && a.topology) {
            // Clonage direct à partir d'un objet existant
            this.topology = [...a.topology];
        } else {
            // Topologie par défaut
            this.topology = [6, 16, 8, 2];
        }

        this.input_nodes = this.topology[0];
        this.hidden_nodes = this.topology[1];
        this.output_nodes = this.topology[this.topology.length - 1];

        // Matrices de poids et biais par couche : weights[l] a pour dimensions [in_size, out_size]
        this.weights = [];
        this.biases = [];
        this.lastActivations = []; // Stockage des activations pour le visualiseur de réseau

        this.initWeights();
    }

    /**
     * Initialise les poids avec la méthode He / Xavier (normalisée par sqrt(n_in))
     */
    initWeights() {
        this.weights = [];
        this.biases = [];

        for (let l = 0; l < this.topology.length - 1; l++) {
            const inDim = this.topology[l];
            const outDim = this.topology[l + 1];

            // Poids : matrice [inDim x outDim]
            const w = [];
            const std = Math.sqrt(2 / inDim);
            for (let i = 0; i < inDim; i++) {
                w[i] = [];
                for (let j = 0; j < outDim; j++) {
                    w[i][j] = (Math.random() * 2 - 1) * std;
                }
            }
            this.weights.push(w);

            // Biais : vecteur [outDim]
            const b = [];
            for (let j = 0; j < outDim; j++) {
                b[j] = (Math.random() * 0.2 - 0.1);
            }
            this.biases.push(b);
        }
    }

    /**
     * Fonction d'activation Sigmoïde
     */
    static sigmoid(x) {
        return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
    }

    /**
     * Propagation avant (Forward Pass) avec enregistrement des activations
     * @param {number[]} inputs Valeurs d'entrée normalisées
     * @returns {number[]} Activations de la couche de sortie (normalisées 0..1)
     */
    predict(inputs) {
        if (!inputs || inputs.length !== this.input_nodes) {
            // Normalisation de secours si la taille diffère
            let safeInputs = new Array(this.input_nodes).fill(0.5);
            if (inputs) {
                for (let i = 0; i < Math.min(inputs.length, this.input_nodes); i++) {
                    safeInputs[i] = inputs[i];
                }
            }
            inputs = safeInputs;
        }

        let current = [...inputs];
        this.lastActivations = [[...current]];

        for (let l = 0; l < this.weights.length; l++) {
            const W = this.weights[l];
            const B = this.biases[l];
            const inDim = W.length;
            const outDim = B.length;
            const next = new Array(outDim).fill(0);

            for (let j = 0; j < outDim; j++) {
                let sum = B[j];
                for (let i = 0; i < inDim; i++) {
                    sum += current[i] * W[i][j];
                }
                next[j] = NeuralNetwork.sigmoid(sum);
            }

            current = next;
            this.lastActivations.push([...current]);
        }

        this.lastOutputs = [...current];
        return current;
    }

    /**
     * Retourne toutes les activations de la dernière prédiction pour le visualiseur HUD
     * @returns {number[][]} Tableau des activations de chaque couche
     */
    getActivations() {
        return this.lastActivations.length > 0 ? this.lastActivations : this.topology.map(size => new Array(size).fill(0));
    }

    /**
     * Crée une copie exacte et indépendante du réseau
     * @returns {NeuralNetwork}
     */
    copy() {
        const clone = new NeuralNetwork(this.topology);
        for (let l = 0; l < this.weights.length; l++) {
            const inDim = this.weights[l].length;
            const outDim = this.weights[l][0].length;
            for (let i = 0; i < inDim; i++) {
                for (let j = 0; j < outDim; j++) {
                    clone.weights[l][i][j] = this.weights[l][i][j];
                }
            }
            for (let j = 0; j < this.biases[l].length; j++) {
                clone.biases[l][j] = this.biases[l][j];
            }
        }
        return clone;
    }

    /**
     * Applique une mutation génétique gaussienne aux poids et aux biais
     * @param {number} rate Probabilité de mutation par synapse (ex: 0.12)
     * @param {number} [amount=0.15] Amplitude du bruit gaussien
     */
    mutate(rate, amount = 0.15) {
        const randGaussian = () => {
            let u1 = Math.random() || 0.0001;
            let u2 = Math.random() || 0.0001;
            return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        };

        for (let l = 0; l < this.weights.length; l++) {
            const inDim = this.weights[l].length;
            const outDim = this.weights[l][0].length;
            for (let i = 0; i < inDim; i++) {
                for (let j = 0; j < outDim; j++) {
                    if (Math.random() < rate) {
                        this.weights[l][i][j] += randGaussian() * amount;
                    }
                }
            }
            for (let j = 0; j < this.biases[l].length; j++) {
                if (Math.random() < rate) {
                    this.biases[l][j] += randGaussian() * amount;
                }
            }
        }
    }

    /**
     * Libération des ressources (pour compatibilité avec l'ancien code tfjs)
     */
    dispose() {
        this.weights = [];
        this.biases = [];
        this.lastActivations = [];
    }

    /**
     * Exporte les poids et la topologie en objet JSON sérialisable
     */
    toJSON() {
        return {
            topology: this.topology,
            weights: this.weights,
            biases: this.biases
        };
    }

    /**
     * Reconstruit un réseau à partir d'un objet JSON
     * @param {object} json
     * @returns {NeuralNetwork}
     */
    static fromJSON(json) {
        if (!json || !json.topology) return null;
        const nn = new NeuralNetwork(json.topology);
        if (json.weights && json.biases) {
            nn.weights = JSON.parse(JSON.stringify(json.weights));
            nn.biases = JSON.parse(JSON.stringify(json.biases));
        }
        return nn;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NeuralNetwork };
}
