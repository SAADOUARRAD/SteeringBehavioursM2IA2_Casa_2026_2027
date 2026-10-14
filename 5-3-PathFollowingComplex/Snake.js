/**
 * Snake.js
 * Classe représentant un serpent complet composé d'une tête et d'anneaux (SnakeSegment).
 * Hérite de Vehicle et applique les steering behaviors :
 *  - follow() sur sa tête pour suivre le chemin complexe (PathFollowing)
 *  - separate() sur sa tête ET tous ses anneaux pour éviter les véhicules du circuit
 *  - arrive() sur chaque anneau pour suivre le segment précédent
 */
class Snake extends Vehicle {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} length   Nombre d'anneaux (incluant la tête)
   * @param {number} taille   Rayon des anneaux
   * @param {string|p5.Color} couleur Couleur dominante du serpent
   * @param {number} maxSpeed Vitesse de pointe
   * @param {number} maxForce Force motrice max
   */
  constructor(x, y, length = 12, taille = 14, couleur = null, maxSpeed = 3.5, maxForce = 0.4) {
    super(x, y, maxSpeed, maxForce);

    // Palette variée de serpents si non spécifiée
    const palettes = ['#2ecc71', '#e67e22', '#9b59b6', '#3498db', '#e74c3c', '#1abc9c'];
    this.couleur = couleur || palettes[Math.floor(Math.random() * palettes.length)];
    this.taille = taille;
    this.r = taille;
    this.ringSpacing = taille * 1.1;

    // Poids des comportements réglables en temps réel par curseurs
    this.followPathWeight = 2.0;
    this.separateWeight = 2.5;

    // Tableau de tous les anneaux (sous-classes de Vehicle)
    this.anneaux = [];

    // 1. Création de la tête
    this.head = new SnakeSegment(x, y, maxSpeed, maxForce, taille, this.couleur, 0);
    this.anneaux.push(this.head);

    // 2. Création des anneaux corporels
    for (let i = 1; i < length; i++) {
      let segmentX = x - i * this.ringSpacing;
      let segmentY = y;
      let segColor = this._computeSegmentColor(i, length);
      let anneau = new SnakeSegment(segmentX, segmentY, maxSpeed * 1.2, maxForce * 1.5, taille, segColor, i);
      this.anneaux.push(anneau);
    }
  }

  /**
   * Calcule un dégradé de couleur harmonieux de la tête jusqu'au bout de la queue
   */
  _computeSegmentColor(index, total) {
    if (typeof color === 'function' && typeof lerpColor === 'function') {
      let c1 = color(this.couleur);
      let c2 = color(20, 45, 25);
      return lerpColor(c1, c2, map(index, 0, total, 0, 0.7));
    }
    return this.couleur;
  }

  /**
   * Met à jour les poids des forces de pilotage
   * @param {number} followWeight Poids pour le suivi de chemin
   * @param {number} sepWeight    Poids pour la séparation des véhicules
   */
  setWeights(followWeight, sepWeight) {
    if (Number.isFinite(Number(followWeight))) this.followPathWeight = Number(followWeight);
    if (Number.isFinite(Number(sepWeight))) this.separateWeight = Number(sepWeight);
  }

  /**
   * Met à jour la vitesse de déplacement
   * @param {number} speed
   */
  setSpeed(speed) {
    const s = Number(speed);
    if (Number.isFinite(s) && s > 0) {
      this.maxSpeed = s;
      for (let anneau of this.anneaux) {
        anneau.maxSpeed = (anneau === this.head) ? s : s * 1.25;
      }
    }
  }

  /**
   * Applique les comportements de pilotage :
   * - Tête : follow(path) + separate(vehicles)
   * - Anneaux : arrive(précédent) + separate(vehicles)
   *
   * @param {Vehicle[]} vehicles  Liste des véhicules du monde (pour la séparation)
   * @param {Path} path           Chemin complexe à suivre
   */
  applyBehaviors(vehicles, path) {
    // 1. Pilotage de la tête
    let fFollow = this.head.follow(path);
    let sHead = this.head.separate(vehicles);

    fFollow.mult(this.followPathWeight);
    sHead.mult(this.separateWeight);

    this.head.applyForce(fFollow);
    this.head.applyForce(sHead);
    this.head.update();
    this.head.edges();

    // Synchronisation de la position globale du Snake avec sa tête
    this.pos = this.head.pos.copy();
    this.vel = this.head.vel.copy();

    // 2. Pilotage de chaque anneau : arrive vers l'anneau précédent + séparation des véhicules
    for (let i = 1; i < this.anneaux.length; i++) {
      let anneau = this.anneaux[i];
      let cible = this.anneaux[i - 1].pos;

      // Suivi de l'anneau précédent avec arrivée progressive
      let fArrive = anneau.arrive(cible, this.ringSpacing, 60);

      // Séparation des véhicules pour ne jamais se superposer aux bolides du circuit
      let sRing = anneau.separate(vehicles);
      sRing.mult(this.separateWeight);

      anneau.applyForce(fArrive);
      anneau.applyForce(sRing);
      anneau.update();
      anneau.edges();
    }
  }

  /**
   * Exécution et affichage complet
   * @param {boolean} isDebug
   */
  run(isDebug = false) {
    this.show(isDebug);
  }

  /**
   * Affiche le serpent (les anneaux de l'arrière vers l'avant, puis la tête expressive)
   * @param {boolean} isDebug
   */
  show(isDebug = false) {
    const total = this.anneaux.length;

    // Dessin des anneaux de la queue vers l'avant (superposition propre)
    for (let i = total - 1; i >= 1; i--) {
      this.anneaux[i].renderSegment(total, isDebug);
    }

    // Dessin de la tête par-dessus
    let fCount = (typeof frameCount !== 'undefined') ? frameCount : 0;
    this.head.renderHead(isDebug, fCount);
  }

  /**
   * Renvoie tous les segments du serpent (pour tests ou interactions multi-entités)
   * @returns {SnakeSegment[]}
   */
  getSegments() {
    return this.anneaux;
  }
}
