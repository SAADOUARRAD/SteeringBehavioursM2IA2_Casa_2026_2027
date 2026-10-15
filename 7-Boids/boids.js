// Flocking
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/124-flocking-boids.html
// https://youtu.be/mhjuuHl6qHM

class Boid {
  static debug = false;
  constructor(x, y, image) {

    this.pos = createVector(x, y);

    this.vel = p5.Vector.random2D();
    this.vel.setMag(random(2, 4));
    this.acc = createVector();
    this.maxForce = 0.2;
    this.maxSpeed = 5;
    this.r = 6;
    this.trail = [];
    this.trailMaxLength = 28;

    // si le boid est une image
    this.setImage(image);

    this.perceptionRadius = 25;
    // pour le comportement align
    this.alignWeight = 1.5;
    // pour le comportement cohesion
    this.cohesionWeight = 1;
    // Pour la séparation
    this.separationWeight = 2;
    // Pour le confinement
    this.boundariesWeight = 10;
    // pour le avoid
    this.avoidWeight = 15;

    // Paramètres comportement confinement
    this.boundariesX = 0;
    this.boundariesY = 0
    this.boundariesWidth = width;
    this.boundariesHeight = height;
    this.boundariesDistance = 25;

    // Paramètres  comportement Wander
    // pour comportement wander
    this.distanceCercle = 150;
    this.wanderRadius = 50;
    this.wanderTheta = 0;
    this.displaceRange = 0.1;

     // Pour évitement d'obstacle
    this.largeurZoneEvitementDevantVaisseau = this.r / 2;

  }

  // Equivalent de "applyBehaviors" dans le code des autres exemples
  // flock signifie "se rassembler" en anglais
  flock(boids, obstacles, target = null) {
    const alignment = this.align(boids).mult(this.alignWeight);
    const cohesion = this.cohesion(boids).mult(this.cohesionWeight);
    const separation = this.separation(boids).mult(this.separationWeight);
    const boundaries = this.boundaries(this.boundariesX, this.boundariesY, this.boundariesWidth, this.boundariesHeight, this.boundariesDistance).mult(this.boundariesWeight);
    const flockForce = alignment.add(cohesion).add(separation).add(boundaries);
    const obstacleForce = this.avoid(obstacles).mult(this.avoidWeight);
    const targetForce = target ? this.fleeWithTargetRadius(target) : createVector(0, 0);
    const safetyForce = obstacleForce.add(targetForce);
    const combined = safetyForce.magSq() > 0 ? safetyForce.add(flockForce.mult(0.25)) : flockForce;
    combined.limit(this.maxForce);
    this.applyForce(combined);
    return combined;
  }

  // Répulsion simple du cercle : aucune anticipation d'obstacle n'est faite.
  avoid(obstacles = []) {
    let strongest = createVector(0, 0);
    for (const obstacle of obstacles || []) {
      if (!obstacle || !obstacle.pos) continue;
      const force = this.fleeFromCircle(obstacle.pos, obstacle.r + this.largeurZoneEvitementDevantVaisseau);
      if (force.magSq() > strongest.magSq()) strongest = force;
    }
    return strongest;
  }

  fleeFromCircle(center, radius) {
    const away = p5.Vector.sub(this.pos, center);
    const distance = away.mag();
    if (distance >= radius || radius <= 0) return createVector(0, 0);
    if (distance === 0) away.set(1, 0);
    away.normalize().mult(this.maxSpeed);
    return away.sub(this.vel).limit(this.maxForce);
  }

