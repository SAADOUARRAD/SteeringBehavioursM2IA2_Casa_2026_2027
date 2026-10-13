// Entité Target (proie autonome avec contre-mesures de leurres Flare)
// Hérite obligatoirement de Vehicle.
class Target extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.r = 15;
    this.color = '#ff66aa';

    // Vitesses
    this.normalSpeed = 3.5;
    this.fleeSpeed = 6.8;       // Vitesse accrue en cas d'alerte
    this.maxSpeed = this.normalSpeed;
    this.maxForce = 0.35;

    // Détection du poursuiveur
    this.rayonDetection = 180;
    this.isAlerted = false;

    // Gestion du lancement des leurres (Flares)
    this.flareCooldown = 0;
    this.flareInterval = 0.22; // Intervalle en secondes entre deux largages de leurres

    // Vitesse initiale aléatoire
    if (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.random2D) {
      this.vel = p5.Vector.random2D().mult(this.normalSpeed);
    } else if (typeof createVector === 'function') {
      this.vel = createVector(1, 0).mult(this.normalSpeed);
    }
  }

  // Lance un leurre Flare vers l'arrière
  launchFlare() {
    const heading = (this.vel && typeof this.vel.heading === 'function') ? this.vel.heading() : 0;
    const speed = (this.vel && typeof this.vel.mag === 'function') ? this.vel.mag() : this.normalSpeed;

    // Position arrière (décalée du nez du vaisseau)
    const offsetX = Math.cos(heading) * (-this.r);
    const offsetY = Math.sin(heading) * (-this.r);

    return new Flare(this.pos.x + offsetX, this.pos.y + offsetY, heading, speed);
  }

  // Comportement de mise à jour avec détection et évasion
  updateBehavior(pursuer, flares = [], dt = 1 / 60, flaresEnabled = true) {
    if (this.flareCooldown > 0) {
      this.flareCooldown -= dt;
    }

    if (pursuer) {
      const d = (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.dist)
        ? p5.Vector.dist(this.pos, pursuer.pos)
        : Math.hypot(this.pos.x - pursuer.pos.x, this.pos.y - pursuer.pos.y);

      if (d < this.rayonDetection) {
        // En danger : évasion
        this.isAlerted = true;
        this.maxSpeed = this.fleeSpeed;

        // Force d'évasion (evade prédit la position future du poursuiveur)
        const evadeForce = this.evade(pursuer);
        this.applyForce(evadeForce);

        // Lancement de leurres (Flares) derrière la cible
        if (flaresEnabled && this.flareCooldown <= 0) {
          const flare = this.launchFlare();
          flares.push(flare);
          this.flareCooldown = this.flareInterval;
        }
      } else {
        // Hors de portée : vitesse de croisière et navigation autonome fluide
        this.isAlerted = false;
        this.maxSpeed = this.normalSpeed;
        if (typeof random === 'function' && this.vel && typeof this.vel.rotate === 'function') {
          this.vel.rotate(random(-0.08, 0.08));
        }
      }
    }

    // Locomotion standard et rebouclage
    super.update();
    this.edges();
  }

  show(debugMode = false) {
    push();

    // 1. Cercle de détection (en mode debug ou léger halo)
    if (debugMode) {
      push();
      noFill();
      stroke(this.isAlerted ? 'rgba(255, 50, 50, 0.8)' : 'rgba(255, 230, 0, 0.6)');
      strokeWeight(this.isAlerted ? 2 : 1);
      circle(this.pos.x, this.pos.y, this.rayonDetection * 2);
      pop();
    }

    // 2. Dessin du corps de la cible (forme aérodynamique)
    translate(this.pos.x, this.pos.y);
    if (this.vel && typeof this.vel.heading === 'function') {
      rotate(this.vel.heading());
    }

    stroke('white');
    strokeWeight(1.5);
    fill(this.isAlerted ? '#ff3366' : this.color);

    // Forme triangulaire élégante
    beginShape();
    vertex(this.r * 1.2, 0);
    vertex(-this.r * 0.8, -this.r * 0.7);
    vertex(-this.r * 0.4, 0);
    vertex(-this.r * 0.8, this.r * 0.7);
    endShape(CLOSE);

    // Réacteur de la cible
    noStroke();
    fill(this.isAlerted ? '#ffcc00' : '#88eeff');
    circle(-this.r * 0.5, 0, 5);

    pop();
  }
}