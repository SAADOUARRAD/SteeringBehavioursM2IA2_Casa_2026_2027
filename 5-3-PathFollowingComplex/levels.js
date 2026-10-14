/**
 * levels.js
 * Gestion des niveaux et circuits de course pour 5-3-PathFollowingComplex.
 *
 * 4 Niveaux progressifs :
 *  - Niveau 1 : Speedway Oval (Daytona) — Rapide, grandes courbes
 *  - Niveau 2 : Grand Prix Pro (Monza) — Chicanes serrées, épingles et grandes lignes droites
 *  - Niveau 3 : Circuit Urbain Nocturne (Monaco) — Virages urbains techniques, ambiance nuit
 *  - Niveau 4 : Circuit Double-Boucle (Figure 8) — Piste croisée requérant une forte séparation
 */

const RACING_LEVELS = [
  {
    id: 1,
    name: 'Niveau 1 — Speedway Débutant (Daytona)',
    difficulty: '🟢 Débutant',
    description: 'Anneau de vitesse haute fluidité avec deux virages paraboliques larges.',
    radius: 32,
    asphaltColor: [32, 36, 44],
    curbColors: ['#e74c3c', '#ffffff'],
    laneMarkings: true,
    buildPath(w, h) {
      let p = new Path();
      p.radius = this.radius;
      let cx = w / 2;
      let cy = h / 2;
      let rx = w * 0.38;
      let ry = h * 0.28;
      let segments = 24;
      for (let i = 0; i < segments; i++) {
        let a = (i * TWO_PI) / segments;
        // Ovalisation douce
        let px = cx + Math.cos(a) * rx;
        let py = cy + Math.sin(a) * ry;
        p.addPoint(px, py);
      }
      return p;
    }
  },
  {
    id: 2,
    name: 'Niveau 2 — Grand Prix Pro (Monza / Chicanes)',
    difficulty: '🟡 Intermédiaire',
    description: 'Enchaînement de chicanes en S, virages en épingle et lignes droites.',
    radius: 26,
    asphaltColor: [24, 28, 36],
    curbColors: ['#e67e22', '#ffffff'],
    laneMarkings: true,
    buildPath(w, h) {
      let p = new Path();
      p.radius = this.radius;
      let cx = w / 2;
      let cy = h / 2;
      let minD = Math.min(w, h);
      let rBase = minD * 0.36;
      let segments = 32;

      for (let i = 0; i < segments; i++) {
        let a = (i * TWO_PI) / segments;
        // Modulation avec chicanes
        let wave = Math.sin(a * 4) * (minD * 0.09) + Math.cos(a * 2) * (minDim(w, h) * 0.05);
        let r = rBase + wave;
        let px = cx + Math.cos(a) * r;
        let py = cy + Math.sin(a) * r;
        p.addPoint(px, py);
      }
      return p;
    }
  },
  {
    id: 3,
    name: 'Niveau 3 — Circuit Urbain Nocturne (Monaco)',
    difficulty: '🔴 Pro',
    description: 'Ruelles étroites, virages serrés à 90° et éclairage nocturne au sol.',
    radius: 22,
    asphaltColor: [16, 20, 28],
    curbColors: ['#00d2d3', '#10ac84'],
    laneMarkings: true,
    buildPath(w, h) {
      let p = new Path();
      p.radius = this.radius;
      let marginX = w * 0.12;
      let marginY = h * 0.14;
      let innerX = w * 0.38;
      let innerY = h * 0.42;

      // Circuit urbain rectangulaire complexe avec chicanes intérieures
      const pts = [
        [marginX, marginY],
        [w * 0.5, marginY * 0.9],
        [w - marginX, marginY],
        [w - marginX, h * 0.4],
        [w - innerX, h * 0.42],
        [w - innerX, h * 0.65],
        [w - marginX, h * 0.7],
        [w - marginX, h - marginY],
        [w * 0.6, h - marginY * 0.9],
        [w * 0.48, h - marginY * 1.3],
        [w * 0.38, h - marginY * 0.9],
        [marginX, h - marginY],
        [marginX, h * 0.55],
        [marginX * 1.8, h * 0.45],
        [marginX, h * 0.35]
      ];

      for (let [x, y] of pts) {
        p.addPoint(x, y);
      }
      return p;
    }
  },
  {
    id: 4,
    name: 'Niveau 4 — Circuit Double-Boucle (Figure 8)',
    difficulty: '🟣 Expert',
    description: 'Tracé croisé en huit : séparation obligatoire à l\'intersection centrale !',
    radius: 24,
    asphaltColor: [22, 24, 30],
    curbColors: ['#e74c3c', '#f1c40f'],
    laneMarkings: true,
    buildPath(w, h) {
      let p = new Path();
      p.radius = this.radius;
      let cx = w / 2;
      let cy = h / 2;
      let scaleX = w * 0.38;
      let scaleY = h * 0.32;
      let segments = 36;

      // Courbe de Bernoulli (Lemniscate / Figure en huit)
      for (let i = 0; i < segments; i++) {
        let t = (i * TWO_PI) / segments;
        let denom = 1 + Math.sin(t) * Math.sin(t);
        let px = cx + (scaleX * Math.cos(t)) / denom;
        let py = cy + (scaleY * Math.sin(t) * Math.cos(t)) / denom;
        p.addPoint(px, py);
      }
      return p;
    }
  }
];

function minDim(w, h) {
  return Math.min(w, h);
}
