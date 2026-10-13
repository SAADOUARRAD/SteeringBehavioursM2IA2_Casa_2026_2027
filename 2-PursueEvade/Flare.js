// Entité Flare (leurre thermique de contre-mesure)
// Hérite obligatoirement de Vehicle selon les consignes du projet.
class Flare extends Vehicle {
  constructor(x, y, heading = 0, speed = 4) {
    super(x, y);
    this.r = 7;

    // Durée de vie maximale : 1 seconde (soit 1.0s)
    this.maxLifespan = 1.0;
    this.age = 0;

    // Vitesse maximale et force
    this.maxSpeed = 7;
    this.maxForce = 0.6;

    // Éjection vers l'arrière du vaisseau parent avec dispersion angulaire
    const backwardAngle = heading + Math.PI + (typeof random === 'function' ? random(-0.35, 0.35) : 0);
    const ejectionSpeed = speed * 0.45 + (typeof random === 'function' ? random(1.5, 3.5) : 2.5);

    if (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.fromAngle) {
      this.vel = p5.Vector.fromAngle(backwardAngle).mult(ejectionSpeed);
    } else if (typeof createVector === 'function') {
      this.vel = createVector(Math.cos(backwardAngle), Math.sin(backwardAngle)).mult(ejectionSpeed);
    }
  }

  // Vérifie si le leurre doit être détruit (après 1 seconde)
  isDead() {
    return this.age >= this.maxLifespan;
  }

  update(dt = 1 / 60) {
    this.age += dt;

    // Résistance de l'air (force de frottement pour ralentir naturellement le leurre)
    if (this.vel && this.vel.mag() > 0.05) {
      const drag = this.vel.copy().mult(-0.06);
      this.applyForce(drag);
    }

    // Locomotion standard héritée de Vehicle
    super.update();
  }

  show() {
    // Calcul de l'intensité décroissante (s'estompe jusqu'à disparition à 1s)
    const progress = Math.min(1, this.age / this.maxLifespan);
    const alpha = (1 - progress);

    push();
    translate(this.pos.x, this.pos.y);

    // 1. Halo thermique extérieur
    noStroke();
    fill(255, 100, 20, alpha * 90);
    circle(0, 0, this.r * 4 * (1 - progress * 0.3));

    // 2. Coeur incandescent (orange néon / jaune étincelant)
    fill(255, 200, 40, alpha * 220);
    circle(0, 0, this.r * 2 * (1 - progress * 0.5));

    // 3. Noyau blanc brillant
    fill(255, 255, 255, alpha * 255);
    circle(0, 0, this.r * (1 - progress * 0.6));

    pop();
  }
}
