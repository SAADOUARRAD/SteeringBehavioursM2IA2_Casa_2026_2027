class SeekScenarios {
  constructor(normalTarget, fleeingTarget) {
    this.normalTargets = Array.isArray(normalTarget) ? normalTarget : [normalTarget];
    this.fleeingTargets = Array.isArray(fleeingTarget) ? fleeingTarget : [fleeingTarget];
    this.mode = 'normal';
  }

  get normalTarget() { return this.normalTargets[0]; }
  get fleeingTarget() { return this.fleeingTargets[0]; }
  get targets() { return this.mode === 'flee' ? this.fleeingTargets : this.normalTargets; }
  get target() { return this.targets[0]; }

  setTargetCount(count, w, h) {
    if (!Number.isInteger(count) || count < 1 || count > 30) {
      throw new RangeError('Le nombre de cibles doit être un entier entre 1 et 30.');
    }
    for (const list of [this.normalTargets, this.fleeingTargets]) {
      while (list.length > count) list.pop();
      while (list.length < count) {
        const source = list[0];
        const created = source instanceof TargetFutante
          ? new TargetFutante(Math.random() * w, Math.random() * h)
          : new Target(Math.random() * w, Math.random() * h);
        list.push(created);
      }
    }
    this.fleeingTargets.forEach(target => target.resetFlee());
  }

  setMode(mode) {
    if (!['normal', 'flee'].includes(mode)) throw new RangeError('Scénario inconnu');
    if (mode !== this.mode) this.fleeingTargets.forEach(target => target.resetFlee());
    this.mode = mode;
  }

  update(vehicles, deltaMilliseconds) {
    if (this.mode === 'flee') this.fleeingTargets.forEach(target => target.update(vehicles, deltaMilliseconds));
    else this.normalTargets.forEach(target => target.update(deltaMilliseconds));
  }
}
