/**
 * SnakeSegment.js
 * Segment du corps d'un serpent — sous-classe de Vehicle.
 * Chaque segment suit son leader via arrive().
 * Affiché comme une ellipse orientée dans la direction du mouvement,
 * avec motif d'écailles et dégradé de couleur.
 */
class SnakeSegment extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} index     Index dans le corps (0 = juste derrière la tête)
   * @param {number} totalLen  Longueur totale (pour calculs de proportion)
   * @param {number} hueVal    Teinte HSB de base
   */
  constructor(x, y, index, totalLen, hueVal) {
    super(x, y);
    this.index = index;
    this.totalLen = totalLen;
    this.hueVal = hueVal;
    this.r = 9;
    this.maxSpeed = 5;
    this.maxForce = 0.5;
    this.segmentGap = 13;
    // Mémorise la direction précédente pour dessiner l'ellipse orientée
    this.dir = 0; // angle en radians
    this.prevPos = createVector(x, y);
  }

  follow(leader) {
    let leaderPos = (leader instanceof p5.Vector) ? leader : leader.pos;
    // Direction de déplacement : de this.pos vers le leader
    let d = p5.Vector.sub(leaderPos, this.pos);
    if (d.mag() > 0.5) this.dir = d.heading();
    let force = this.arrive(leaderPos, this.segmentGap * 0.4);
    this.applyForce(force);
  }

  update() {
    this.prevPos = this.pos.copy();
    super.update();
  }

  show() {
    // Taille décroissante vers la queue
    let t = constrain(map(this.index, 0, this.totalLen, 1.0, 0.3), 0.3, 1.0);
    let w = 18 * t;  // largeur ellipse
    let h = 22 * t;  // hauteur ellipse (légèrement plus longue)

    push();
    colorMode(HSB, 360, 100, 100, 100);

    let scaleHue = (this.hueVal + this.index * 3) % 360;
    let bright   = map(this.index, 0, this.totalLen, 75, 35);
    let sat      = 80;

    translate(this.pos.x, this.pos.y);
    rotate(this.dir);

    noStroke();

    // Ombre douce en dessous
    fill(scaleHue, sat, 10, 40);
    ellipse(2, 2, w * 2, h * 2);

    // Corps principal
    fill(scaleHue, sat, bright, 240);
    ellipse(0, 0, w * 2, h * 2);

    // Ventre (zone claire au centre)
    fill((scaleHue + 30) % 360, 30, 95, 60);
    ellipse(0, 0, w * 0.7, h * 1.5);

    // Écaille : arcs en forme de demi-cercle sur le dos
    stroke((scaleHue + 10) % 360, sat, bright * 0.6, 100);
    strokeWeight(0.8);
    noFill();
    let numScales = 2;
    for (let s = 0; s < numScales; s++) {
      let sy = map(s, 0, numScales, -h * 0.6, h * 0.5);
      arc(0, sy, w * 1.4, w * 0.7, PI, TWO_PI);
    }

    // Contour léger
    stroke(scaleHue, sat, bright * 0.4, 120);
    strokeWeight(0.5);
    ellipse(0, 0, w * 2, h * 2);

    colorMode(RGB, 255);
    pop();
  }
}
