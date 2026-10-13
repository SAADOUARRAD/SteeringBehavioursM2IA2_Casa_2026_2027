/**
 * HandTarget.js
 * Cible de main (MediaPipe) — sous-classe de Vehicle.
 * Sa position est mise à jour par le callback MediaPipe (landmark 8 = index fingertip).
 * Elle n'applique aucune force de steering ; seule la position est mise à jour.
 */
class HandTarget extends Vehicle {
  constructor() {
    super(-100, -100); // Hors écran jusqu'au premier signal
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.r = 14;
    this.active = false; // true si une main est détectée
    this.pulseOffset = 0;
  }

  /** Appelée par le callback MediaPipe avec les coordonnées normalisées [0,1] */
  updateFromLandmark(nx, ny) {
    // Miroir horizontal (webcam miroir naturel)
    this.pos.x = (1 - nx) * width;
    this.pos.y = ny * height;
    this.active = true;
  }

  /** Appelée quand aucune main n'est détectée */
  setInactive() {
    this.active = false;
  }

  /** La main ne se dirige pas d'elle-même */
  update() {
    // Pas de locomotion — position pilotée par MediaPipe
  }

  show() {
    if (!this.active) return;
    let pulse = 0.5 + 0.5 * sin(frameCount * 0.12 + this.pulseOffset);
    let radius = this.r + pulse * 6;
    push();
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();
    // Anneau externe animé
    for (let i = 4; i >= 0; i--) {
      let alpha = map(i, 0, 4, 50, 8);
      fill(200, 90, 100, alpha);
      circle(this.pos.x, this.pos.y, (radius + i * 8) * 2);
    }
    // Centre
    fill(200, 80, 100, 220);
    circle(this.pos.x, this.pos.y, radius * 2);
    // Croix de visée
    stroke(200, 40, 100, 180);
    strokeWeight(1.5);
    let cs = radius * 1.6;
    line(this.pos.x - cs, this.pos.y, this.pos.x + cs, this.pos.y);
    line(this.pos.x, this.pos.y - cs, this.pos.x, this.pos.y + cs);
    colorMode(RGB, 255);
    pop();
  }
}
