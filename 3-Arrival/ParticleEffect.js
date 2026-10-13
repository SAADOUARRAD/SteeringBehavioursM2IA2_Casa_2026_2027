/**
 * ParticleEffect.js
 * Particule d'explosion — sous-classe de Vehicle.
 * hueVal est un nombre HSB (0-360).
 */
class ParticleEffect extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hueVal  Teinte HSB 0-360
   */
  constructor(x, y, hueVal) {
    super(x, y);
    this.hueVal   = hueVal;
    this.lifespan = 255;
    this.r        = random(3, 7);
    this.maxSpeed = random(3, 9);
    this.maxForce = 2;

    // Éjection initiale aléatoire
    let ejection = p5.Vector.fromAngle(random(TWO_PI));
    ejection.mult(random(1.5, 4.5));
    this.applyForce(ejection);
  }

  isDead() { return this.lifespan <= 0; }

  update() {
    this.vel.mult(0.92);   // frottement
    super.update();
    this.lifespan -= 9;
  }

  show() {
    if (this.isDead()) return;
    push();
    colorMode(HSB, 360, 100, 100, 100);
    let alpha = map(this.lifespan, 0, 255, 0, 90);
    noStroke();
    fill(this.hueVal, 80, 100, alpha * 0.35);
    circle(this.pos.x, this.pos.y, this.r * 4);
    fill(this.hueVal, 65, 100, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);
    colorMode(RGB, 255);
    pop();
  }
}
