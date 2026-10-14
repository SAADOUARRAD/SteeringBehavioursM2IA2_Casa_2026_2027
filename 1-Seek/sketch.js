let target;
let scenarios;
let debugMode = false;
const vehicles = [];
let sceneCanvas;
let gradientSpeed = 0.35;
let gradientDepth = 0.75;
const audioEngine = new PsychedelicAudio();
const effectsAudio = new SeekEffectsAudio();
const gradientCenter = { x: 0.5, y: 0.5 };
const ambiencePointer = { x: 0.5, y: 0.5 };
let ambienceTime = 0;

function sceneHeight() {
  return Math.max(1, windowHeight - document.getElementById('controls').offsetHeight);
}

function setup() {
  sceneCanvas = createCanvas(windowWidth, sceneHeight());
  sceneCanvas.parent('scene');
  scenarios = new SeekScenarios(new Target(width / 2, height / 2), new TargetFutante(width / 2, height / 2));
  scenarios.setTargetCount(4, width, height);
  target = scenarios.target;
  document.getElementById('vehicle-count').value = SeekPopulation.INITIAL_COUNT;
  bindControls();
  sceneCanvas.elt.addEventListener('pointermove', event => {
    const rect = sceneCanvas.elt.getBoundingClientRect();
    ambiencePointer.x = SeekAmbience.clamp((event.clientX - rect.left) / rect.width);
    ambiencePointer.y = SeekAmbience.clamp((event.clientY - rect.top) / rect.height);
  });
  window.addEventListener('pagehide', () => { void audioEngine.stop(); });
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.1);
  ambienceTime += dt * gradientSpeed;
  // Le centre intérieur se déplace continuellement et se rapproche du pointeur.
  const ease = 1 - Math.exp(-dt * 4);
  const desiredX = 0.08 + 0.84 * ambiencePointer.x + 0.07 * Math.sin(ambienceTime * 2.1);
  const desiredY = 0.08 + 0.84 * ambiencePointer.y + 0.07 * Math.cos(ambienceTime * 1.7);
  gradientCenter.x += (desiredX - gradientCenter.x) * ease;
  gradientCenter.y += (desiredY - gradientCenter.y) * ease;
  audioEngine.update(gradientCenter.x, gradientCenter.y, ambiencePointer.x);
  drawPsychedelicGradient(audioEngine.modulation());
  scenarios.update(vehicles, deltaTime);
  target = scenarios.target;
  effectsAudio.synchronizeTargets(scenarios.targets);
  for (const sceneTarget of scenarios.targets) sceneTarget.edges();
  SeekVehicle.debug = debugMode;
  for (const vehicle of vehicles) {
    const result = SeekPopulation.step(vehicle, scenarios.targets, width, height);
    if (result?.arrived) effectsAudio.playExplosion();
    vehicle.show();
  }
  for (const sceneTarget of scenarios.targets) sceneTarget.show(debugMode);
}

function bindControls() {
  bindScenarioControls();
  const countSlider = document.getElementById('vehicle-count');
  const targetCountSlider = document.getElementById('target-count');
  const maxSpeedSlider = document.getElementById('max-speed');
  const maxForceSlider = document.getElementById('max-force');
  const gradientSpeedSlider = document.getElementById('gradient-speed');
  const gradientDepthSlider = document.getElementById('gradient-depth');
  const musicVolumeSlider = document.getElementById('music-volume');
  const effectsVolumeSlider = document.getElementById('effects-volume');
  SeekPopulation.bindSlider(countSlider, document.getElementById('vehicle-count-value'),
    vehicles, () => scenarios.targets, () => ({ width, height }), (x, y) => {
      const vehicle = new SeekVehicle(x, y);
      vehicle.maxSpeed = Number(maxSpeedSlider.value);
      vehicle.maxForce = Number(maxForceSlider.value);
      return vehicle;
    });
  const synchronizeTargetCount = () => {
    scenarios.setTargetCount(Number(targetCountSlider.value), width, height);
    target = scenarios.target;
    document.getElementById('target-count-value').value = `${scenarios.targets.length} / 30`;
    for (const sceneTarget of scenarios.targets) sceneTarget.edges();
  };
  targetCountSlider.addEventListener('input', synchronizeTargetCount);
  synchronizeTargetCount();
  const synchronizeLimits = () => {
    const maxSpeed = Number(maxSpeedSlider.value);
    const maxForce = Number(maxForceSlider.value);
    SeekPopulation.setLimits(vehicles, maxSpeed, maxForce);
    document.getElementById('max-speed-value').value = maxSpeed.toFixed(1);
    document.getElementById('max-force-value').value = maxForce.toFixed(2);
  };
  maxSpeedSlider.addEventListener('input', synchronizeLimits);
  maxForceSlider.addEventListener('input', synchronizeLimits);
  synchronizeLimits();
  const synchronizeGradient = () => {
    gradientSpeed = Number(gradientSpeedSlider.value);
    gradientDepth = Number(gradientDepthSlider.value);
    document.getElementById('gradient-speed-value').value = gradientSpeed.toFixed(2);
    document.getElementById('gradient-depth-value').value = gradientDepth.toFixed(2);
  };
  gradientSpeedSlider.addEventListener('input', synchronizeGradient);
  gradientDepthSlider.addEventListener('input', synchronizeGradient);
  synchronizeGradient();
  const synchronizeVolumes = () => {
    const musicVolume = Number(musicVolumeSlider.value);
    const effectsVolume = Number(effectsVolumeSlider.value);
    audioEngine.setVolume(musicVolume);
    effectsAudio.setVolume(effectsVolume);
    document.getElementById('music-volume-value').value = musicVolume.toFixed(2);
    document.getElementById('effects-volume-value').value = effectsVolume.toFixed(2);
  };
  musicVolumeSlider.addEventListener('input', synchronizeVolumes);
  effectsVolumeSlider.addEventListener('input', synchronizeVolumes);
  synchronizeVolumes();
  document.getElementById('audio-toggle').addEventListener('click', toggleAudio);
}

