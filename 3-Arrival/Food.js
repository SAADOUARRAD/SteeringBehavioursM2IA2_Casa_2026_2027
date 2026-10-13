/**
 * Food.js
 * Pellet de nourriture — sous-classe de Vehicle.
 * Stationnaire, dessinée comme un insecte/proie lumineux.
 */
class Food extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.vel = createVector(0, 0);
    this.r = 9;
    this.hue = random(360);           // teinte HSB (nombre)
    this.pulseOffset = random(TWO_PI);
    this.eaten = false;
  }

  respawn() {
    this.pos.x = random(40, width - 40);
    this.pos.y = random(40, height - 40);
    this.hue   = random(360);
    this.eaten = false;
  }

  update() { /* stationnaire */ }

  show() {
    if (this.eaten) return;
    let pulse  = 0.5 + 0.5 * sin(frameCount * 0.09 + this.pulseOffset);
    let radius = this.r + pulse * 4;

    push();
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();

    // Halo externe doux
    for (let i = 4; i >= 0; i--) {
      let a = map(i, 0, 4, 55, 5);
      fill(this.hue, 85, 100, a);
      circle(this.pos.x, this.pos.y, (radius + i * 5) * 2);
    }

    // Corps principal
    fill(this.hue, 75, 95, 240);
    circle(this.pos.x, this.pos.y, radius * 2);

    // Reflet
    fill(0, 0, 100, 80);
    circle(this.pos.x - radius * 0.25, this.pos.y - radius * 0.3, radius * 0.45);

    // Petites pattes (proie/insecte)
    stroke(this.hue, 60, 70, 180);
    strokeWeight(1);
    let legLen = radius * 0.9;
    for (let a = -PI * 0.4; a <= PI * 0.4; a += PI * 0.2) {
      let lx = cos(a + PI) * legLen;
      let ly = sin(a + PI) * legLen;
      line(this.pos.x, this.pos.y, this.pos.x + lx, this.pos.y + ly);
      let rx = cos(a) * legLen;
      let ry = sin(a) * legLen;
      line(this.pos.x, this.pos.y, this.pos.x + rx, this.pos.y + ry);
    }

    colorMode(RGB, 255);
    pop();
  }
}
