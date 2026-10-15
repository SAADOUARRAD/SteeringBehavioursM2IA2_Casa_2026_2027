/**
 * Moto.js
 * Moto de course haute performance — sous-classe de Vehicle.
 *
 * Steering Behaviors :
 *  - follow(path) : suivi précis de la trajectoire idéale du circuit
 *  - separate(vehicles) : évitement des autres motos et véhicules avec distance de sécurité
 *  - arrive(target) : pour le drafting / aspiration en peloton
 *
 * Améliorations visuelles et mécaniques :
 *  - Inclinaison dynamique (lean angle) dans les virages
 *  - Pilote avec casque aérodynamique et combinaison aux couleurs d'écurie
 *  - Faisceau de phare avant illuminant la piste
 *  - Feu arrière stop réagissant au freinage
 *  - Particules d'échappement et flammes de Nitro Boost
 *  - Traces de gomme (skid marks) lors des fortes accélérations latérales
 */
class Moto extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} ms       Vitesse max (km/h simulés)
   * @param {number} mf       Force max d'accélération/braquage
   * @param {string} bikeColor Couleur du carénage
   * @param {number} number   Numéro de dossard (#46, #93, #20...)
   */
  constructor(x, y, ms = 4.2, mf = 0.45, bikeColor = null, number = null) {
    super(x, y, ms, mf);

    this.r = 15; // Rayon de collision et d'échelle
    this.originalMaxSpeed = ms;
    this.originalMaxForce = mf;

    // Écuries de course légendaires
    const teamColors = [
      { bike: '#e74c3c', pilot: '#c0392b', num: 93 }, // Team Ducati / Repsol Red
      { bike: '#3498db', pilot: '#2980b9', num: 42 }, // Team Suzuki Blue
      { bike: '#2ecc71', pilot: '#27ae60', num: 33 }, // Team Kawasaki Green
      { bike: '#f39c12', pilot: '#d35400', num: 88 }, // Team KTM Orange
      { bike: '#9b59b6', pilot: '#8e44ad', num: 21 }, // Team Yamaha Violet
      { bike: '#f1c40f', pilot: '#f39c12', num: 46 }, // Team Rossi Yellow
      { bike: '#1abc9c', pilot: '#16a085', num: 5 }   // Team Petronas Cyan
    ];

    let team = teamColors[Math.floor(random(teamColors.length))];
    this.bikeColor = bikeColor || team.bike;
    this.pilotColor = team.pilot;
    this.number = number !== null ? number : team.num;

    // Poids des comportements
    this.followPathWeight = 2.0;
    this.separateWeight = 2.5;
    this.obstacleWeight = 3.2;
    this.obstacleDetectionDistance = 170;
    this.drivingStyle = 'normal';
    this.followPrecision = 1;
    this.isAvoidingObstacle = false;
    this.isAvoidingVehicle = false;
    this.detectedObstacle = null;

    // Angle d'inclinaison dynamique dans les courbes (-1 = plein gauche, +1 = plein droite)
    this.lean = 0;
    this.targetLean = 0;
    this.prevHeading = this.vel.heading();

    // Système de Nitro / Turbo Boost
    this.isNitro = false;
    this.nitroTimer = 0;

    // Détection de freinage pour allumage du feu stop
    this.isBraking = false;
    this.prevSpeed = this.vel.mag();

    // Traces de pneu sur l'asphalte
    this.tireSkidMarks = [];
  }

  /**
   * Arrivée progressive (utile pour le drafting ou la suite d'un peloton)
   */
  arrive(target, targetDistance = 0, slowingRadius = 80) {
    let desired = p5.Vector.sub(target, this.pos);
    let d = desired.mag();

    let speed = this.maxSpeed;
    if (d < slowingRadius) {
      speed = map(d, targetDistance, slowingRadius, 0, this.maxSpeed);
      speed = constrain(speed, 0, this.maxSpeed);
    }

    desired.setMag(speed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  /**
   * Déclenche un coup de nitro / turbo boost temporaire
   * @param {number} durationFrames Nombre de frames du boost
   */
  triggerNitro(durationFrames = 80) {
    this.isNitro = true;
    this.nitroTimer = durationFrames;
    this.maxSpeed = this.originalMaxSpeed * 1.6;
    this.maxForce = this.originalMaxForce * 2.0;
  }

  /**
   * Applique le pilotage de course : suivi de trajectoire + séparation de peloton
   * @param {Vehicle[]} vehicles Liste des autres bolides en piste
   * @param {Path} path          Circuit
   * @param {ExhaustParticle[]} particles Tableau pour recevoir les particules d'échappement
   */
  applyBehaviors(vehicles, path = null, particles = null, obstacles = [], goalForce = null) {
    // 1. Force de suivi de trajectoire idéale (si chemin fourni)
    let fFollow = goalForce ? goalForce.copy() : (path ? this.follow(path) : createVector(0, 0));

    // 2. Force de séparation pour éviter les collisions avec les concurrents
    let sSeparate = vehicles && vehicles.length > 0 ? this.separate(vehicles) : createVector(0, 0);
    const avoidance = obstacleAvoidance(this, obstacles, this.obstacleDetectionDistance);
    const collisionAvoidance = vehicleCollisionAvoidance(this, vehicles, 18);
    this.isAvoidingObstacle = !!avoidance.obstacle;
    this.isAvoidingVehicle = !!collisionAvoidance.vehicle;
    this.detectedObstacle = avoidance.obstacle;

    // Priorité sécurité : l'évitement garde sa pleine influence et le suivi
    // est momentanément assoupli lorsqu'un obstacle entre dans le corridor.
    const safetyPriority = this.isAvoidingObstacle || this.isAvoidingVehicle;
    fFollow.mult(this.followPathWeight * (safetyPriority ? 0.3 : this.followPrecision));
    sSeparate.mult(this.separateWeight);
    const combined = fFollow.add(sSeparate)
      .add(avoidance.force.mult(this.obstacleWeight))
      .add(collisionAvoidance.force.mult(this.obstacleWeight));
    combined.limit(this.maxForce);
    this.applyForce(combined);

    // 3. Gestion de l'inclinaison (lean) selon la vitesse de rotation
    let currentHeading = this.vel.heading();
    let deltaHeading = currentHeading - this.prevHeading;
    // Normaliser l'angle entre -PI et PI
    while (deltaHeading < -PI) deltaHeading += TWO_PI;
    while (deltaHeading > PI) deltaHeading -= TWO_PI;

    // L'angle d'inclinaison est proportionnel au taux de virage et à la vitesse
    this.targetLean = constrain(deltaHeading * 8, -0.65, 0.65);
    this.lean = lerp(this.lean, this.targetLean, 0.15);
    this.prevHeading = currentHeading;

    // 4. Détection du freinage
    let currentSpeed = this.vel.mag();
    this.isBraking = currentSpeed < this.prevSpeed - 0.05;
    this.prevSpeed = currentSpeed;

    // 5. Gestion du boost nitro
    if (this.isNitro) {
      this.nitroTimer--;
      if (this.nitroTimer <= 0) {
        this.isNitro = false;
        this.maxSpeed = this.originalMaxSpeed;
        this.maxForce = this.originalMaxForce;
      }
    }

    // 6. Émission de particules d'échappement / nitro
    if (particles && (this.vel.mag() > 1.2 || this.isNitro)) {
      if (this.isNitro || (typeof frameCount !== 'undefined' && frameCount % 3 === 0)) {
        let backDir = p5.Vector.fromAngle(this.vel.heading() + PI);
        let exhaustPos = p5.Vector.add(this.pos, p5.Vector.mult(backDir, this.r * 1.1));
        particles.push(new ExhaustParticle(exhaustPos.x, exhaustPos.y, backDir, this.isNitro));
      }
    }

    // 7. Enregistrement des traces de pneu
    if (Math.abs(this.lean) > 0.35 && this.vel.mag() > 2.5) {
      this.tireSkidMarks.push({
        x: this.pos.x,
        y: this.pos.y,
        alpha: 90
      });
      if (this.tireSkidMarks.length > 30) this.tireSkidMarks.shift();
    }
  }

  update() {
    super.update();
    // Rebouclage aux bords du circuit si nécessaire
    this.edges();

    // Estompe les traces de pneu au fil du temps
    for (let mark of this.tireSkidMarks) {
      mark.alpha -= 0.8;
    }
    this.tireSkidMarks = this.tireSkidMarks.filter((m) => m.alpha > 0);
  }

  /**
   * Rendu visuel d'une moto de Grand Prix détaillée
   * @param {boolean} isDebug Mode debug actif
   */
  render(isDebug = false) {
    let heading = this.vel.heading();

    // 1. Traces de gomme au sol
    this.drawSkidMarks();

    push();
    translate(this.pos.x, this.pos.y);
    rotate(heading);

    // 2. Faisceau du phare avant sur l'asphalte
    this.drawHeadlightBeam();

    // 3. Ombre portée (qui s'allonge et se décale avec l'angle d'inclinaison)
    let shadowOffsetX = 3 + this.lean * 4;
    let shadowOffsetY = 3;
    noStroke();
    fill(0, 0, 0, 50);
    ellipse(shadowOffsetX, shadowOffsetY, this.r * 2.8, this.r * 1.1);

    // 4. Inclinaison latérale de la moto dans le virage
    rotate(this.lean * 0.4);

    // ── Roue arrière (pneu slick large) ───────────────────────
    fill(25);
    stroke(10);
    strokeWeight(1);
    rectMode(CENTER);
    rect(-this.r * 0.9, 0, this.r * 0.8, this.r * 0.45, 2);
    // Jante alliage colorée
    fill(220, 160, 20);
    circle(-this.r * 0.9, 0, this.r * 0.25);

    // ── Roue avant (directrice) ───────────────────────────────
    fill(25);
    stroke(10);
    rect(this.r * 1.0, 0, this.r * 0.75, this.r * 0.35, 2);
    fill(220, 160, 20);
    circle(this.r * 1.0, 0, this.r * 0.22);

    // ── Pot d'échappement (métal chaud / titane) ───────────────
    fill(140, 145, 155);
    stroke(80);
    strokeWeight(0.8);
    rect(-this.r * 0.5, this.r * 0.32, this.r * 0.7, 3.5, 1);
    if (this.isNitro) {
      fill(80, 200, 255);
      circle(-this.r * 0.9, this.r * 0.32, 5);
    }

    // ── Carénage aérodynamique (profil sportif) ────────────────
    fill(this.bikeColor);
    stroke(30, 30, 40);
    strokeWeight(1.2);
    // Coque arrière effilée
    triangle(
      -this.r * 0.8, 0,
      -this.r * 0.2, -this.r * 0.38,
      -this.r * 0.2, this.r * 0.38
    );
    // Réservoir et flanc avant profilé
    beginShape();
    vertex(-this.r * 0.2, -this.r * 0.4);
    vertex(this.r * 0.6, -this.r * 0.32);
    vertex(this.r * 0.9, 0); // Bulle avant profilée
    vertex(this.r * 0.6, this.r * 0.32);
    vertex(-this.r * 0.2, this.r * 0.4);
    endShape(CLOSE);

    // Pare-brise / Bulle fumée avant
    fill(30, 45, 60, 200);
    noStroke();
    triangle(
      this.r * 0.3, -this.r * 0.2,
      this.r * 0.3, this.r * 0.2,
      this.r * 0.85, 0
    );

    // Numéro de course floqué sur le réservoir (#46, #93...)
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(8);
    textStyle(BOLD);
    text(this.number, -this.r * 0.05, 0);

    // ── Pilote de course (casque + combinaison) ───────────────
    let pilotOffsetX = -this.r * 0.15 + this.lean * 2.5; // Le pilote déhanche vers l'intérieur

    // Épaules / combinaison
    fill(this.pilotColor);
    stroke(20);
    strokeWeight(0.8);
    ellipse(pilotOffsetX, 0, this.r * 0.85, this.r * 0.7);

    // Casque aérodynamique
    fill(250);
    stroke(40);
    circle(pilotOffsetX + 1.5, 0, this.r * 0.55);

    // Visière noire brillante teintée avec reflet
    fill(20, 25, 30);
    noStroke();
    arc(pilotOffsetX + 3, 0, this.r * 0.45, this.r * 0.35, -PI * 0.4, PI * 0.4);
    // Reflet blanc sur la visière
    fill(255, 255, 255, 180);
    circle(pilotOffsetX + 4, -1, 1.8);

    // ── Feu arrière LED (rouge vif, amplifié au freinage) ─────
    let brakeAlpha = this.isBraking ? 255 : 170;
    let brakeSize = this.isBraking ? 5 : 3.5;
    fill(255, 30, 30, brakeAlpha);
    noStroke();
    circle(-this.r * 0.85, 0, brakeSize);

    // Phare avant LED
    fill(240, 250, 255, 230);
    circle(this.r * 0.92, 0, 3.5);

    rectMode(CORNER);
    pop();

    // Mode debug
    if (isDebug) {
      noFill();
      stroke(this.isAvoidingObstacle || this.isAvoidingVehicle ? '#ff4d4d' : '#f1c40f', 150);
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, this.obstacleDetectionDistance * 2);
      if (this.detectedObstacle) {
        stroke('#ff4d4d');
        line(this.pos.x, this.pos.y, this.detectedObstacle.pos.x, this.detectedObstacle.pos.y);
      }
      this.renderDebug();
    }
  }

  configure(options = {}) {
    if (Number.isFinite(options.maxSpeed)) {
      this.originalMaxSpeed = constrain(options.maxSpeed, 1, 10);
      if (!this.isNitro) this.maxSpeed = this.originalMaxSpeed;
    }
    if (Number.isFinite(options.maxForce)) {
      this.originalMaxForce = constrain(options.maxForce, 0.1, 1.5);
      if (!this.isNitro) this.maxForce = this.originalMaxForce;
    }
    if (Number.isFinite(options.followPrecision)) this.followPrecision = constrain(options.followPrecision, 0.25, 2);
    if (Number.isFinite(options.detectionDistance)) this.obstacleDetectionDistance = constrain(options.detectionDistance, 40, 400);
    if (['prudent', 'normal', 'aggressive'].includes(options.drivingStyle)) {
      this.drivingStyle = options.drivingStyle;
      const profiles = {
        prudent: { obstacle: 4.5, separate: 3.8 },
        normal: { obstacle: 3.2, separate: 2.8 },
        aggressive: { obstacle: 2.4, separate: 1.8 }
      };
      this.obstacleWeight = profiles[this.drivingStyle].obstacle;
      this.separateWeight = profiles[this.drivingStyle].separate;
    }
  }

  /**
   * Faisceau lumineux projeté sur l'asphalte par le phare avant
   */
  drawHeadlightBeam() {
    noStroke();
    // Dégradé conique simulé par couches transparentes
    for (let i = 4; i >= 1; i--) {
      let alpha = map(i, 1, 4, 18, 4);
      let beamLength = this.r * (2.5 + i * 1.5);
      let beamWidth = this.r * (0.8 + i * 0.6);
      fill(255, 250, 210, alpha);
      triangle(
        this.r * 0.9, 0,
        this.r * 0.9 + beamLength, -beamWidth * 0.5,
        this.r * 0.9 + beamLength, beamWidth * 0.5
      );
    }
  }

  /**
   * Traces de gomme au sol
   */
  drawSkidMarks() {
    if (this.tireSkidMarks.length < 2) return;
    push();
    strokeWeight(3);
    for (let i = 1; i < this.tireSkidMarks.length; i++) {
      let p1 = this.tireSkidMarks[i - 1];
      let p2 = this.tireSkidMarks[i];
      stroke(15, 15, 18, p2.alpha * 0.7);
      line(p1.x, p1.y, p2.x, p2.y);
    }
    pop();
  }

  /**
   * Diagnostic en mode debug
   */
  renderDebug() {
    push();
    noFill();
    // Cercle de détection / séparation
    stroke(255, 200, 0, 110);
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, this.r * 4);

    // Vecteur de vitesse
    stroke(0, 220, 255, 200);
    strokeWeight(1.8);
    line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 6, this.pos.y + this.vel.y * 6);

    // Étiquette dossard et vitesse
    noStroke();
    fill(255);
    textSize(10);
    textAlign(CENTER, BOTTOM);
    text(`#${this.number} | ${(this.vel.mag() * 30).toFixed(0)} km/h`, this.pos.x, this.pos.y - this.r * 1.4);
    pop();
  }
}
