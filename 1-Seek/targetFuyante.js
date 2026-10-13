// Entité TargetFuyante étendant Vehicle (via Target)
// Scénario 2 : Cible autonome qui fuit le vaisseau le plus proche lorsqu'il entre dans son cercle de détection (200px par défaut),
// avec limite d'endurance (2,5s par défaut) et mode debug (touche 'd').
class TargetFuyante extends Target {
  constructor(x, y) {
    super(x, y);
    this.r = 25;
    this.color = '#ff3366';

    // Paramètres de perception et de fuite
    this.detectionRadius = 200; // Rayon de détection réglable par la UI (défaut 200 px)
    this.safeDistance = 300;     // Distance de sécurité pour cesser la fuite (300 px)

    // Vitesses et forces
    this.normalSpeed = 3;
    this.fleeSpeed = 6;          // Accélère et augmente sa vitesse pendant la fuite
    this.normalMaxForce = 0.1;
    this.fleeMaxForce = 0.4;     // Force de braquage accrue pendant la fuite

    this.maxSpeed = this.normalSpeed;
    this.maxForce = this.normalMaxForce;

    // Endurance (durée maximale de fuite)
    this.maxFleeDuration = 2.5;  // Durée max en secondes (réglable par curseur)
    this.currentEndurance = 2.5; // Temps restant en secondes
    this.recoveryRate = 1.0;     // Taux de récupération (sec d'endurance récupérées par sec de repos)
    this.isExhausted = false;    // Vrai si épuisée

    this.isFleeing = false;
    this.currentThreat = null;
    this.closestDist = Infinity;
  }

