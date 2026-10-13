/**
 * Food.js
 * Nourriture sous forme de Burgers et Pizzas — sous-classe de Vehicle.
 * Stationnaire, chaque aliment est soit un burger gourmand soit une part de pizza pepperoni.
 */
class Food extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.vel = createVector(0, 0);
    this.r = 13; // Rayon de collision adapté à la taille
    this.hue = random(360); // Teinte HSB conservée pour le son et les particules
    this.pulseOffset = random(TWO_PI);
    this.rotation = random(-0.4, 0.4);
    this.type = random() > 0.5 ? 'burger' : 'pizza';
    this.eaten = false;
  }

  respawn() {
    this.pos.x = random(50, width - 50);
    this.pos.y = random(50, height - 50);
    this.hue = random(360);
    this.type = random() > 0.5 ? 'burger' : 'pizza';
    this.rotation = random(-0.5, 0.5);
    this.eaten = false;
  }

  update() {
    /* stationnaire */
  }

  show() {
    if (this.eaten) return;

    let hover = sin(frameCount * 0.08 + this.pulseOffset) * 2.5;

    push();
    translate(this.pos.x, this.pos.y + hover);
    rotate(this.rotation);

    // Halo d'appétence doux et pulsant
    let glowRadius = this.r * 2 + sin(frameCount * 0.08 + this.pulseOffset) * 4;
    noStroke();
    fill(45, 180, 255, 25);
    circle(0, 0, glowRadius * 1.8);
    fill(255, 200, 50, 35);
    circle(0, 0, glowRadius * 1.3);

    if (this.type === 'burger') {
      this.drawBurger();
    } else {
      this.drawPizza();
    }

    pop();
  }

  /**
   * Dessine un hamburger détaillé (pain, steak, fromage fondu, salade, tomate, sésames)
   */
  drawBurger() {
    rectMode(CENTER);

    // 1. Pain inférieur
    noStroke();
    fill(210, 140, 70); // Pain doré
    arc(0, 7, 24, 10, 0, PI);
    rect(0, 6, 24, 3, 2);

    // 2. Steak haché grillé
    fill(100, 50, 30);
    rect(0, 3, 26, 4.5, 2.5);

    // 3. Tranche de fromage fondu (dépassant en pointes)
    fill(255, 195, 0);
    triangle(-9, 1.5, -4, 4.5, 2, 1.5);
    triangle(1, 1.5, 6, 5, 11, 1.5);

    // 4. Salade ondulée
    fill(65, 185, 45);
    arc(-6, -0.5, 7, 4, PI, TWO_PI);
    arc(0, -0.5, 8, 4.5, PI, TWO_PI);
    arc(6, -0.5, 7, 4, PI, TWO_PI);

    // 5. Tranches de tomate rouge
    fill(225, 45, 40);
    rect(-5, -2.5, 10, 2.5, 1);
    rect(5, -2.5, 10, 2.5, 1);

    // 6. Pain supérieur (dôme doré)
    fill(225, 155, 75);
    arc(0, -3.5, 26, 17, PI, TWO_PI);
    rect(0, -3.5, 26, 2);

    // 7. Graines de sésame blanches
    fill(255, 248, 220, 230);
    circle(-6, -8.5, 1.5);
    circle(-1, -10.5, 1.5);
    circle(4, -8.5, 1.5);
    circle(-3, -6.5, 1.4);
    circle(3, -6, 1.4);
    circle(8, -6.5, 1.3);

    rectMode(CORNER);
  }

  /**
   * Dessine une part de pizza pepperoni croustillante
   */
  drawPizza() {
    // 1. Croûte dorée à l'arrière
    noStroke();
    fill(205, 135, 65);
    arc(0, -11, 26, 8, PI, TWO_PI);

    // 2. Base de pâte & sauce tomate
    fill(215, 60, 35);
    triangle(0, 13, -11, -10, 11, -10);

    // 3. Fromage mozzarella fondu coulant
    fill(255, 210, 65);
    triangle(0, 11, -9.5, -9, 9.5, -9);
    // Petite goutte de fromage qui coule vers la pointe
    ellipse(0, 11.5, 3.5, 4.5);

    // 4. Tranches de Pepperoni épicé
    fill(185, 40, 30);
    circle(-3.5, -4, 5.5);
    circle(3.5, -3, 5.5);
    circle(0, 4, 4.5);

    // Relief du pepperoni (points plus foncés)
    fill(140, 25, 20);
    circle(-4, -4.5, 1.8);
    circle(4, -3.5, 1.8);
    circle(0.5, 3.5, 1.5);

    // 5. Herbes / origan parsemé
    fill(45, 130, 35);
    circle(-6, -1, 1.2);
    circle(5, 2, 1.2);
    circle(-1, -7, 1.2);
    circle(2, 7, 1.2);
  }
}
