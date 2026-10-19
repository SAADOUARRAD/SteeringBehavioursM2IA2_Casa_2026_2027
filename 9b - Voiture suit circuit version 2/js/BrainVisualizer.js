/**
 * BrainVisualizer.js — Visualiseur Interactif Haute Fidélité du Réseau Neuronal
 * Affiche en temps réel :
 * 1. La structure synaptique (poids excitateurs cyan / inhibiteurs roses)
 * 2. L'animation des influx nerveux (signaux circulant des entrées aux sorties)
 * 3. L'activation des neurones avec halos dynamiques
 * 4. La synchronisation des actuateurs physiques (jauge bipolaire de braquage et jauge de poussée)
 */

class BrainVisualizer {
    constructor(canvasId = 'neuralCanvas') {
        this.canvas = (typeof document !== 'undefined') ? document.getElementById(canvasId) : null;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.signalParticles = [];
        this.pulseTimer = 0;
    }

    /**
     * Met à jour et redessine le réseau neuronal pour un véhicule donné (généralement le leader)
     * @param {Car} car Le véhicule inspecté
     */
    render(car) {
        if (!car || !car.brain) return;

        // Mise à jour des actuateurs physiques dans l'interface DOM
        this.updateActuatorGauges(car);

        // Dessin sur le canvas dédié
        if (!this.ctx || !this.canvas) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        const brain = car.brain;
        const topology = brain.getTopology ? brain.getTopology() : [NUM_RAYS, ...networkConfig.hiddenLayers, 2];
        const numLayers = topology.length;

        // Calcul des coordonnées [x, y] de chaque neurone
        const layerPositions = [];
        const padX = 26;
        const padY = 22;
        const layerSpacing = (width - padX * 2) / Math.max(1, numLayers - 1);

        for (let l = 0; l < numLayers; l++) {
            let count = topology[l];
            let displayCount = Math.min(count, 12); // Écrêtage esthétique si couche dense
            let nodeSpacing = (height - padY * 2) / Math.max(1, displayCount - 1);
            let startY = padY + (height - padY * 2 - (displayCount - 1) * nodeSpacing) / 2;

            let nodes = [];
            let x = padX + l * layerSpacing;
            for (let i = 0; i < displayCount; i++) {
                let y = startY + i * nodeSpacing;
                nodes.push({ x, y, origIndex: i });
            }
            layerPositions.push(nodes);
        }

        // 1. Tracé des connexions synaptiques avec épaisseur proportionnelle aux poids W
        if (brain.weights) {
            for (let l = 0; l < brain.weights.length; l++) {
                let W = brain.weights[l];
                let fromLayer = layerPositions[l];
                let toLayer = layerPositions[l + 1];

                for (let i = 0; i < fromLayer.length; i++) {
                    for (let j = 0; j < toLayer.length; j++) {
                        let weight = (W[i] && W[i][j] !== undefined) ? W[i][j] : 0;
                        let absW = Math.abs(weight);
                        let alpha = Math.min(0.9, Math.max(0.12, absW * 0.7));

                        ctx.beginPath();
                        ctx.moveTo(fromLayer[i].x, fromLayer[i].y);
                        ctx.lineTo(toLayer[j].x, toLayer[j].y);

                        // Cyan = Excitateur (>0), Rose/Rouge = Inhibiteur (<0)
                        if (weight >= 0) {
                            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                        } else {
                            ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;
                        }
                        ctx.lineWidth = Math.min(2.8, Math.max(0.6, absW * 1.4));
                        ctx.stroke();
                    }
                }
            }
        }

        // 2. Particules d'influx nerveux (Impulsions synaptiques en temps réel)
        this.pulseTimer++;
        if (this.pulseTimer % 4 === 0 && !car.dead) {
            // Émettre une impulsion sur un rayon actif
            if (layerPositions.length >= 2) {
                let randInput = Math.floor(Math.random() * layerPositions[0].length);
                let randHidden = Math.floor(Math.random() * layerPositions[1].length);
                this.signalParticles.push({
                    x: layerPositions[0][randInput].x,
                    y: layerPositions[0][randInput].y,
                    targetX: layerPositions[1][randHidden].x,
                    targetY: layerPositions[1][randHidden].y,
                    progress: 0,
                    speed: 0.12 + Math.random() * 0.08
                });
            }
        }

        // Animer et dessiner les impulsions
        for (let pIdx = this.signalParticles.length - 1; pIdx >= 0; pIdx--) {
            let p = this.signalParticles[pIdx];
            p.progress += p.speed;
            let curX = p.x + (p.targetX - p.x) * p.progress;
            let curY = p.y + (p.targetY - p.y) * p.progress;

            ctx.beginPath();
            ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            if (p.progress >= 1.0) {
                this.signalParticles.splice(pIdx, 1);
            }
        }

        // 3. Dessin des neurones avec halos d'activation
        let activations = brain.lastActivations || [];
        for (let l = 0; l < numLayers; l++) {
            let acts = activations[l] || [];
            let isInput = (l === 0);
            let isOutput = (l === numLayers - 1);

            for (let i = 0; i < layerPositions[l].length; i++) {
                let node = layerPositions[l][i];
                let val = (acts[node.origIndex] !== undefined) ? acts[node.origIndex] : 0.5;

                // Halo lumineux
                ctx.beginPath();
                ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
                if (isOutput) {
                    ctx.fillStyle = `rgba(245, 158, 11, ${val * 0.6})`;
                } else if (isInput) {
                    ctx.fillStyle = `rgba(16, 185, 129, ${val * 0.6})`;
                } else {
                    ctx.fillStyle = `rgba(56, 189, 248, ${val * 0.5})`;
                }
                ctx.fill();

                // Corps du neurone
                ctx.beginPath();
                ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
                if (isOutput) {
                    ctx.fillStyle = '#f59e0b';
                    ctx.strokeStyle = '#fff';
                } else if (isInput) {
                    ctx.fillStyle = val > 0.5 ? '#10b981' : '#0f172a';
                    ctx.strokeStyle = '#10b981';
                } else {
                    ctx.fillStyle = val > 0 ? '#38bdf8' : '#1e293b';
                    ctx.strokeStyle = '#94a3b8';
                }
                ctx.lineWidth = 1.2;
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    /**
     * Synchronise les jauges d'actuateurs (braquage et poussée) dans l'interface utilisateur
     * @param {Car} car Le véhicule inspecté
     */
    updateActuatorGauges(car) {
        if (typeof document === 'undefined') return;

        // Extraire les prédictions réelles du réseau
        let outputs = (car.brain && car.brain.lastOutputs) ? car.brain.lastOutputs : [0.5, 0.5];
        let steerRatio = outputs[0] !== undefined ? outputs[0] : 0.5;  // 0.0 (gauche) .. 1.0 (droite)
        let thrustRatio = outputs[1] !== undefined ? outputs[1] : 0.5; // 0.0 .. 1.0

        // Braquage centré : -1.0 .. +1.0
        let steerBipolar = (steerRatio - 0.5) * 2;

        // Mise à jour de la jauge de Braquage
        let steerValEl = document.getElementById('actuatorSteerVal');
        let steerBarEl = document.getElementById('gaugeSteerBar');
        if (steerValEl) {
            let sign = steerBipolar > 0 ? '+' : '';
            steerValEl.textContent = `${sign}${steerBipolar.toFixed(2)}`;
            steerValEl.style.color = steerBipolar < -0.1 ? '#38bdf8' : (steerBipolar > 0.1 ? '#f59e0b' : '#10b981');
        }
        if (steerBarEl) {
            let absSteer = Math.abs(steerBipolar);
            let widthPercent = Math.min(50, absSteer * 50);
            if (steerBipolar >= 0) {
                steerBarEl.style.left = '50%';
                steerBarEl.style.width = `${widthPercent}%`;
                steerBarEl.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
            } else {
                steerBarEl.style.left = `${50 - widthPercent}%`;
                steerBarEl.style.width = `${widthPercent}%`;
                steerBarEl.style.background = 'linear-gradient(90deg, #38bdf8, #10b981)';
            }
        }

        // Mise à jour de la jauge d'Accélération (Thrust)
        let thrustValEl = document.getElementById('actuatorThrustVal');
        let thrustBarEl = document.getElementById('gaugeThrustBar');
        let thrustPercent = Math.round(thrustRatio * 100);
        if (thrustValEl) {
            thrustValEl.textContent = `${thrustPercent}%`;
        }
        if (thrustBarEl) {
            thrustBarEl.style.width = `${thrustPercent}%`;
        }

        // Mise à jour du texte de décision explicable
        let decisionEl = document.getElementById('actuatorDecisionText');
        if (decisionEl) {
            let steerDesc = "CENTRE";
            if (steerBipolar < -0.4) steerDesc = "FORT GAUCHE";
            else if (steerBipolar < -0.1) steerDesc = "LÉGER GAUCHE";
            else if (steerBipolar > 0.4) steerDesc = "FORT DROITE";
            else if (steerBipolar > 0.1) steerDesc = "LÉGER DROITE";

            let thrustDesc = thrustPercent > 70 ? "PLEIN GAZ" : (thrustPercent > 35 ? "ACCÉLÉRATION" : "RALENTI");
            decisionEl.textContent = `${steerDesc} (${(steerBipolar).toFixed(2)}) — ${thrustDesc} (${thrustPercent}%)`;
        }

        // Mise à jour des tuiles LiDAR
        let lidarListEl = document.getElementById('lidarReadingsList');
        if (lidarListEl && car.rays) {
            let html = '';
            for (let i = 0; i < car.rays.length; i++) {
                let r = car.rays[i];
                let frac = (r && r.hitFraction !== undefined) ? r.hitFraction : 1.0;
                let colorClass = frac < 0.3 ? '#ef4444' : (frac < 0.65 ? '#f59e0b' : '#10b981');
                html += `
                    <div class="lidar-tile" style="border-color: ${colorClass}44;">
                        <span class="lidar-tile-id">RAY ${i + 1}</span>
                        <span class="lidar-tile-val" style="color: ${colorClass};">${frac.toFixed(2)}</span>
                    </div>
                `;
            }
            lidarListEl.innerHTML = html;
        }

        // État de vie de la cible
        let targetStateEl = document.getElementById('brainTargetState');
        if (targetStateEl) {
            if (car.dead) {
                targetStateEl.textContent = "CRASHED";
                targetStateEl.style.color = "#ef4444";
                targetStateEl.style.borderColor = "rgba(239, 68, 68, 0.4)";
                targetStateEl.style.background = "rgba(239, 68, 68, 0.15)";
            } else {
                targetStateEl.textContent = "ALIVE";
                targetStateEl.style.color = "#10b981";
                targetStateEl.style.borderColor = "rgba(16, 185, 129, 0.4)";
                targetStateEl.style.background = "rgba(16, 185, 129, 0.15)";
            }
        }
    }
}

// Export pour modules ou environnement navigateur
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrainVisualizer;
}