  fleeWithTargetRadius(target, offset = 10) {
    if (!target) return createVector(0, 0);
    const center = target.pos || target;
    return this.fleeFromCircle(center, (target.r || 0) + offset);
  }
  align(boids) {
    let perceptionRadius = this.perceptionRadius;

    let steering = createVector();
    let total = 0;
    for (let other of boids) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.vel);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  separation(boids) {
    let perceptionRadius = this.perceptionRadius;

    let steering = createVector();
    let total = 0;

    for (let other of boids) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perceptionRadius) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.div(d * d);
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids) {
    let perceptionRadius = 2 * this.perceptionRadius;

    let steering = createVector();
    let total = 0;

    for (let other of boids) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.pos);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);

      steering.sub(this.pos);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  // seek est une méthode qui permet de faire se rapprocher le véhicule de la cible passée en paramètre
  seek(target) {
    // on calcule la direction vers la cible
    // C'est l'ETAPE 1 (action : se diriger vers une cible)
    let vitesseSouhaitee = p5.Vector.sub(target, this.pos);

    // Dessous c'est l'ETAPE 2 : le pilotage (comment on se dirige vers la cible)
    // on limite ce vecteur à la longueur maxSpeed
    vitesseSouhaitee.setMag(this.maxSpeed);

    // on calcule maintenant force = desiredSpeed - currentSpeed
    let force = p5.Vector.sub(vitesseSouhaitee, this.vel);

    // et on limite cette force à maxForce
    force.limit(this.maxForce);
    return force;
  }

  flee(target) {
    // inverse de seek ! 
    let force = this.seek(target).mult(-1);
    return force;
  }

  wander() {
    // point devant le véhicule, centre du cercle

    let centreCercleDevant = this.vel.copy();
    centreCercleDevant.setMag(this.distanceCercle);
    centreCercleDevant.add(this.pos);

    if (Boid.debug) {
      // on le dessine sous la forme d'une petit cercle rouge
      fill("red");
      circle(centreCercleDevant.x, centreCercleDevant.y, 8);

      // Cercle autour du point
      noFill();
      stroke("white");
      circle(centreCercleDevant.x, centreCercleDevant.y, this.wanderRadius * 2);

      // on dessine une ligne qui relie le vaisseau à ce point
      // c'est la ligne blanche en face du vaisseau
      line(this.pos.x, this.pos.y, centreCercleDevant.x, centreCercleDevant.y);
    }

    // On va s'occuper de calculer le point vert SUR LE CERCLE
    // il fait un angle wanderTheta avec le centre du cercle
    // l'angle final par rapport à l'axe des X c'est l'angle du vaisseau
    // + cet angle
    let wanderAngle = this.vel.heading() + this.wanderTheta;
    // on calcule les coordonnées du point vert
    let pointSurCercle = createVector(this.wanderRadius * cos(wanderAngle), this.wanderRadius * sin(wanderAngle));
    // on ajoute la position du vaisseau
    pointSurCercle.add(centreCercleDevant);

    // maintenant pointSurCercle c'est un point sur le cercle
    // on le dessine sous la forme d'un cercle vert
    if (Boid.debug) {
      fill("lightGreen");
      circle(pointSurCercle.x, pointSurCercle.y, 8);

      // on dessine une ligne qui va du vaisseau vers le point sur le 
      // cercle
      line(this.pos.x, this.pos.y, pointSurCercle.x, pointSurCercle.y);

    }
    // on dessine le vecteur desiredSpeed qui va du vaisseau au point vert
    let desiredSpeed = p5.Vector.sub(pointSurCercle, this.pos);


    // On a donc la vitesse désirée que l'on cherche qui est le vecteur
    // allant du vaisseau au cercle vert. On le calcule :
    // ci-dessous, steer c'est la desiredSpeed directement !
    // Voir l'article de Craig Reynolds, Daniel Shiffman s'est trompé
    // dans sa vidéo, on ne calcule pas la formule classique
    // force = desiredSpeed - vitesseCourante, mais ici on a directement
    // force = desiredSpeed
    let force = p5.Vector.sub(desiredSpeed, this.vel);
    force.setMag(this.maxForce);

    // On déplace le point vert sur le cerlcle (en radians)
    this.wanderTheta += random(-this.displaceRange, this.displaceRange);

    return force;
  }

  // Permet de rester dans les limites d'une zone rectangulaire.
  // Lorsque le véhicule s'approche d'un bord vertical ou horizontal
  // on calcule la vitesse désirée dans la direction "réfléchie" par
  // rapport au bord (comme au billard).
  // Par exemple, si le véhicule s'approche du bord gauche à moins de 
  // 25 pixels (valeur par défaut de la variable d),
  // on calcule la vitesse désirée en gardant le x du vecteur vitesse
  // et en mettant son y positif. x vaut maxSpeed et y vaut avant une valeur
  // négative (puisque le véhicule va vers la gauche), on lui donne un y positif
  // ça c'est pour la direction à prendre (vitesse désirée). Une fois la direction
  // calculée on lui donne une norme égale à maxSpeed, puis on calcule la force
  // normalement : force = vitesseDesiree - vitesseActuelle
  // paramètres = un rectangle (bx, by, bw, bh) et une distance d
  boundaries(bx, by, bw, bh, d) {
    let vitesseDesiree = null;

    const xBordGauche = bx + d;
    const xBordDroite = bx + bw - d;
    const yBordHaut = by + d;
    const yBordBas = by + bh - d;

    // si le véhicule est trop à gauche ou trop à droite
    if (this.pos.x < xBordGauche) {
      // 
      vitesseDesiree = createVector(this.maxSpeed, this.vel.y);
    } else if (this.pos.x > xBordDroite) {
      vitesseDesiree = createVector(-this.maxSpeed, this.vel.y);
    }

    if (this.pos.y < yBordHaut) {
      vitesseDesiree = createVector(this.vel.x, this.maxSpeed);
    } else if (this.pos.y > yBordBas) {
      vitesseDesiree = createVector(this.vel.x, -this.maxSpeed);
    }

    if (vitesseDesiree !== null) {
      vitesseDesiree.setMag(this.maxSpeed);
      const force = p5.Vector.sub(vitesseDesiree, this.vel);
      return force.limit(this.maxForce);
    }

    if (Boid.debug) {
      // dessin du cadre de la zone
      push();

      noFill();
      stroke("white");
      rect(bx, by, bw, bh);

      // et du rectangle intérieur avec une bordure rouge de d pixels
      stroke("red");
      rect(bx + d, by + d, bw - 2 * d, bh - 2 * d);

      pop();
    }

    // si on est pas près du bord (vitesse désirée nulle), on renvoie un vecteur nul
    return createVector(0, 0);
  }

  getVehiculeLePlusProche(vehicules) {
    let plusPetiteDistance = Infinity;
    let vehiculeLePlusProche;

    vehicules.forEach(v => {
      if (v != this) {
        // Je calcule la distance entre le vaisseau et le vehicule
        const distance = this.pos.dist(v.pos);
        if (distance < plusPetiteDistance) {
          plusPetiteDistance = distance;
          vehiculeLePlusProche = v;
        }
      }
    });

    return vehiculeLePlusProche;
  }


  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.pos.add(this.vel);
    this.trail.push(this.pos.copy());
    if (this.trail.length > this.trailMaxLength) this.trail.shift();
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.acc.mult(0);
  }

  show() {
    if (this.trail.length > 1) {
      push();
      noFill();
      strokeWeight(Math.max(1, this.r * 0.22));
      for (let i = 1; i < this.trail.length; i++) {
        stroke(100, 210, 255, map(i, 0, this.trail.length - 1, 20, 150));
        line(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
      }
      pop();
    }

    if (this.image !== undefined) {
      imageMode(CENTER);
      push();
      translate(this.pos.x, this.pos.y);
      rotate(this.vel.heading());
      image(this.image, 0, 0, this.r, this.r);
      pop();
      return;
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    noStroke();
    fill(255, 220);
    beginShape();
    vertex(this.r * 1.7, 0);
    vertex(-this.r, -this.r * 0.7);
    vertex(-this.r * 0.55, 0);
    vertex(-this.r, this.r * 0.7);
    endShape(CLOSE);
    pop();
  }

  setImage(image) {
    this.image = image || undefined;
    if (!this.image) {
      this.imageL = undefined;
      this.imageH = undefined;
      return;
    }
    const ratio = this.image.width / this.image.height;
    this.imageL = this.r;
    this.imageH = this.r / ratio;
  }
  edges() {
    if (this.pos.x > width) {
      this.pos.x = 0;
    } else if (this.pos.x < 0) {
      this.pos.x = width;
    }
    if (this.pos.y > height) {
      this.pos.y = 0;
    } else if (this.pos.y < 0) {
      this.pos.y = height;
    }
  }
 drawVector(pos, v, color) {
    push();
    // Dessin du vecteur vitesse
    // Il part du centre du véhicule et va dans la direction du vecteur vitesse
    strokeWeight(3);
    stroke(color);
    line(pos.x, pos.y, pos.x + v.x, pos.y + v.y);
    // dessine une petite fleche au bout du vecteur vitesse
    let arrowSize = 5;
    translate(pos.x + v.x, pos.y + v.y);
    rotate(v.heading());
    translate(-arrowSize / 2, 0);
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
  }
  
}
