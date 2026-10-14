/**
 * MotoAudio.js
 * Moteur sonore dédié aux motos de course et avertisseurs sonores (klaxons),
 * entièrement synthétisé via l'API Web Audio (100% autonome, zéro dépendance externe).
 *
 * Fonctionnalités audio :
 *  - Son de moteur GP 4-temps en temps réel modulé selon la vitesse et les RPM
 *  - Hurlement d'accélération et retours d'échappement (backfire) lors des freinages
 *  - Klaxon bi-ton puissant (dual-tone racing horn) déclenchable manuellement ou en cas de dépassement critique
 *  - Effet sonore de turbine / post-combustion Nitro Boost
 */
class MotoAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    this.enabled = true;
    this.volume = 0.45;
    this._ready = false;

    // Dernière note de klaxon pour anti-rebond
    this.lastHornTime = 0;
  }

  /**
   * Initialise le contexte audio après un geste utilisateur (clic ou frappe clavier)
   */
  init() {
    if (this._ready) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this._setupEngineSound();
      this._ready = true;
    } catch (e) {
      console.warn('Web Audio indisponible :', e.message);
    }
  }

  /**
   * Synthèse continue du son de moteur de moto de course
   */
  _setupEngineSound() {
    if (!this.ctx) return;

    // 1. Oscillateur principal (forme en dent de scie pour le mordant des cylindres)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(85, this.ctx.currentTime);

    // 2. Deuxième oscillateur (harmonique d'échappement)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(170, this.ctx.currentTime);

    // 3. Filtre passe-bas résonant simulant la boîte à air et l'échappement
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.value = 3.5;

    // 4. Contrôle de gain du moteur
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    // Câblage audio
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  /**
   * Met à jour le régime moteur (RPM et filtre) en fonction de la vitesse des motos
   * @param {number} topSpeed    Vitesse de la moto la plus rapide (2 à 10)
   * @param {boolean} isNitro    Indique si un boost nitro est actif
   * @param {boolean} isBraking  Indique un freinage appuyé
   */
  updateEngine(topSpeed = 4, isNitro = false, isBraking = false) {
    if (!this._ready || !this.enabled || !this.engineOsc1) return;

    let now = this.ctx.currentTime;

    // Calcul de la fréquence fondamentale (régime moteur entre 70 Hz au ralenti et 380 Hz à fond)
    let targetFreq = 70 + topSpeed * 35;
    if (isNitro) targetFreq *= 1.45;
    if (isBraking) targetFreq *= 0.8;

    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2.02, now, 0.08);

    // Le filtre s'ouvre avec la vitesse pour donner le son rugissant des hauts régimes
    let filterFreq = 300 + topSpeed * 220;
    if (isNitro) filterFreq = 4500;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);

    // Ajustement subtil du volume moteur selon l'effort
    let engVol = map(topSpeed, 0, 10, 0.03, 0.08);
    if (isNitro) engVol = 0.12;
    this.engineGain.gain.setTargetAtTime(engVol, now, 0.05);
  }

  /**
   * Joue le klaxon de moto (bi-ton agressif caractéristique 420 Hz + 530 Hz)
   */
  playKlaxon() {
    if (!this._ready || !this.enabled) return;

    let now = this.ctx.currentTime;
    // Anti-rebond (au moins 250ms entre deux coups de klaxon)
    if (now - this.lastHornTime < 0.25) return;
    this.lastHornTime = now;

    // Deux fréquences combinées formant l'accord caractéristique du klaxon italien/sport
    let f1 = 430; // Ton grave
    let f2 = 540; // Ton aigu

    let oscA = this.ctx.createOscillator();
    let oscB = this.ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'triangle';

    oscA.frequency.setValueAtTime(f1, now);
    oscB.frequency.setValueAtTime(f2, now);

    let hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'bandpass';
    hornFilter.frequency.setValueAtTime(650, now);
    hornFilter.Q.value = 2.0;

    let hornGain = this.ctx.createGain();
    let duration = 0.22; // Coup sec de 220ms
    hornGain.gain.setValueAtTime(0.3, now);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscA.connect(hornFilter);
    oscB.connect(hornFilter);
    hornFilter.connect(hornGain);
    hornGain.connect(this.masterGain);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + duration + 0.05);
    oscB.stop(now + duration + 0.05);
  }

  /**
   * Bruit de retour d'échappement / coup de gaz (backfire)
   */
  playBackfire() {
    if (!this._ready || !this.enabled) return;

    let now = this.ctx.currentTime;
    let sampleRate = this.ctx.sampleRate;
    let dur = 0.08;
    let buf = this.ctx.createBuffer(1, Math.floor(sampleRate * dur), sampleRate);
    let data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
    }

    let src = this.ctx.createBufferSource();
    src.buffer = buf;

    let filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;

    let gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  /**
   * Réglage du volume général (0.0 à 1.0)
   */
  setVolume(vol) {
    this.volume = constrain(vol, 0, 1);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Activation / coupure du son
   */
  setEnabled(state) {
    this.enabled = !!state;
    if (this.masterGain && this.ctx) {
      let target = this.enabled ? this.volume : 0;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }
}
