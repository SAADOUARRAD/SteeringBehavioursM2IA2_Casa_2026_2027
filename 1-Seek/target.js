// Entité Target autonome étendant Vehicle (cible mobile et circulaire)
class Target extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.r = 25; // rayon du cercle de la cible
    this.color = 'red';
    this.maxSpeed = 3;
    if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.random2D === 'function') {
      this.vel = p5.Vector.random2D().mult(this.maxSpeed);
    } else if (typeof createVector === 'function') {
      this.vel = createVector(1, 0).mult(this.maxSpeed);
    }
  }

  update() {
    // Petite variation continue de direction
    if (typeof random === 'function') {
      this.vel.rotate(random(-0.1, 0.1));
    }
    super.update();
    this.edges();
  }

  respawnRandom(w = width, h = height) {
    const rx = typeof random === 'function' ? random(this.r, Math.max(this.r, w - this.r)) : w / 2;
    const ry = typeof random === 'function' ? random(this.r, Math.max(this.r, h - this.r)) : h / 2;
    this.pos.set(rx, ry);
  }

  show() {
    push();
    fill(this.color);
    stroke('white');
    strokeWeight(2);
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }
}