  // Trouve le vaisseau le plus proche dans la population
  findClosestVehicle(vehicles) {
    if (!vehicles || vehicles.length === 0) {
      return { vehicle: null, distance: Infinity };
    }
    let closest = null;
    let minDist = Infinity;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const d = (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.dist)
        ? p5.Vector.dist(this.pos, v.pos)
        : Math.hypot(this.pos.x - v.pos.x, this.pos.y - v.pos.y);

      if (d < minDist) {
        minDist = d;
        closest = v;
      }
    }
    return { vehicle: closest, distance: minDist };
  }

  // Applique les comportements : fuite si un prédateur est dans le cercle de détection et s'il reste de l'endurance
  applyBehaviors(vehicles, dt = 1 / 60) {
    const { vehicle: closest, distance: d } = this.findClosestVehicle(vehicles);
    this.closestDist = d;

    // 1. Déclenchement de la fuite si un prédateur entre dans le cercle de détection (200 px) et pas épuisée
    if (!this.isFleeing && !this.isExhausted && this.currentEndurance > 0 && closest && d <= this.detectionRadius) {
      this.isFleeing = true;
      this.currentThreat = closest;
    }

    // 2. Vérification de la distance de sécurité (300 px)
    if (this.isFleeing) {
      const threatDist = this.currentThreat
        ? ((typeof p5 !== 'undefined' && p5.Vector && p5.Vector.dist)
            ? p5.Vector.dist(this.pos, this.currentThreat.pos)
            : Math.hypot(this.pos.x - this.currentThreat.pos.x, this.pos.y - this.currentThreat.pos.y))
        : d;

      if (threatDist >= this.safeDistance) {
        // Hors de portée (> 300 px) : fin de fuite, reprise du comportement normal
        this.isFleeing = false;
        this.currentThreat = null;
      }
    }

    // 3. Gestion de l'endurance
    if (this.isFleeing) {
      this.currentEndurance -= dt;
      if (this.currentEndurance <= 0) {
        this.currentEndurance = 0;
        this.isFleeing = false;
        this.isExhausted = true; // Épuisée : doit se reposer
        this.currentThreat = null;
      }
    } else {
      // Récupération progressive de l'endurance au repos
      if (this.currentEndurance < this.maxFleeDuration) {
        this.currentEndurance = Math.min(this.maxFleeDuration, this.currentEndurance + this.recoveryRate * dt);
      }
      if (this.currentEndurance >= this.maxFleeDuration * 0.3) {
        this.isExhausted = false; // Récupère assez d'énergie pour fuir à nouveau
      }
    }

    // 4. Application de la force si toujours en fuite
    if (this.isFleeing && this.currentThreat) {
      const threatDist = (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.dist)
        ? p5.Vector.dist(this.pos, this.currentThreat.pos)
        : Math.hypot(this.pos.x - this.currentThreat.pos.x, this.pos.y - this.currentThreat.pos.y);

      // Si un autre prédateur est devenu encore plus proche, fuir celui-là
      const threat = (closest && d < threatDist) ? closest : this.currentThreat;
      this.currentThreat = threat;

      // Vitesse et force accrues pendant la fuite
      this.maxSpeed = this.fleeSpeed;
      this.maxForce = this.fleeMaxForce;

      // Fuite via la méthode flee héritée de Vehicle
      const fleeForce = this.flee(threat.pos);
      this.applyForce(fleeForce);
      return;
    }

    // Comportement normal de Target par défaut (vitesse normale)
    this.maxSpeed = this.normalSpeed;
    this.maxForce = this.normalMaxForce;
  }

  update(vehicles, dt = 1 / 60) {
    if (vehicles && vehicles.length > 0) {
      this.applyBehaviors(vehicles, dt);
    }

    // Si elle ne fuit pas, elle conserve le comportement normal de Target (petite variation continue de cap)
    if (!this.isFleeing && typeof random === 'function') {
      this.vel.rotate(random(-0.1, 0.1));
    }

    super.update();
  }

  // Dessin de la cible, de la barre d'endurance et du cercle de détection (en mode debug)
  show(debugMode = false) {
    push();

    // 1. Cercle de détection en mode debug (activable par la touche 'd')
    // Jaune par défaut, Rouge quand un vaisseau est à l'intérieur
    if (debugMode) {
      const isThreatInside = this.closestDist <= this.detectionRadius;
      noFill();
      if (isThreatInside) {
        stroke(255, 40, 40, 220); // Rouge quand un vaisseau est à l'intérieur
        strokeWeight(2.5);
      } else {
        stroke(255, 230, 0, 180); // Jaune par défaut
        strokeWeight(1.5);
      }
      circle(this.pos.x, this.pos.y, this.detectionRadius * 2);

      // Indicateur visuel du seuil de sécurité à 300px en debug
      stroke(255, 255, 255, 50);
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, this.safeDistance * 2);
    }

    // 2. Dessin du corps de la cible
    fill(this.isFleeing ? '#ff0055' : this.color);
    stroke('white');
    strokeWeight(2);
    circle(this.pos.x, this.pos.y, this.r * 2);

    // 3. Barre d'endurance au-dessus de la cible
    this.drawEnduranceBar();

    pop();
  }

  // Dessine la jauge d'endurance au-dessus de la cible
  drawEnduranceBar() {
    const barW = 44;
    const barH = 6;
    const x = this.pos.x - barW / 2;
    const y = this.pos.y - this.r - 14;

    const ratio = Math.max(0, Math.min(1, this.currentEndurance / this.maxFleeDuration));

    // Fond de la barre
    fill(20, 20, 25, 200);
    stroke(255, 255, 255, 180);
    strokeWeight(1);
    rect(x, y, barW, barH, 2);

    // Couleur dynamique : vert si plein, jaune si moyen, rouge si faible/épuisé
    noStroke();
    if (this.isExhausted || ratio < 0.25) {
      fill(255, 45, 85); // Rouge
    } else if (ratio < 0.55) {
      fill(255, 204, 0); // Jaune
    } else {
      fill(0, 230, 120); // Vert
    }
    rect(x + 1, y + 1, (barW - 2) * ratio, barH - 2, 1);
  }
}
