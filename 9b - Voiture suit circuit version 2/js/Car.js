/**
 * Car.js
 * Véhicule autonome guidé par réseau de neurones multicouche et capteurs laser.
 * Conforme au modèle de Reynolds : locomotion par applyForce() et steering vectoriel.
 */

class Car {
    /**
     * @param {NeuralNetwork} [brain] Cerveau hérité ou cloné
     * @param {number} [numRays=NUM_RAYS] Nombre de rayons capteurs
     */
    constructor(brain, numRays = NUM_RAYS) {
        this.numRays = Math.max(3, parseInt(numRays) || 5);
        this.maxSpeed = GAME_SPEED_LIMIT;
        this.maxForce = CAR_MAX_FORCE;

        // Position de départ avec légère variation
        this.pos = (typeof createVector === 'function')
            ? createVector(startX + (Math.random() * 6 - 3), startY + (Math.random() * 6 - 3))
            : { x: startX, y: startY };

        // Impulsion initiale dans l'axe de la piste
        let angle = (typeof window !== 'undefined' && window.startAngle) ? window.startAngle : 0;
        if (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.fromAngle) {
            this.vel = p5.Vector.fromAngle(angle).mult(CAR_START_IMPULSE);
            this.acc = createVector(0, 0);
            this.startPos = this.pos.copy();
            this.prevPos = this.pos.copy();
        } else {
            this.vel = { x: Math.cos(angle) * CAR_START_IMPULSE, y: Math.sin(angle) * CAR_START_IMPULSE };
            this.acc = { x: 0, y: 0 };
            this.startPos = { ...this.pos };
            this.prevPos = { ...this.pos };
        }

        // Dimensions du châssis
        this.width = 12;
        this.height = 24;
        this.r = 12;

        // États de vie et télémétrie
        this.dead = false;
        this.finished = false;
        this.score = 0;
        this.fitness = 0;
        this.checkpointIndex = (typeof window !== 'undefined' && window.startCheckpointIndex) ? window.startCheckpointIndex : 0;
        this.wrongWayCount = 0;
        this.laps = 0;
        this.frameCount = 0;
        this.lapStartTime = 0;
        this.bestLapTime = null;

        // Anti-camping et détection d'enlisement
        this.framesStalled = 0;
        this.framesSinceLastCheckpoint = 0;
        this.framesMovingSlowly = 0;
        this.isBraking = false;
        this.isAccelerating = false;

        // Historique de traînée pour les dérapages / trace de gomme
        this.skidHistory = [];

        // Réseau de neurones
        const topology = getTopology(this.numRays);
        if (brain) {
            this.brain = brain.copy();
        } else {
            this.brain = new NeuralNetwork(topology);
        }

        // Initialisation des rayons lasers
        this.rays = [];
        for (let i = 0; i < this.numRays; i++) {
            this.rays.push(new Ray(this.pos, 0));
        }
    }

    dispose() {
        if (this.brain && typeof this.brain.dispose === 'function') {
            this.brain.dispose();
        }
    }

    mutate(rate, amount = MUTATION_AMOUNT) {
        if (this.brain) {
            this.brain.mutate(rate, amount);
        }
    }

    applyForce(force) {
        if (!force) return;
        if (typeof this.acc.add === 'function') {
            this.acc.add(force);
        } else {
            this.acc.x += force.x || 0;
            this.acc.y += force.y || 0;
        }
    }

