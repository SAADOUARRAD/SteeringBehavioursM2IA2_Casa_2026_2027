let vehicles = [];
let mouseTarget;
let autonomousTarget;
let target;
let sceneCanvas;

// Effets sonores
let soundEffects;

// Éléments de contrôle UI
let vehicleCountSlider, vehicleCountValue;
let vitesseMaxSlider, vitesseMaxValue;
let forceMaxSlider, forceMaxValue;
let toggleModeBtn, toggleTargetBtn, toggleVariantBtn;
let toggleSoundBtn;
let bgSelect, bgColorPicker;

// États de la simulation
let currentMode = 'seek'; // 'seek' ou 'flee'
let targetType = 'mouse'; // 'mouse' ou 'autonomous'
let arrivalVariant = 'vehicle'; // 'vehicle' (le véhicule réapparaît) ou 'target' (la cible réapparaît)

// Gestion du fond
let currentBgColor = '#000000';
let bgMode = 'color'; // 'color', 'stars', 'grid'
let stars = [];

function sceneHeight() {
  const controls = document.getElementById('controls');
  return Math.max(1, windowHeight - (controls ? controls.offsetHeight : 0));
}

function initStars() {
  stars = [];
  const count = Math.floor((width * height) / 8000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      r: random(1, 2.5),
      alpha: random(120, 255)
    });
  }
}

// Fonction demandée par les consignes : crée `nb` véhicules suiveurs
function creerVehicules(nb) {
  vehicles = [];
  const maxS = vitesseMaxSlider ? Number(vitesseMaxSlider.value) : 4;
  const maxF = forceMaxSlider ? Number(forceMaxSlider.value) : 0.1;
  for (let i = 0; i < nb; i++) {
    const v = new FollowerVehicle(random(width), random(height));
    v.mode = currentMode;
    v.maxSpeed = maxS;
    v.maxForce = maxF;
    vehicles.push(v);
  }
}

function setup() {
  sceneCanvas = createCanvas(windowWidth, sceneHeight());
  sceneCanvas.parent('scene');

  // Initialisation du gestionnaire de son
  soundEffects = new SoundEffects();

  initStars();

  // Initialisation des cibles (souris et autonome étendant Vehicle)
  mouseTarget = new MouseTarget(width / 2, height / 2);
  autonomousTarget = new Target(width / 2, height / 2);
  target = mouseTarget;

  // Récupération des éléments DOM
  vehicleCountSlider = document.getElementById('vehicle-count');
  vehicleCountValue = document.getElementById('vehicle-count-value');
  vitesseMaxSlider = document.getElementById('vitesse-max');
  vitesseMaxValue = document.getElementById('vitesse-max-value');
  forceMaxSlider = document.getElementById('force-max');
  forceMaxValue = document.getElementById('force-max-value');
  toggleModeBtn = document.getElementById('toggle-mode');
  toggleTargetBtn = document.getElementById('toggle-target');
  toggleVariantBtn = document.getElementById('toggle-variant');
  toggleSoundBtn = document.getElementById('toggle-sound');
  bgSelect = document.getElementById('bg-select');
  bgColorPicker = document.getElementById('bg-color-picker');

  // Création initiale de la population de véhicules
  const initialCount = vehicleCountSlider ? Number(vehicleCountSlider.value) : 20;
  creerVehicules(initialCount);

  // Écouteurs de changement pour les sliders
  if (vehicleCountSlider) {
    vehicleCountSlider.addEventListener('input', () => {
      const targetCount = Number(vehicleCountSlider.value);
      vehicleCountValue.textContent = `${targetCount} / 200`;
      ajusterNombreVehicules(targetCount);
    });
  }

  if (vitesseMaxSlider) {
    vitesseMaxSlider.addEventListener('input', () => {
      vitesseMaxValue.textContent = vitesseMaxSlider.value;
    });
  }

  if (forceMaxSlider) {
    forceMaxSlider.addEventListener('input', () => {
      forceMaxValue.textContent = forceMaxSlider.value;
    });
  }

  // Bascule Mode Seek / Flee
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      currentMode = currentMode === 'seek' ? 'flee' : 'seek';
      toggleModeBtn.textContent = `Mode : ${currentMode === 'seek' ? 'Seek' : 'Flee'}`;
      for (const v of vehicles) v.mode = currentMode;
    });
  }

  // Bascule Cible Souris / Cible Mobile
  if (toggleTargetBtn) {
    toggleTargetBtn.addEventListener('click', () => {
      targetType = targetType === 'mouse' ? 'autonomous' : 'mouse';
      toggleTargetBtn.textContent = `Cible : ${targetType === 'mouse' ? 'Souris' : 'Mobile'}`;
      target = (targetType === 'mouse') ? mouseTarget : autonomousTarget;
    });
  }

  // Bascule de la variante à l'arrivée (qui disparaît et réapparaît ?)
  if (toggleVariantBtn) {
    toggleVariantBtn.addEventListener('click', () => {
      arrivalVariant = arrivalVariant === 'vehicle' ? 'target' : 'vehicle';
      toggleVariantBtn.textContent = arrivalVariant === 'vehicle'
        ? 'Arrivée : Véhicule réapparaît'
        : 'Arrivée : Cible réapparaît';
    });
  }

  // Bouton d'activation/désactivation du son
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', () => {
      const enabled = soundEffects.toggle();
      toggleSoundBtn.textContent = enabled ? '🔊 Son : ON' : '🔇 Son : OFF';
    });
  }

  // Contrôles du fond (presets et sélecteur de couleur personnalisée)
  if (bgSelect) {
    bgSelect.addEventListener('change', () => {
      const val = bgSelect.value;
      if (val === 'stars') {
        bgMode = 'stars';
      } else if (val === 'grid') {
        bgMode = 'grid';
      } else if (val === 'custom') {
        bgMode = 'color';
        if (bgColorPicker) bgColorPicker.click();
      } else {
        bgMode = 'color';
        currentBgColor = val;
        if (bgColorPicker) bgColorPicker.value = val;
      }
    });
  }

  if (bgColorPicker) {
    bgColorPicker.addEventListener('input', () => {
      bgMode = 'color';
      currentBgColor = bgColorPicker.value;
      if (bgSelect) bgSelect.value = 'custom';
    });
  }

  // Initialisation audio sur interaction utilisateur (politique des navigateurs)
  const unlockAudio = () => {
    if (soundEffects) soundEffects.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // Suivi de la souris dans le canvas
  sceneCanvas.elt.addEventListener('pointermove', event => {
    if (targetType !== 'mouse') return;
    const rect = sceneCanvas.elt.getBoundingClientRect();
    const x = (event.clientX - rect.left) * width / rect.width;
    const y = (event.clientY - rect.top) * height / rect.height;
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      mouseTarget.pos.set(x, y);
    }
  });
}

