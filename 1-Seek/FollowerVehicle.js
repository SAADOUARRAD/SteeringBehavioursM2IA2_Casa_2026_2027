// Entité FollowerVehicle étendant Vehicle pour les exercices Seek & Flee
class FollowerVehicle extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.mode = 'seek'; // 'seek' ou 'flee'
  }

  // Première approche demandée dans les slides : inversion de la force de seek()
  fleeNaive(target) {
    return this.seek(target).mult(-1);
  }

  // Implémentation correcte selon Craig Reynolds (1999) :
  // On inverse la vitesse désirée (desiredVelocity = pos - target) et non la force résultante :
  // force = desiredVelocity - currentVelocity
  flee(target) {
    let desiredSpeed = p5.Vector.sub(this.pos, target);
    desiredSpeed.setMag(this.maxSpeed);
    let force = p5.Vector.sub(desiredSpeed, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  applyBehaviors(target) {
    let force = (this.mode === 'flee') ? this.flee(target) : this.seek(target);
    this.applyForce(force);
  }
}