    update() {
        if (this.dead) return;

        this.frameCount++;
        this.maxSpeed = GAME_SPEED_LIMIT;
        this.maxForce = CAR_MAX_FORCE;

        // Vérification anti-blocage au départ (60 frames = ~1 sec)
        if (this.frameCount === 60) {
            let distStart = (typeof p5 !== 'undefined' && p5.Vector)
                ? p5.Vector.dist(this.pos, this.startPos)
                : Math.hypot(this.pos.x - this.startPos.x, this.pos.y - this.startPos.y);
            if (distStart < 35) {
                this.dead = true;
                return;
            }
        }

        // Intégration de la locomotion (Euler)
        if (typeof this.vel.add === 'function') {
            let prevSpd = this.vel.mag();
            this.vel.add(this.acc);
            this.vel.limit(this.maxSpeed);
            let curSpd = this.vel.mag();

            this.isBraking = curSpd < prevSpd - 0.15;
            this.isAccelerating = curSpd > prevSpd + 0.1;

            this.pos.add(this.vel);
            this.acc.mult(0);
        } else {
            this.vel.x += this.acc.x;
            this.vel.y += this.acc.y;
            const mag = Math.hypot(this.vel.x, this.vel.y);
            if (mag > this.maxSpeed) {
                this.vel.x = (this.vel.x / mag) * this.maxSpeed;
                this.vel.y = (this.vel.y / mag) * this.maxSpeed;
            }
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;
            this.acc.x = 0;
            this.acc.y = 0;
        }

        // Gestion de la traînée de dérapage
        if (this.frameCount % 4 === 0 && !this.dead) {
            let curPos = (typeof this.pos.copy === 'function') ? this.pos.copy() : { x: this.pos.x, y: this.pos.y };
            this.skidHistory.push(curPos);
            if (this.skidHistory.length > 10) this.skidHistory.shift();
        }

        // Anti-camping : sanctionne les toupies et véhicules tournant sur place
        this.framesMovingSlowly++;
        if (this.framesMovingSlowly > 60) {
            let distMoved = (typeof p5 !== 'undefined' && p5.Vector)
                ? p5.Vector.dist(this.pos, this.prevPos)
                : Math.hypot(this.pos.x - this.prevPos.x, this.pos.y - this.prevPos.y);

            if (distMoved < 22) {
                this.framesStalled += 60;
            } else {
                this.framesStalled = 0;
                this.prevPos = (typeof this.pos.copy === 'function') ? this.pos.copy() : { ...this.pos };
            }
            this.framesMovingSlowly = 0;
        }

        this.framesSinceLastCheckpoint++;

        // Élimination des voitures coincées plus de 2.5s ou sans checkpoint en 15s
        if (this.framesStalled > 150 || this.framesSinceLastCheckpoint > 900) {
            this.dead = true;
        }
    }

    checkCheckpoints(cps) {
        if (this.dead || !cps || cps.length === 0) return;

        let curVelMag = (typeof this.vel.mag === 'function') ? this.vel.mag() : Math.hypot(this.vel.x, this.vel.y);

        // Détection de contresens strict
        if (this.frameCount > 70 && curVelMag > 0.8) {
            let cp1 = cps[this.checkpointIndex % cps.length];
            let cp2 = cps[(this.checkpointIndex + 1) % cps.length];

            if (cp1 && cp2 && typeof p5 !== 'undefined' && p5.Vector) {
                let center1 = createVector((cp1.a.x + cp1.b.x) / 2, (cp1.a.y + cp1.b.y) / 2);
                let center2 = createVector((cp2.a.x + cp2.b.x) / 2, (cp2.a.y + cp2.b.y) / 2);
                let trackDir = p5.Vector.sub(center2, center1).normalize();

                if (this.vel.dot(trackDir) < -0.3) {
                    this.wrongWayCount++;
                    if (this.wrongWayCount > 80) {
                        this.dead = true;
                        return;
                    }
                } else if (this.vel.dot(trackDir) > 0.2) {
                    this.wrongWayCount = Math.max(0, this.wrongWayCount - 4);
                }
            }
        }

        // Franchissement de checkpoint
        let goal = cps[this.checkpointIndex % cps.length];
        if (!goal) return;

        let d = (typeof distPointToSegment === 'function')
            ? distPointToSegment(this.pos, goal.a, goal.b)
            : Math.hypot(this.pos.x - (goal.a.x + goal.b.x) / 2, this.pos.y - (goal.a.y + goal.b.y) / 2);

        if (d < 45) {
            this.checkpointIndex = (this.checkpointIndex + 1) % cps.length;
            this.score += 60;
            this.framesSinceLastCheckpoint = 0;
            this.wrongWayCount = 0;

            // Bouclage d'un tour complet !
            if (this.checkpointIndex === 0) {
                this.laps++;
                this.score += 300;
                let lapTime = (this.frameCount - this.lapStartTime) / 60;
                this.lapStartTime = this.frameCount;
                if (!this.bestLapTime || lapTime < this.bestLapTime) {
                    this.bestLapTime = lapTime;
                }
                if (!bestLapTimeRecord || lapTime < bestLapTimeRecord) {
                    bestLapTimeRecord = lapTime;
                    if (typeof newRecordNotificationTimer !== 'undefined') {
                        newRecordNotificationTimer = 180;
                        newRecordText = `⚡ NOUVEAU RECORD DU TOUR : ${lapTime.toFixed(2)}s !`;
                    }
                }
                this.finished = true;
                this.dead = true;
            }
        }
    }