function ajusterNombreVehicules(targetCount) {
  const maxS = vitesseMaxSlider ? Number(vitesseMaxSlider.value) : 4;
  const maxF = forceMaxSlider ? Number(forceMaxSlider.value) : 0.1;
  while (vehicles.length < targetCount) {
    const v = new FollowerVehicle(random(width), random(height));
    v.mode = currentMode;
    v.maxSpeed = maxS;
    v.maxForce = maxF;
    vehicles.push(v);
  }
  if (vehicles.length > targetCount) {
    vehicles.length = targetCount;
  }
}

function drawBackground() {
  if (bgMode === 'stars') {
    background('#080d1a');
    push();
    noStroke();
    for (const s of stars) {
      fill(255, 255, 255, s.alpha);
      circle(s.x, s.y, s.r);
    }
    pop();
  } else if (bgMode === 'grid') {
    background('#0d1117');
    push();
    stroke('rgba(255, 255, 255, 0.08)');
    strokeWeight(1);
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      line(0, y, width, y);
    }
    pop();
  } else {
    background(currentBgColor);
  }
}

function draw() {
  drawBackground();

  // Mise à jour de la cible active
  if (targetType === 'autonomous') {
    autonomousTarget.update();
    target = autonomousTarget;
  } else {
    target = mouseTarget;
  }

  const currentMaxSpeed = Number(vitesseMaxSlider ? vitesseMaxSlider.value : 4);
  const currentMaxForce = Number(forceMaxSlider ? forceMaxSlider.value : 0.1);

  // Traitement pour chaque véhicule
  for (let i = 0; i < vehicles.length; i++) {
    const vehicle = vehicles[i];

    // Mise à jour dynamique des paramètres pilotés par les sliders
    vehicle.maxSpeed = currentMaxSpeed;
    vehicle.maxForce = currentMaxForce;
    vehicle.mode = currentMode;

    // 1. Steering behavior (Seek ou Flee)
    vehicle.applyBehaviors(target.pos);

    // 2. Locomotion
    vehicle.update();

    // 3. Rebouclage aux bords (méthode edges() existante dans Vehicle)
    vehicle.edges();

    // 4. Détection d'atteinte de la cible avec p5.Vector.dist
    const d = p5.Vector.dist(vehicle.pos, target.pos);
    const arrivalThreshold = vehicle.r + target.r;

    if (d <= arrivalThreshold) {
      // Effet sonore d'atteinte de la cible
      if (soundEffects) soundEffects.playImpact();

      if (arrivalVariant === 'target') {
        // Variante : la cible réapparaît aléatoirement
        if (targetType === 'autonomous') {
          autonomousTarget.respawnRandom(width, height);
        } else {
          vehicle.pos.set(random(width), random(height));
          vehicle.vel.set(0, 0);
        }
      } else {
        // Cas standard : le véhicule réapparaît aléatoirement
        vehicle.pos.set(random(width), random(height));
        vehicle.vel.set(0, 0);
      }
    }

    vehicle.show();
  }

  target.show();
}

function windowResized() {
  resizeCanvas(windowWidth, sceneHeight());
  initStars();
  if (mouseTarget) {
    mouseTarget.pos.set(constrain(mouseTarget.pos.x, 0, width), constrain(mouseTarget.pos.y, 0, height));
  }
  for (const vehicle of vehicles) vehicle.edges();
}
