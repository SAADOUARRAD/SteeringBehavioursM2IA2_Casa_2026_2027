/**
 * SnakeWander.js
 * Sous-classe de Snake issue de 3-Arrival_correction, adaptée à 5-3-PathFollowingComplex.
 * Permet au serpent d'errer librement (wander) tout en évitant les véhicules (separation).
 */
class SnakeWander extends Snake {
  constructor(x, y, length = 10, taille = 14, couleur = '#f39c12') {
    super(x, y, length, taille, couleur);
    this.wanderWeight = 1.0;
  }

  /**
   * Applique le comportement d'errance libre et séparation des véhicules
   * @param {Vehicle[]} vehicles
   */
  applyBehaviors(vehicles, path = null) {
    // 1. La tête erre et évite les véhicules
    let fWander = this.head.wander();
    let sHead = this.head.separate(vehicles);

    fWander.mult(this.wanderWeight);
    sHead.mult(this.separateWeight);

    this.head.applyForce(fWander);
    this.head.applyForce(sHead);
    this.head.update();
    this.head.edges();

    this.pos = this.head.pos.copy();
    this.vel = this.head.vel.copy();

    // 2. Les anneaux suivent la tête avec arrive + separate
    for (let i = 1; i < this.anneaux.length; i++) {
      let anneau = this.anneaux[i];
      let cible = this.anneaux[i - 1].pos;

      let fArrive = anneau.arrive(cible, this.ringSpacing);
      let sRing = anneau.separate(vehicles);
      sRing.mult(this.separateWeight);

      anneau.applyForce(fArrive);
      anneau.applyForce(sRing);
      anneau.update();
      anneau.edges();
    }
  }
}
