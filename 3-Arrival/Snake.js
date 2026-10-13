/**
 * Snake.js
 * Tête du serpent — sous-classe de Vehicle.
 * Tête triangulaire avec yeux, pupilles et langue fourchue animée.
 * Gère les segments, la nourriture et les particules.
 */
class Snake extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} hueVal   Teinte HSB (0-360)
   */
  constructor(x, y, hueVal) {
    super(x, y);
    this.hueVal   = hueVal;
    this.r        = 14;
    this.maxSpeed = 4;
    this.maxForce = 0.4;
    this.segments  = [];
    this.score     = 0;
    this.glowTimer = 0;
    this.tongueOut = 0;      // compteur pour animation de la langue
    this.tongueSide = 1;     // direction oscillation langue

    this.initialLength = 8;
    for (let i = 0; i < this.initialLength; i++) {
      this._addSegment();
    }
  }

  /** Crée un segment à l'arrière de la queue */
  _addSegment() {
    let tail = this.segments[this.segments.length - 1];
    let sx = tail ? tail.pos.x : this.pos.x;
    let sy = tail ? tail.pos.y : this.pos.y;
    let seg = new SnakeSegment(sx, sy, this.segments.length, this.initialLength + 20, this.hueVal);
    this.segments.push(seg);
  }

  steerToward(target) {
    let pos = (target instanceof p5.Vector) ? target : target.pos;
    let force = this.arrive(pos, 0);
    this.applyForce(force);
  }

  update() {
    super.update();
    // Wrap autour de l'écran
    if (this.pos.x > width  + this.r) this.pos.x = -this.r;
    if (this.pos.x < -this.r)          this.pos.x = width + this.r;
    if (this.pos.y > height + this.r) this.pos.y = -this.r;
    if (this.pos.y < -this.r)          this.pos.y = height + this.r;

    // Chaîne de segments
    if (this.segments.length > 0) {
      this.segments[0].follow(this);
      this.segments[0].update();
      for (let i = 1; i < this.segments.length; i++) {
        this.segments[i].follow(this.segments[i - 1]);
        this.segments[i].update();
      }
    }

    if (this.glowTimer > 0) this.glowTimer--;
    this.tongueOut++;
  }

  tryEat(foods, particles) {
    for (let i = 0; i < foods.length; i++) {
      let f = foods[i];
      if (f.eaten) continue;
      let d = p5.Vector.dist(this.pos, f.pos);
      if (d < this.r + f.r) {
        f.eaten = true;
        this.score++;
        this.glowTimer = 25;
        for (let p = 0; p < 18; p++) {
          particles.push(new ParticleEffect(f.pos.x, f.pos.y, f.hue));
        }
        this._addSegment();
        return i;
      }
    }
    return -1;
  }

  showAll() {
    // Du bout de la queue à la tête (ordre de dessin)
    for (let i = this.segments.length - 1; i >= 0; i--) {
      this.segments[i].show();
    }
    this.show();
  }

  show() {
    let angle = this.vel.mag() > 0.2 ? this.vel.heading() : 0;

    push();
    colorMode(HSB, 360, 100, 100, 100);
    translate(this.pos.x, this.pos.y);
    rotate(angle);

    let h = this.hueVal;
    let bright = this.glowTimer > 0 ? 100 : 72;

    // ── Langue fourchue animée ──────────────────────────────────────────
    // Apparaît et disparaît toutes les ~40 frames
    let tonguePhase = (this.tongueOut % 50);
    if (tonguePhase < 18) {
      let ext  = map(tonguePhase, 0, 18, 0, 1); // extension 0→1
      let tLen = 20 * ext;
      let fork = 7  * ext;
      stroke(0, 90, 90, 230);
      strokeWeight(1.5);
      // Tige centrale de la langue
      line(this.r * 0.8, 0, this.r * 0.8 + tLen, 0);
      // Fourche supérieure
      line(this.r * 0.8 + tLen, 0, this.r * 0.8 + tLen + fork, -fork * 0.6);
      // Fourche inférieure
      line(this.r * 0.8 + tLen, 0, this.r * 0.8 + tLen + fork,  fork * 0.6);
    }

    // ── Ombre ───────────────────────────────────────────────────────────
    noStroke();
    fill(h, 80, 10, 40);
    ellipse(3, 3, this.r * 3.2, this.r * 2.2);

    // ── Corps de la tête (ellipse légèrement aplatie) ───────────────────
    // Halo si vient de manger
    if (this.glowTimer > 0) {
      fill(h, 40, 100, 60);
      ellipse(0, 0, this.r * 4.5, this.r * 3.5);
    }

    // Corps principal de la tête
    fill(h, 82, bright, 240);
    ellipse(0, 0, this.r * 3, this.r * 2.2);

    // Ventre de la tête
    fill((h + 30) % 360, 25, 95, 80);
    ellipse(0, 0, this.r * 1.5, this.r * 1.2);

    // Museau légèrement pointu
    fill(h, 85, bright - 8, 240);
    triangle(
      this.r * 1.2,  0,
      this.r * 0.4, -this.r * 0.65,
      this.r * 0.4,  this.r * 0.65
    );

    // Contour de la tête
    stroke(h, 85, bright * 0.5, 150);
    strokeWeight(0.8);
    noFill();
    ellipse(0, 0, this.r * 3, this.r * 2.2);

    // ── Yeux ────────────────────────────────────────────────────────────
    let ey = this.r * 0.5;  // décalage vertical des yeux
    let ex = this.r * 0.4;  // décalage horizontal

    // Blanc de l'œil
    noStroke();
    fill(0, 0, 100, 230);
    circle(ex,  ey, 7);
    circle(ex, -ey, 7);

    // Pupille elliptique (comme un vrai serpent !)
    fill(0, 0, 0, 250);
    ellipse(ex + 0.5,  ey, 3, 6);
    ellipse(ex + 0.5, -ey, 3, 6);

    // Reflet dans l'œil
    fill(0, 0, 100, 180);
    circle(ex + 1,  ey - 1, 2);
    circle(ex + 1, -ey - 1, 2);

    // ── Narines ─────────────────────────────────────────────────────────
    fill(h, 85, bright * 0.4, 200);
    circle(this.r * 1.1,  this.r * 0.22, 2.5);
    circle(this.r * 1.1, -this.r * 0.22, 2.5);

    colorMode(RGB, 255);
    pop();

    // ── Debug ────────────────────────────────────────────────────────────
    if (Vehicle.debug) {
      push();
      stroke(255, 200, 0, 180);
      strokeWeight(1.5);
      let vv = this.vel.copy().mult(6);
      line(this.pos.x, this.pos.y, this.pos.x + vv.x, this.pos.y + vv.y);
      // Vecteur acceleration
      stroke(255, 80, 80, 180);
      let av = this.acc.copy().mult(60);
      line(this.pos.x, this.pos.y, this.pos.x + av.x, this.pos.y + av.y);
      pop();
    }
  }
}
