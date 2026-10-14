// Gestion de scène : aucun calcul de steering ou de locomotion ici.
const SeekPopulation = (() => {
  const MIN_COUNT = 1;
  const MAX_COUNT = 200;
  const INITIAL_COUNT = 20;
  const ARRIVAL_RADIUS = 16;

  function distanceSquared(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function targetPosition(target) {
    if (Array.isArray(target)) return target.length ? targetPosition(target[0]) : { x: 0, y: 0 };
    return target.pos ?? target;
  }

  function nearestTarget(vehicle, targets) {
    const list = Array.isArray(targets) ? targets : [targets];
    if (!list.length) return null;
    return list.reduce((nearest, candidate) => {
      if (!nearest) return candidate;
      return distanceSquared(vehicle.pos, targetPosition(candidate))
        < distanceSquared(vehicle.pos, targetPosition(nearest)) ? candidate : nearest;
    }, null);
  }

  function arrivalRadius(vehicle, target) {
    return (target.r ?? ARRIVAL_RADIUS) + vehicle.r;
  }

  function hasArrived(vehicle, target) {
    return distanceSquared(vehicle.pos, targetPosition(target)) <= arrivalRadius(vehicle, target) ** 2;
  }

  // null signifie qu'aucune position ne respecte la zone d'exclusion.
  function spawnPosition(target, w, h, radius, rng = Math.random) {
    const targetPoint = targetPosition(target);
    const exclusion = (target.r ?? ARRIVAL_RADIUS) + radius + 4;
    const marginX = w >= radius * 2 ? radius : 0;
    const marginY = h >= radius * 2 ? radius : 0;
    const bounds = { left: marginX, right: w - marginX, top: marginY, bottom: h - marginY };
    for (let attempt = 0; attempt < 32; attempt++) {
      const point = {
        x: bounds.left + rng() * (bounds.right - bounds.left),
        y: bounds.top + rng() * (bounds.bottom - bounds.top),
      };
      if (distanceSquared(point, targetPoint) > exclusion ** 2) return point;
    }
    const corner = farthestCorner(targetPoint, bounds);
    if (distanceSquared(corner, targetPoint) > exclusion ** 2) return corner;
    const fallback = farthestCorner(targetPoint, { left: 0, right: w, top: 0, bottom: h });
    return distanceSquared(fallback, targetPoint) > exclusion ** 2 ? fallback : null;
  }

  function farthestCorner(target, bounds) {
    const corners = [
      { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom },
    ];
    return corners.reduce((best, point) =>
      distanceSquared(point, target) > distanceSquared(best, target) ? point : best);
  }

  function resize(vehicles, count, target, w, h, createVehicle, rng = Math.random) {
    if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
      throw new RangeError('Le nombre de véhicules doit être un entier entre 1 et 200.');
    }
    if (count < vehicles.length) vehicles.length = count;
    while (vehicles.length < count) {
      const vehicle = createVehicle(0, 0);
      const point = spawnPosition(target, w, h, vehicle.r, rng)
        ?? farthestCorner(targetPosition(target), { left: 0, right: w, top: 0, bottom: h });
      vehicle.pos.set(point.x, point.y);
      vehicles.push(vehicle);
    }
  }

  function respawn(vehicle, target, w, h, rng = Math.random) {
    const point = spawnPosition(target, w, h, vehicle.r, rng);
    if (!point) return false;
    vehicle.pos.set(point.x, point.y);
    vehicle.vel.set(0, 0);
    vehicle.acc.set(0, 0);
    return true;
  }

  function step(vehicle, target, w, h, rng = Math.random) {
    target = nearestTarget(vehicle, target);
    if (!target) return;
    if (hasArrived(vehicle, target)) {
      respawn(vehicle, target, w, h, rng);
      return { arrived: true, target };
    }
    vehicle.applyBehaviors(targetPosition(target));
    vehicle.update();
    vehicle.edges();
    if (hasArrived(vehicle, target)) {
      respawn(vehicle, target, w, h, rng);
      return { arrived: true, target };
    }
    return { arrived: false, target };
  }

  function setLimits(vehicles, maxSpeed, maxForce) {
    for (const vehicle of vehicles) {
      vehicle.maxSpeed = maxSpeed;
      vehicle.maxForce = maxForce;
      vehicle.vel.limit(maxSpeed);
    }
  }

  function bindSlider(slider, output, vehicles, target, dimensions, createVehicle, rng = Math.random) {
    const synchronize = () => {
      const { width: w, height: h } = dimensions();
      const activeTarget = typeof target === 'function' ? target() : target;
      resize(vehicles, Number(slider.value), activeTarget, w, h, createVehicle, rng);
      output.value = `${vehicles.length} / ${MAX_COUNT}`;
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  return { MIN_COUNT, MAX_COUNT, INITIAL_COUNT, ARRIVAL_RADIUS,
    hasArrived, nearestTarget, spawnPosition, resize, respawn, step, bindSlider, setLimits };
})();
