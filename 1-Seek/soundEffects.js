// Gestionnaire d'effets sonores synthétisés via Web Audio API
class SoundEffects {
  constructor() {
    this.enabled = true;
    this.audioCtx = null;
    this.lastTriggerTime = 0;
    this.minIntervalMs = 40; // Limite pour éviter la saturation si plusieurs véhicules touchent en même temps
  }

  // Initialise ou réactive l'AudioContext lors d'une interaction utilisateur
  init() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }
    const AudioContextClass = (typeof window !== 'undefined') &&
      (window.AudioContext || window.webkitAudioContext);
    if (AudioContextClass) {
      try {
        this.audioCtx = new AudioContextClass();
      } catch (e) {
        // En environnement sans audio disponible
      }
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.init();
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (this.enabled) this.init();
    return this.enabled;
  }

  // Joue un son d'impact (bip / pop)
  playImpact(pitch = 520, duration = 0.08) {
    if (!this.enabled) return false;

    const nowMs = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    if (nowMs - this.lastTriggerTime < this.minIntervalMs) {
      return false;
    }
    this.lastTriggerTime = nowMs;

    this.init();
    if (!this.audioCtx) return false;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + duration);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
      return true;
    } catch (e) {
      return false;
    }
  }
}