function drawPsychedelicGradient(fm) {
  const ctx = drawingContext;
  const cx = gradientCenter.x * width;
  const cy = gradientCenter.y * height;
  const radius = Math.hypot(width, height) * (0.65 + 0.04 * fm);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (let i = 0; i <= 12; i++) {
    const fraction = i / 12;
    const hue = ((ambienceTime * 65 + fraction * 540 + fm * 70) % 360 + 360) % 360;
    const lightness = 18 + gradientDepth * (25 + 20 * (1 - fraction) + 5 * fm);
    gradient.addColorStop(fraction, `hsl(${hue}, 92%, ${lightness}%)`);
  }
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

async function toggleAudio() {
  const button = document.getElementById('audio-toggle');
  if (button.disabled) return;
  button.disabled = true;
  try {
    if (audioEngine.running) {
      effectsAudio.detach();
      await audioEngine.stop();
    } else {
      await audioEngine.start();
      effectsAudio.attach(audioEngine.context);
    }
    button.textContent = audioEngine.running ? 'Couper la musique et les effets' : 'Activer la musique et les effets';
    button.setAttribute('aria-pressed', String(audioEngine.running));
  } catch (error) {
    button.textContent = 'Réessayer la musique et les effets';
    button.setAttribute('aria-pressed', 'false');
    console.error('Impossible de démarrer la musique :', error);
  } finally {
    button.disabled = false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, sceneHeight());
  for (const sceneTarget of scenarios.targets) {
    sceneTarget.pos.set(constrain(sceneTarget.pos.x, 0, width), constrain(sceneTarget.pos.y, 0, height));
  }
  for (const vehicle of vehicles) vehicle.edges();
}

function bindScenarioControls() {
  const modeSelect = document.getElementById('scenario');
  modeSelect.addEventListener('change', () => {
    scenarios.setMode(modeSelect.value);
    target = scenarios.target;
    document.getElementById('flee-controls').hidden = scenarios.mode !== 'flee';
    windowResized();
  });
  const fields = [
    ['detection-radius', 'detectionRadius'],
    ['exit-distance', 'exitDistance'],
    ['flee-duration', 'maxFleeDuration']
  ];
  for (const [id, setting] of fields) {
    const input = document.getElementById(id);
    const update = () => {
      scenarios.fleeingTargets.forEach(sceneTarget =>
        sceneTarget.setFleeSettings({ [setting]: Number(input.value) }));
      for (const [fieldId, parameter] of fields) {
        const value = scenarios.fleeingTarget[parameter];
        document.getElementById(fieldId).value = value;
        document.getElementById(fieldId + '-value').value = value + (parameter === 'maxFleeDuration' ? ' s' : ' px');
      }
    };
    input.addEventListener('input', update);
  }
  const checkbox = document.getElementById('debug');
  const setDebug = value => { debugMode = value; SeekVehicle.debug = value; checkbox.checked = value; };
  checkbox.addEventListener('change', () => setDebug(checkbox.checked));
  document.addEventListener('keydown', event => {
    const textField = event.target.matches?.('input[type="text"], input[type="number"], textarea');
    if (event.key.toLowerCase() === 'd' && !event.repeat && !textField) setDebug(!debugMode);
  });
}
