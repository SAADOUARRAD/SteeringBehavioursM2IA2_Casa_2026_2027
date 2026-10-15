/**
 * Force de contournement préventif d'obstacles circulaires.
 * La perception est bornée à un corridor devant le véhicule et retourne une
 * force de steering; elle ne modifie jamais sa position ni sa vitesse.
 */
function obstacleAvoidance(vehicle, obstacles, detectionDistance = 150) {
  if (!vehicle || !obstacles || obstacles.length === 0 || vehicle.vel.magSq() === 0) {
    return { force: createVector(0, 0), obstacle: null, distance: Infinity };
  }

  const forward = vehicle.vel.copy().normalize();
  const side = createVector(-forward.y, forward.x);
  const range = Math.max(0, detectionDistance);
  let nearest = null;
  let nearestAlong = Infinity;
  let nearestLateral = 0;

  for (const obstacle of obstacles) {
    if (!obstacle || !obstacle.pos) continue;
    const offset = p5.Vector.sub(obstacle.pos, vehicle.pos);
    const along = offset.dot(forward);
    const lateral = offset.dot(side);
    const clearance = (obstacle.r || 0) + vehicle.r + 8;
    if (along < -vehicle.r || along > range || Math.abs(lateral) > clearance) continue;
    if (along < nearestAlong) {
      nearest = obstacle;
      nearestAlong = along;
      nearestLateral = lateral;
    }
  }

  if (!nearest) return { force: createVector(0, 0), obstacle: null, distance: Infinity };

  // Passe du côté opposé à l'obstacle. En cas d'alignement exact, le côté
  // gauche est choisi de façon déterministe pour éviter les oscillations.
  const clearance = (nearest.r || 0) + vehicle.r + 8;
  const sideSign = nearestLateral >= 0 ? -1 : 1;
  const urgency = constrain(1 - Math.max(0, nearestAlong) / Math.max(1, range), 0.25, 1);
  const desired = forward.copy().mult(1 - urgency * 0.32)
    .add(side.copy().mult(sideSign * urgency * 1.4));
  desired.normalize().mult(vehicle.maxSpeed);
  const force = desired.sub(vehicle.vel).limit(vehicle.maxForce);
  return { force, obstacle: nearest, distance: Math.max(0, nearestAlong - clearance) };
}

/**
 * Anticipe les croisements avec les véhicules en extrapolant leurs vitesses
 * relatives sur un court horizon. Renvoie uniquement une force de steering.
 */
function vehicleCollisionAvoidance(vehicle, neighbors, lookAhead = 18) {
  if (!vehicle || !neighbors || neighbors.length === 0) {
    return { force: createVector(0, 0), vehicle: null, time: Infinity };
  }

  let threat = null;
  let earliest = Infinity;
  let closestOffset = null;
  for (const other of neighbors) {
    if (!other || other === vehicle || !other.pos || !other.vel) continue;
    const relativePosition = p5.Vector.sub(other.pos, vehicle.pos);
    const relativeVelocity = p5.Vector.sub(other.vel, vehicle.vel);
    const speedSq = relativeVelocity.magSq();
    if (speedSq === 0) continue;
    const time = constrain(-relativePosition.dot(relativeVelocity) / speedSq, 0, lookAhead);
    const predictedOffset = relativePosition.add(relativeVelocity.mult(time));
    const clearance = vehicle.r + other.r + 10;
    if (time < earliest && predictedOffset.mag() <= clearance) {
      threat = other;
      earliest = time;
      closestOffset = predictedOffset;
    }
  }

  if (!threat) return { force: createVector(0, 0), vehicle: null, time: Infinity };

  const heading = vehicle.vel.copy().normalize();
  const side = createVector(-heading.y, heading.x);
  const sideSign = closestOffset.x * side.x + closestOffset.y * side.y >= 0 ? -1 : 1;
  const urgency = constrain(1 - earliest / Math.max(1, lookAhead), 0.3, 1);
  const desired = heading.mult(1 - urgency * 0.25)
    .add(side.mult(sideSign * urgency * 1.5))
    .normalize()
    .mult(vehicle.maxSpeed);
  const force = desired.sub(vehicle.vel).limit(vehicle.maxForce);
  return { force, vehicle: threat, time: earliest };
}
