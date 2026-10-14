/**
 * ExhaustParticle.js
 * Particule de fumée / étincelle d'échappement — sous-classe de Vehicle.
 * Générée à l'arrière des motos lors des accélérations et virages serrés.
 * Respecte strictement la règle : toute entité graphique animée hérite de Vehicle.
 */
class ExhaustParticle extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {p5.Vector} emitVel Vélocité d'éjection (opposée au sens de marche)
   * @param {boolean} isNitro   Effet nitro/flamme bleue
   */
  constructor(x, y, emitVel = null, isNitro = false) {
    super(x, y, 4, 0.2);
    this.r = isNitro ? 5 : 3.5;
    this.isNitro = isNitro;
    this.lifespan = 255;
    this.decay = isNitro ? 14 : 9;

    // Vélocité initiale vers l'arrière avec dispersion aléatoire
    if (emitVel) {
      this.vel = emitVel.copy().mult(random(0.3, 0.7));
      if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.random2D === 'function') {
        this.vel.add(p5.Vector.random2D().mult(0.6));
      }
    } else {
      this.vel = createVector(random(-1, 1), random(-1, 1));
    }
  }

  isDead() {
    return this.lifespan <= 0;
  }

  update() {
    // Frottement aérodynamique
    this.vel.mult(0.92);
    super.update();
    this.lifespan -= this.decay;
    this.r += 0.15; // La fumée s'étend en se dissipant
  }

  render() {
    if (this.isDead()) return;

    push();
    noStroke();
    let alpha = map(this.lifespan, 0, 255, 0, 160);

    if (this.isNitro) {
      // Flamme de post-combustion / nitro bleutée
      fill(80, 200, 255, alpha);
      circle(this.pos.x, this.pos.y, this.r * 2.2);
      fill(255, 255, 255, alpha * 1.2);
      circle(this.pos.x, this.pos.y, this.r * 1.1);
    } else {
      // Fumée d'échappement / gomme de pneu
      fill(180, 190, 205, alpha * 0.75);
      circle(this.pos.x, this.pos.y, this.r * 2);
    }
    pop();
  }
}
