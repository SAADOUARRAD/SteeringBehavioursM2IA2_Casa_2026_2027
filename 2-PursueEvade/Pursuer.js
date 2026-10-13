// Entité Pursuer (chasseur / poursuiveur prédictif)
// Hérite obligatoirement de Vehicle.
class Pursuer extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.r = 18;
    this.maxSpeed = 8;
    this.maxForce = 0.35;

    // Point d'interception prédit de haute précision
    this.targetPredictionPoint = null;
    this.predictionLookaheadFrames = 0;
  }

  // Poursuite prédictive haute précision selon la formulation adaptative de Craig Reynolds
  pursueWithPrecision(target) {
    if (!target) return createVector(0, 0);

    // 1. Calcul de la distance actuelle jusqu'à la cible
    const d = (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.dist)
      ? p5.Vector.dist(this.pos, target.pos)
      : Math.hypot(this.pos.x - target.pos.x, this.pos.y - target.pos.y);

    // 2. Horizon temporel prédictif adaptatif T = distance / vitesse_max
    // Plus le chasseur est loin, plus il anticipe loin devant ;
    // Plus il se rapproche, plus T tend vers 0 pour intercepter directement la cible.
    const lookahead = Math.min(35, Math.max(0, d / (this.maxSpeed || 1)));
    this.predictionLookaheadFrames = lookahead;

    // 3. Position future exacte anticipée
    const targetVel = (target.vel && typeof target.vel.copy === 'function')
      ? target.vel.copy()
      : (typeof createVector === 'function' ? createVector(0, 0) : { x: 0, y: 0 });

    if (typeof targetVel.mult === 'function') {
      targetVel.mult(lookahead);
    }

    if (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.add) {
      this.targetPredictionPoint = p5.Vector.add(target.pos, targetVel);
    } else {
      this.targetPredictionPoint = {
        x: target.pos.x + targetVel.x,
        y: target.pos.y + targetVel.y
      };
    }

    // 4. Force de braquage vers le point d'interception futur
    return this.seek(this.targetPredictionPoint);
  }

  // Dessin de la trajectoire prédictive de haute précision
  drawPrecisionTrajectory(target) {
    if (!this.targetPredictionPoint || !target) return;

    push();

    // 1. Ligne laser prédictive vers le point d'interception
    stroke(0, 255, 200, 180); // Cyan néon
    strokeWeight(1.8);
    this.drawDashedLine(this.pos.x, this.pos.y, this.targetPredictionPoint.x, this.targetPredictionPoint.y, 8, 4);

    // 2. Vecteur de déplacement de la cible vers son futur
    stroke(255, 80, 80, 160); // Rouge fin
    strokeWeight(1.2);
    line(target.pos.x, target.pos.y, this.targetPredictionPoint.x, this.targetPredictionPoint.y);

    // 3. Réticule holographique / crosshair au point d'interception futur
    const px = this.targetPredictionPoint.x;
    const py = this.targetPredictionPoint.y;

    noFill();
    stroke(0, 255, 180, 230);
    strokeWeight(2);
    // Cercle extérieur avec pulsation
    const pulse = 10 + Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.15) * 3;
    circle(px, py, pulse * 2);

    // Croix de visée de précision
    stroke(255, 255, 255, 220);
    strokeWeight(1.5);
    line(px - pulse - 4, py, px - 3, py);
    line(px + 3, py, px + pulse + 4, py);
    line(px, py - pulse - 4, px, py - 3);
    line(px, py + 3, px, py + pulse + 4);

    // Point central éclatant
    fill(0, 255, 255);
    noStroke();
    circle(px, py, 4);

    pop();
  }

  // Dessine une ligne en pointillés avec grande netteté
  drawDashedLine(x1, y1, x2, y2, dashLength = 8, gapLength = 4) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const unitX = dx / dist;
    const unitY = dy / dist;
    let traveled = 0;

    while (traveled < dist) {
      const curDash = Math.min(dashLength, dist - traveled);
      line(
        x1 + unitX * traveled,
        y1 + unitY * traveled,
        x1 + unitX * (traveled + curDash),
        y1 + unitY * (traveled + curDash)
      );
      traveled += dashLength + gapLength;
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel && typeof this.vel.heading === 'function') {
      rotate(this.vel.heading());
    }

    // Ailes et carlingue du chasseur prédateur
    stroke('white');
    strokeWeight(2);
    fill('#0077ff'); // Bleu prédateur

    beginShape();
    vertex(this.r * 1.4, 0);                 // Nez effilé
    vertex(-this.r * 0.9, -this.r * 0.9);   // Aile gauche
    vertex(-this.r * 0.4, 0);               // Creux arrière
    vertex(-this.r * 0.9, this.r * 0.9);    // Aile droite
    endShape(CLOSE);

    // Cockpit néon
    noStroke();
    fill('#00f0ff');
    circle(this.r * 0.3, 0, 7);

    // Réacteur / flamme de propulsion
    fill(255, 100, 0, 200);
    triangle(-this.r * 0.4, -4, -this.r * 0.4, 4, -this.r * 1.0, 0);

    pop();
  }
}
