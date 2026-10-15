/**
 * SnakeSegment.js
 * Sous-classe de Vehicle représentant chaque anneau (ou la tête) du serpent.
 * Hérite de la locomotion, de la séparation et du suivi de Vehicle,
 * et implémente le comportement arrive() pour le suivi fluide d'anneau en anneau.
 */
class SnakeSegment extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} ms       Vitesse max
   * @param {number} mf       Force max
   * @param {number} radius   Rayon visuel / physique
   * @param {string|p5.Color} couleur
   * @param {number} index    Position dans le corps (0 = tête)
   */
  constructor(x, y, ms = 4, mf = 0.4, radius = 14, couleur = '#2ecc71', index = 0) {
    super(x, y, ms, mf);
    this.r = radius;
    this.couleur = couleur;
    this.index = index;
    this.dir = 0; // Orientation lissée en radians
  }

  /**
   * Comportement d'arrivée douce vers une cible avec zone de décélération.
   * @param {p5.Vector} target       Position de la cible
   * @param {number} targetDistance Distance d'arrêt souhaitée (ex: espacement entre anneaux)
   * @param {number} slowingRadius  Rayon de la zone de ralentissement
   * @returns {p5.Vector} Force de direction
   */
  arrive(target, targetDistance = 0, slowingRadius = 80) {
    let desired = p5.Vector.sub(target, this.pos);
    let d = desired.mag();

    let speed = this.maxSpeed;
    if (d < slowingRadius) {
      // Décélération progressive entre targetDistance et slowingRadius
      speed = map(d, targetDistance, slowingRadius, 0, this.maxSpeed);
      speed = constrain(speed, 0, this.maxSpeed);
    }

    desired.setMag(speed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  /**
   * Mise à jour de la position et de l'orientation
   */
  update() {
    super.update();
    if (this.vel.mag() > 0.1) {
      this.dir = this.vel.heading();
    }
  }

  /**
   * Rendu visuel d'un anneau du corps
   * @param {number} totalLength   Nombre total d'anneaux pour le dégradé
   * @param {boolean} isDebug      Mode debug actif
   */
  renderSegment(totalLength = 10, isDebug = false) {
    let t = map(this.index, 0, totalLength, 1.0, 0.4);
    let w = this.r * 1.8 * t;
    let h = this.r * 1.5 * t;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.dir);

    // Ombre douce
    noStroke();
    fill(0, 0, 0, 35);
    ellipse(2, 2, w, h);

    // Corps de l'anneau avec dégradé subtil
    fill(this.couleur);
    stroke(20, 60, 20, 150);
    strokeWeight(1);
    ellipse(0, 0, w, h);

    // Motif d'écailles sur le dos
    noFill();
    stroke(255, 255, 255, 60);
    strokeWeight(1);
    arc(0, 0, w * 0.6, h * 0.6, PI * 0.8, TWO_PI * 1.1);

    pop();

    if (isDebug) {
      this.renderDebug();
    }
  }

  /**
   * Rendu visuel de la tête de serpent (yeux, langue, museau)
   * @param {boolean} isDebug
   * @param {number} frameNumber
   */
  renderHead(isDebug = false, frameNumber = 0) {
    let w = this.r * 2.2;
    let h = this.r * 1.7;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.dir);

    // Langue fourchue animée
    let tonguePhase = frameNumber % 40;
    if (tonguePhase < 14) {
      let tLen = map(tonguePhase, 0, 14, 2, this.r * 1.4);
      stroke(231, 76, 60);
      strokeWeight(1.8);
      let tipX = w * 0.45;
      line(tipX, 0, tipX + tLen, 0);
      line(tipX + tLen, 0, tipX + tLen + 4, -3);
      line(tipX + tLen, 0, tipX + tLen + 4, 3);
    }

    // Ombre
    noStroke();
    fill(0, 0, 0, 40);
    ellipse(2, 2, w, h);

    // Tête principale
    fill(this.couleur);
    stroke(15, 45, 15, 180);
    strokeWeight(1.2);
    ellipse(0, 0, w, h);

    // Museau pointu
    noStroke();
    fill(this.couleur);
    triangle(w * 0.4, -h * 0.25, w * 0.4, h * 0.25, w * 0.65, 0);

    // Yeux avec pupille fendue
    let eyeOffsetX = w * 0.15;
    let eyeOffsetY = h * 0.28;

    fill(255);
    stroke(40, 80, 40);
    strokeWeight(0.5);
    circle(eyeOffsetX, -eyeOffsetY, 5);
    circle(eyeOffsetX, eyeOffsetY, 5);

    // Pupilles verticales reptiliennes
    fill(20);
    noStroke();
    ellipse(eyeOffsetX + 0.5, -eyeOffsetY, 1.8, 4);
    ellipse(eyeOffsetX + 0.5, eyeOffsetY, 1.8, 4);

    pop();

    if (isDebug) {
      this.renderDebug();
    }
  }

  /**
   * Affichage des rayons de séparation et vecteurs d'état
   */
  renderDebug() {
    push();
    noFill();
    // Cercle de détection / séparation (desiredseparation = r * 2 dans Vehicle.separate)
    stroke(255, 200, 0, 100);
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, this.r * 4);

    // Vecteur de vitesse
    stroke(0, 180, 255, 180);
    strokeWeight(1.5);
    line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 6, this.pos.y + this.vel.y * 6);
    pop();
  }
}
