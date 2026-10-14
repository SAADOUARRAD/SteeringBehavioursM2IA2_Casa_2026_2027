/**
 * MotoSquad.js
 * Peloton / Écurie de motos en formation de course (Drafting & Aspiration).
 * Sous-classe de Vehicle qui adapte le concept de chaîne / serpent au thème moto :
 *  - La moto de tête (Leader) ouvre la voie en suivant le circuit (follow)
 *  - Les motos suiveuses (Wingmen) exploitent le sillage aérodynamique (arrive)
 *  - Toutes les motos maintiennent une séparation active (separate) pour ne pas se percuter
 */
class MotoSquad extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} count    Nombre de motos dans l'équipe
   * @param {string} teamColor Couleur d'écurie
   * @param {number} baseSpeed Vitesse de croisière
   */
  constructor(x, y, count = 5, teamColor = null, baseSpeed = 4.2) {
    super(x, y, baseSpeed, 0.45);

    const teamColors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'];
    this.teamColor = teamColor || teamColors[Math.floor(random(teamColors.length))];
    this.motos = [];
    this.draftDistance = 24; // Distance idéale d'aspiration entre pilotes

    this.followPathWeight = 2.0;
    this.separateWeight = 2.5;

    // 1. Leader de l'équipe
    this.leader = new Moto(x, y, baseSpeed, 0.45, this.teamColor, 1);
    this.motos.push(this.leader);

    // 2. Pilotes suiveurs
    for (let i = 1; i < count; i++) {
      let mx = x - i * this.draftDistance;
      let my = y;
      let follower = new Moto(mx, my, baseSpeed * 1.15, 0.55, this.teamColor, i + 1);
      this.motos.push(follower);
    }
  }

  setWeights(followWeight, sepWeight) {
    this.followPathWeight = Number(followWeight);
    this.separateWeight = Number(sepWeight);
    for (let m of this.motos) {
      m.followPathWeight = this.followPathWeight;
      m.separateWeight = this.separateWeight;
    }
  }

  setSpeed(speed) {
    this.maxSpeed = speed;
    for (let i = 0; i < this.motos.length; i++) {
      this.motos[i].originalMaxSpeed = (i === 0) ? speed : speed * 1.15;
      this.motos[i].maxSpeed = this.motos[i].originalMaxSpeed;
    }
  }

  triggerNitro(duration = 80) {
    for (let m of this.motos) {
      m.triggerNitro(duration);
    }
  }

  /**
   * Applique les comportements de pilotage de peloton :
   * - Leader : follow(path) + separate(allVehicles)
   * - Suiveurs : arrive(motoDevant) + separate(allVehicles)
   */
  applyBehaviors(vehicles, path, particles = null) {
    // 1. Leader
    let fFollow = this.leader.follow(path);
    let sLeader = this.leader.separate(vehicles);

    fFollow.mult(this.followPathWeight);
    sLeader.mult(this.separateWeight);

    this.leader.applyForce(fFollow);
    this.leader.applyForce(sLeader);
    this.leader.applyBehaviors(vehicles, path, particles); // Pour le lean et les particules
    this.leader.update();

    this.pos = this.leader.pos.copy();
    this.vel = this.leader.vel.copy();

    // 2. Suiveurs en aspiration
    for (let i = 1; i < this.motos.length; i++) {
      let moto = this.motos[i];
      let motoDevant = this.motos[i - 1];

      let fArrive = moto.arrive(motoDevant.pos, this.draftDistance, 70);
      let sMoto = moto.separate(vehicles);

      sMoto.mult(this.separateWeight);

      moto.applyForce(fArrive);
      moto.applyForce(sMoto);
      moto.applyBehaviors(vehicles, path, particles);
      moto.update();
    }
  }

  render(isDebug = false) {
    // Dessiner de l'arrière vers l'avant pour l'ordre de superposition
    for (let i = this.motos.length - 1; i >= 0; i--) {
      this.motos[i].render(isDebug);
    }
  }

  getBikes() {
    return this.motos;
  }
}
