/** Obstacle circulaire fixe, représenté par un Vehicle pour rester dans le modèle du projet. */
class TrackObstacle extends Vehicle {
  constructor(x, y, radius = 30) {
    super(x, y, 0, 0);
    this.r = Math.max(8, radius);
    this.couleur = '#54d98c';
    this.isTrackObstacle = true;
  }

  render() {
    push();
    fill(this.couleur);
    stroke('#10251b');
    strokeWeight(3);
    circle(this.pos.x, this.pos.y, this.r * 2);
    noStroke();
    fill(255, 255, 255, 100);
    circle(this.pos.x - this.r * 0.25, this.pos.y - this.r * 0.25, this.r * 0.35);
    pop();
  }
}

/** Retire l'obstacle touché par le clic et le retourne, ou null si aucun n'est visé. */
function removeTrackObstacleAt(obstacles, x, y) {
  if (!obstacles || obstacles.length === 0) return null;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    if (p5.Vector.dist(obstacle.pos, createVector(x, y)) <= obstacle.r) {
      obstacles.splice(i, 1);
      return obstacle;
    }
  }
  return null;
}
