class Obstacle extends Boid {
  constructor(x, y, r, couleur) {
    super(x, y);
    this.r = r;
    this.color = couleur;
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.vel.set(0, 0);
  }

  show() {
    push();
    fill(this.color);
    stroke(0)
    strokeWeight(3);
    ellipse(this.pos.x, this.pos.y, this.r * 2);
    fill(0);
    ellipse(this.pos.x, this.pos.y, 10);
    pop();
  }
}

function removeObstacleAt(obstacles, x, y) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    if (p5.Vector.dist(obstacle.pos, createVector(x, y)) <= obstacle.r) {
      return obstacles.splice(i, 1)[0];
    }
  }
  return null;
}