    look(walls) {
        const inputs = [];
        let heading = (typeof this.vel.heading === 'function')
            ? this.vel.heading()
            : Math.atan2(this.vel.y, this.vel.x);

        const nRays = this.numRays;

        for (let i = 0; i < nRays; i++) {
            let angle = (nRays === 1)
                ? heading
                : heading - FOV / 2 + (i * FOV) / (nRays - 1);

            let ray = this.rays[i];
            if (!ray) {
                ray = new Ray(this.pos, angle);
                this.rays[i] = ray;
            }

            ray.setDir(angle);
            ray.setPos(this.pos.x, this.pos.y);

            let closest = null;
            let record = SIGHT_DIST;

            if (walls && walls.length > 0) {
                for (let wall of walls) {
                    const pt = ray.cast(wall);
                    if (pt) {
                        let d = (typeof p5 !== 'undefined' && p5.Vector)
                            ? p5.Vector.dist(this.pos, pt)
                            : Math.hypot(this.pos.x - pt.x, this.pos.y - pt.y);
                        if (d < record) {
                            record = d;
                            closest = pt;
                        }
                    }
                }
            }

            // Normalisation de l'entrée : 1 quand tout proche du mur, 0 quand libre à portée max
            inputs[i] = (typeof map === 'function')
                ? map(record, 0, SIGHT_DIST, 1, 0)
                : Math.max(0, Math.min(1, 1 - record / SIGHT_DIST));

            ray.end = closest;
            ray.hitFraction = record / SIGHT_DIST; // 0 = contact, 1 = dégagé
        }

        // Le nombre d'entrées du réseau correspond exactement au nombre de rayons
        return inputs;
    }

    think(walls) {
        if (this.dead) return;

        let inputs = this.look(walls);
        let outputs = this.brain.predict(inputs);

        let turnRatio = outputs[0] || 0.5;
        let thrustRatio = outputs[1] || 0.5;

        // Force de braquage et puissance d'accélération
        let turnForce = (typeof map === 'function')
            ? map(turnRatio, 0, 1, -this.maxForce, this.maxForce)
            : (-this.maxForce + turnRatio * (2 * this.maxForce));

        let thrust = (typeof map === 'function')
            ? map(thrustRatio, 0, 1, 0, this.maxSpeed)
            : (thrustRatio * this.maxSpeed);

        // Boost d'aide au premier quart de seconde
        if (this.frameCount < 25) {
            thrust = Math.max(thrust, this.maxSpeed * 0.6);
        }

        if (typeof p5 !== 'undefined' && p5.Vector && typeof this.vel.heading === 'function') {
            let currentHeading = this.vel.heading();
            let desiredHeading = currentHeading + turnForce;
            let desiredVel = p5.Vector.fromAngle(desiredHeading).setMag(thrust);

            let steer = p5.Vector.sub(desiredVel, this.vel);
            steer.limit(this.maxForce);
            this.applyForce(steer);
        } else {
            let currentHeading = Math.atan2(this.vel.y, this.vel.x);
            let desiredHeading = currentHeading + turnForce;
            let dvx = Math.cos(desiredHeading) * thrust;
            let dvy = Math.sin(desiredHeading) * thrust;
            let sx = dvx - this.vel.x;
            let sy = dvy - this.vel.y;
            let smag = Math.hypot(sx, sy);
            if (smag > this.maxForce) {
                sx = (sx / smag) * this.maxForce;
                sy = (sy / smag) * this.maxForce;
            }
            this.applyForce({ x: sx, y: sy });
        }
    }

