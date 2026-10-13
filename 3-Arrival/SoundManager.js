/**
 * SoundManager.js
 * Moteur audio synthétisé entièrement via Web Audio API (pas de fichiers externes).
 *
 * Sons disponibles :
 *  - playEat(hueVal)    : "gulp" quand un serpent mange (hauteur liée à la couleur)
 *  - playGrow()         : tonalité montante quand le serpent grandit
 *  - playAmbient()      : drone ambiant de terrarium (boucle)
 *  - updateAmbient(sp)  : module le drone selon la vitesse des serpents
 *  - playSlither(speed) : frottement continu modulé par la vitesse
 *  - stopAll()          : stoppe l'ambiance
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.slitherNode = null;
    this.slitherGain = null;
    this.enabled = true;
    this.volume = 0.55;   // 0-1
    this._ready = false;
  }

  /** Doit être appelé après un geste utilisateur (clic/touche) */
  init() {
    if (this._ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this._startAmbient();
      this._startSlither();
      this._ready = true;
    } catch (e) {
      console.warn('Web Audio non disponible :', e.message);
    }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ── Ambiance de fond : drone grave de terrarium ─────────────────────────────
  _startAmbient() {
    // Oscillateur grave (50 Hz) + léger LFO sur le gain → effet respiratoire
    let osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 50;

    let lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.18; // 0.18 Hz → période ~5.5 s
    let lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(this.masterGain.gain);

    let gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.04;

    // Filtre passe-bas pour adoucir
    let filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start();
    lfo.start();

    this.ambientOsc  = osc;
    this.ambientGain = gainNode;
  }

  // ── Son de reptation : bruit blanc filtré + modulé par la vitesse ───────────
  _startSlither() {
    let bufSize = 4096;
    let buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
    let data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    let source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    let filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 3;

    let gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.0;  // commence silencieux, modulé par updateAmbient

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start();

    this.slitherNode = source;
    this.slitherGain = gainNode;
    this.slitherFilter = filter;
  }

  /**
   * Modifie le drone et la reptation selon la vitesse combinée des serpents.
   * @param {number} totalSpeed  Somme des magnitudes de vitesse des serpents (0-20)
   */
  updateAmbient(totalSpeed) {
    if (!this._ready) return;
    // Drone : fréquence monte légèrement avec la vitesse
    let targetFreq = 48 + totalSpeed * 3;
    this.ambientOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.5);

    // Reptation : volume proportionnel à la vitesse
    let slitherVol = this._map(totalSpeed, 0, 16, 0.0, 0.04);
    this.slitherGain.gain.setTargetAtTime(slitherVol, this.ctx.currentTime, 0.3);
    // Fréquence du filtre plus haute à grande vitesse (sifflement)
    let filtFreq = this._map(totalSpeed, 0, 16, 1200, 3500);
    this.slitherFilter.frequency.setTargetAtTime(filtFreq, this.ctx.currentTime, 0.2);
  }

  // ── Manger ──────────────────────────────────────────────────────────────────
  /**
   * "Gulp" synthétique quand un serpent mange.
   * @param {number} hueVal  0-360 → mappe sur la hauteur du son
   */
  playEat(hueVal) {
    if (!this._ready || !this.enabled) return;
    this._resume();

    let freq = this._map(hueVal, 0, 360, 180, 720);
    let now  = this.ctx.currentTime;

    // Oscillateur principal
    let osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2.2, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.18);

    // 2e oscillateur (harmonique) pour la richesse
    let osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 3.3, now);
    osc2.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.12);

    let filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq * 1.5;
    filter.Q.value = 2.5;

    let gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.32);
    osc2.stop(now + 0.32);
  }

  // ── Grandir ─────────────────────────────────────────────────────────────────
  playGrow() {
    if (!this._ready || !this.enabled) return;
    this._resume();
    let now = this.ctx.currentTime;

    let osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.12);

    let gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ── Burst de particules ──────────────────────────────────────────────────────
  playBurst() {
    if (!this._ready || !this.enabled) return;
    this._resume();
    let now = this.ctx.currentTime;

    // Bruit bref
    let sampleRate = this.ctx.sampleRate;
    let dur = 0.07;
    let buf = this.ctx.createBuffer(1, Math.floor(sampleRate * dur), sampleRate);
    let data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 8);
    }

    let src = this.ctx.createBufferSource();
    src.buffer = buf;

    let filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    let gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    src.start(now);
  }

  // ── Contrôles ────────────────────────────────────────────────────────────────
  setVolume(v) {
    this.volume = v;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(v ? this.volume : 0, this.ctx.currentTime, 0.1);
    }
  }

  stopAll() {
    if (this.ambientOsc)  try { this.ambientOsc.stop();  } catch (_) {}
    if (this.slitherNode) try { this.slitherNode.stop(); } catch (_) {}
  }

  // ── Utilitaire (pas de dépendance à p5) ─────────────────────────────────────
  _map(v, a, b, c, d) {
    return c + (v - a) / (b - a) * (d - c);
  }
}
