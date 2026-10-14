# Seek — population de véhicules

Ouvrir `index.html` dans un navigateur (ou servir ce dossier avec un serveur HTTP local).

- 20 véhicules au démarrage, réglables de 1 à 200 avec le slider, pendant le glissement.
- La cible est une instance autonome de `Target` ; son rayon et sa position varient pendant la simulation.
- L'arrivée est détectée quand les disques du véhicule et de la cible se touchent (`distance <= vehicle.r + target.r`).
- Le fond est un dégradé radial arc-en-ciel animé, avec réglages de vitesse et d'intensité.
- Le bouton « Activer la musique et les effets » démarre la synthèse FM et les effets WebAudioX. « Couper la musique et les effets » met tout le mix à zéro, arrête et déconnecte toutes les sources, puis ferme le contexte audio. Une nouvelle activation crée un nouveau contexte. Aucun son n'est produit avant le premier clic.
- Déplacer la souris dans le canvas entraîne progressivement le centre du dégradé : X fait varier le cutoff (120–8000 Hz), Y la hauteur (360 Hz en haut, 90 Hz en bas). X pilote aussi la FM lente (1–10 Hz) et sa profondeur. Le centre continue d'osciller autour du pointeur avec la vitesse du dégradé.
- Les couleurs, la luminosité et le rayon du dégradé suivent le signal du modulateur Web Audio lu par un analyseur. Quand le son est coupé, le dégradé garde son animation autonome sans modulation FM.
- Les véhicules réapparaissent au bord opposé grâce à `Vehicle.edges()`.
- Quand les disques du véhicule et de la cible se touchent (`distance <= vehicle.r + target.r`), le véhicule réapparaît ailleurs avec une vitesse et une accélération nulles.
- Les véhicules conservés lors d'un changement d'effectif gardent leur état.

Les effets de jeu sont générés par [WebAudioX/jsfx](https://github.com/jeromeetienne/webaudiox) dans `effectsAudio.js`. Le son de fuite boucle indépendamment pour chaque cible et s'arrête avec son état ; un sweep synthétique monte progressivement du grave vers l'aigu selon l'endurance consommée ; l'alarme dure 0,4 s et est limitée à une lecture par cible et par seconde ; les explosions durent 0,7 s. `playDecoyRelease()` est prêt pour le futur événement de largage de leurres, qui n'existe pas encore dans ce projet G1.

Les curseurs `Volume musique` et `Volume effets` règlent séparément les deux bus audio en temps réel. Le volume par défaut des effets est supérieur à celui de la musique pour garder les alarmes et les sweeps audibles.

Les alarmes et les sweeps sont actifs dans le scénario 2 ; dans le scénario 1, seuls les contacts produisent des explosions. La synchronisation audio crée une source pour chaque cible actuellement en fuite, même si le son est activé en cours de fuite. Elle arrête aussi les sources des cibles supprimées ou devenues inactives. Les tests vérifient ces transitions et le signal des buffers produits par les vrais scripts WebAudioX/jsfx (29 tests au total).

`vehicle.js` reste inchangé. `Target` conserve son animation aléatoire, désormais pilotée par les forces héritées de `seek()` et une horloge locale sans timer permanent. La population est gérée dans `population.js`, la scène et le fond dans `sketch.js`, et la synthèse audio dans `audio.js`.

## Tests

Depuis ce dossier, avec Node.js (18 ou plus) :

```sh
node --test tests/*.test.mjs
```

Aucune dépendance à installer. Les tests exécutent le vrai `vehicle.js` avec un adaptateur vectoriel minimal et un aléatoire déterministe. La validation du rendu avec p5 et du glissement réel se fait également dans le navigateur.

Les 27 tests Node couvrent aussi les mappings audio, l'arrêt/redémarrage du moteur, la sélection multi-cibles et les durées/cooldowns des effets. Pour mesurer le vrai signal Web Audio, ouvrir `tests/audio-browser.html` et cliquer « Exécuter les tests audio ». Cette page vérifie le signal actif, la fermeture du contexte, le redémarrage, le silence du mix (RMS nul), les variations du filtre/pitch/FM et la lecture du modulateur par les couleurs. Les tests arrêtent leur audio en fin d'exécution.

La [spécification](EXO1_SPECIFICATION.md) décrit les règles, le workflow et les cas limites. Elle constitue le document de conception initial ; l'implémentation et les tests sont maintenant présents.

## Deux scénarios

Le menu « Scénario » propose :

1. **Suivi de cible et réapparition** : comportement initial. Les véhicules utilisent `seek()`, rebouclent aux bords et réapparaissent aléatoirement au contact, avec la même instance et les mêmes paramètres. Le test de contact tient compte de la somme des rayons.
2. **La cible fuit les vaisseaux** : `TargetFutante extends Target`, donc une sous-classe de `Vehicle`, dans `targetFutante.js`. La cible détecte le véhicule le plus proche à 200 px ou moins, double sa vitesse maximale et multiplie sa force maximale par quatre. Elle appelle la méthode héritée `super.flee()` et reprend son comportement normal lorsque tous les prédateurs sont à au moins 300 px, ou après 2,5 secondes de fuite.

Le scénario 2 affiche trois curseurs en temps réel : rayon de détection (50–500 px), distance de sécurité (100–800 px) et durée maximale (0,5–10 s). La distance de sortie reste strictement supérieure au rayon de déclenchement ; l'UI reflète les ajustements nécessaires. Les distances sont mesurées entre centres et ne constituent pas des distances toriques à travers les bords.

Le curseur **Cibles** règle en temps réel le nombre de cibles entre 1 et 30, avec 4 par défaut. Les deux scénarios conservent des collections parallèles de cibles ; chaque véhicule choisit à chaque image la cible dont le centre est le plus proche.

Une barre d'endurance est affichée au-dessus de la cible dans le scénario 2. Elle décroît pendant la fuite et reste vide après épuisement. Une cible épuisée reprend son animation normale ; elle ne peut réarmer sa fuite qu'après retour de tous les prédateurs hors de la distance de sécurité. Cela évite d'enchaîner des épisodes à l'infini sans respecter la durée maximale.

La touche **D** ou la case **Debug** active les vecteurs de vitesse et le cercle de détection. Le cercle est jaune sans prédateur détecté, rouge lorsqu'au moins un est à portée. Il reste caché hors debug. Les paramètres de mouvement, la population, le dégradé et la musique restent disponibles dans les deux scénarios.

Changer de scénario restaure les limites normales, vide la référence de menace et remet l'endurance à 1 ; les véhicules ne sont pas recréés. La génération de véhicules par slider consulte toujours la cible active. `scenarios.js` porte cette sélection, `seekVehicle.js` le rendu debug, et `targetFutante.js` la perception et les états.

Validation : `node --test 1-Seek/tests/*.test.mjs` depuis la racine, **27 tests réussis**. Vérifications Chrome réalisées avec le vrai p5.js : menu, sliders, réapparition, debug, endurance à 50 %, sortie à la distance exacte, épuisement, absence de réarmement immédiat et retour au scénario initial, sans erreur JavaScript.