    show(isBest, isDebug = DEBUG_MODE) {
        if (typeof push !== 'function') return;
        if (this.dead && !isBest && !isDebug) return;

        // 1. Dessin des rayons lasers avec dégradés luminescents & étiquettes de métrique
        if (!this.dead || isBest) {
            let showLabels = (typeof SHOW_RAY_LABELS !== 'undefined' && SHOW_RAY_LABELS) || isDebug;
            for (let rIdx = 0; rIdx < this.rays.length; rIdx++) {
                let r = this.rays[rIdx];
                if (r && r.end) {
                    let hit = r.hitFraction; // 0 = proche / collision, 1 = dégagé
                    if (isBest) {
                        let strokeCol;
                        if (hit < 0.3) {
                            strokeCol = color(255, 50, 70); // Rouge critique
                        } else if (hit < 0.65) {
                            strokeCol = color(245, 158, 11); // Ambre avertissement
                        } else {
                            strokeCol = color(16, 185, 129); // Vert / Cyan voie dégagée
                        }

                        // Lueur diffuse externe du faisceau laser
                        stroke(red(strokeCol), green(strokeCol), blue(strokeCol), 45);
                        strokeWeight(4.5);
                        line(this.pos.x, this.pos.y, r.end.x, r.end.y);

                        // Cœur concentré du laser
                        stroke(red(strokeCol), green(strokeCol), blue(strokeCol), 230);
                        strokeWeight(1.4);
                        line(this.pos.x, this.pos.y, r.end.x, r.end.y);

                        // Réticule d'impact pulsant au contact de l'obstacle
                        noStroke();
                        fill(strokeCol);
                        circle(r.end.x, r.end.y, hit < 0.3 ? 5.5 : 3.8);

                        // Étiquette numérique flottante (ex: "R01: 0.82")
                        if (showLabels) {
                            let midX = (this.pos.x + r.end.x * 2) / 3;
                            let midY = (this.pos.y + r.end.y * 2) / 3;
                            let tagText = `R${rIdx + 1} ${(hit).toFixed(2)}`;

                            push();
                            rectMode(CENTER);
                            noStroke();
                            fill(10, 15, 25, 210);
                            rect(midX, midY, 44, 13, 3);

                            stroke(strokeCol);
                            strokeWeight(0.8);
                            noFill();
                            rect(midX, midY, 44, 13, 3);

                            noStroke();
                            fill(248, 250, 252);
                            textSize(7.5);
                            textAlign(CENTER, CENTER);
                            text(tagText, midX, midY + 0.5);
                            pop();
                        }
                    } else {
                        stroke(255, 255, 255, isDebug ? 55 : 20);
                        strokeWeight(0.5);
                        line(this.pos.x, this.pos.y, r.end.x, r.end.y);
                    }
                }
            }
        }

        // 2. Traînée de dérapage sur l'asphalte
        if (this.skidHistory.length > 1) {
            noFill();
            stroke(isBest ? color(0, 255, 200, 40) : color(255, 255, 255, 15));
            strokeWeight(isBest ? 3 : 1.5);
            beginShape();
            for (let pt of this.skidHistory) {
                vertex(pt.x, pt.y);
            }
            endShape();
        }

        // 3. Dessin de la carrosserie de course (Châssis Supercar Aérodynamique)
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
        rectMode(CENTER);

        // Lueur néon sous le châssis (Underglow)
        if (isBest) {
            noStroke();
            fill(0, 255, 180, 60);
            ellipse(0, 0, this.height * 1.5, this.width * 1.8);
        }

        // Châssis principal
        let bodyColor = isBest ? color(16, 185, 129) : (this.dead ? color(220, 38, 38, 90) : color(56, 189, 248, 120));
        let accentColor = isBest ? color(245, 158, 11) : color(255, 255, 255, 180);

        // Roues sportives noires
        fill(20);
        stroke(bodyColor);
        strokeWeight(1);
        rect(-this.height * 0.32, -this.width * 0.55, 5, 2.5, 1);
        rect(-this.height * 0.32, this.width * 0.55, 5, 2.5, 1);
        rect(this.height * 0.32, -this.width * 0.55, 5, 2.5, 1);
        rect(this.height * 0.32, this.width * 0.55, 5, 2.5, 1);

        // Corps profilé
        fill(bodyColor);
        stroke(isBest ? color(255, 255, 255, 240) : color(255, 255, 255, 70));
        strokeWeight(isBest ? 1.5 : 1);
        rect(0, 0, this.height, this.width, 3);

        // Cockpit teinté
        fill(15, 23, 42, 220);
        stroke(accentColor);
        strokeWeight(1);
        rect(-this.height * 0.05, 0, this.height * 0.45, this.width * 0.65, 2);

        // Aileron arrière (Spoiler)
        fill(25);
        stroke(bodyColor);
        rect(-this.height * 0.48, 0, 3, this.width * 1.15, 1);

        // Phares avant LED & faisceau conique de projection
        noStroke();
        fill(255, 255, 255, 240);
        circle(this.height * 0.45, -this.width * 0.32, 2.5);
        circle(this.height * 0.45, this.width * 0.32, 2.5);

        if (isBest) {
            // Faisceau conique lumineux projeté sur la piste
            fill(255, 255, 255, 20);
            triangle(
                this.height * 0.45, -this.width * 0.38,
                this.height * 0.45, this.width * 0.38,
                this.height * 0.45 + 55, 0
            );
        }

        // Feux stop arrière (rouges vifs en freinage)
        fill(this.isBraking ? color(255, 0, 0, 255) : color(180, 0, 0, 150));
        circle(-this.height * 0.48, -this.width * 0.3, this.isBraking ? 3 : 2);
        circle(-this.height * 0.48, this.width * 0.3, this.isBraking ? 3 : 2);

        // Flamme d'échappement en forte accélération
        let curMag = this.vel.mag();
        if (curMag > this.maxSpeed * 0.75 && !this.dead) {
            fill(isBest ? color(56, 189, 248, 220) : color(249, 115, 22, 200));
            triangle(-this.height * 0.5, -2, -this.height * 0.5, 2, -this.height * 0.5 - random(4, 9), 0);
        }

        pop();

        // 4. Debug information (vecteurs de force, rayon de détection)
        if (isDebug) {
            push();
            noFill();
            stroke(255, 200, 0, 120);
            circle(this.pos.x, this.pos.y, this.r * 2);
            stroke(0, 180, 255, 200);
            line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 5, this.pos.y + this.vel.y * 5);
            pop();
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Car };
}
