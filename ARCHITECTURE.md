# Architecture du dépôt

Ce dépôt regroupe de petits exemples autonomes de steering behaviors avec p5.js. Chaque dossier numéroté correspond à un exemple ou à sa correction. Les consignes de développement complètes sont dans [`AGENTS.md`](AGENTS.md).

## Frontières du code

### `vehicle.js` : code fourni et protégé

Les fichiers `vehicle.js` fournissent le modèle de véhicule utilisé par les exemples : état (position, vitesse, accélération), paramètres de vitesse et de force, comportements déjà disponibles, application des forces, locomotion et dessin.

**Ne pas modifier un fichier `vehicle.js` sans demander d'abord l'accord explicite de l'utilisateur.** Ce code a été fourni et doit en principe rester inchangé. Ne pas dupliquer ses comportements ni remplacer sa logique interne.

Pour étendre un exemple, créer une sous-classe distincte de `Vehicle` pour chaque entité identifiée (par exemple joueur, ennemi ou véhicule spécialisé). La sous-classe peut réutiliser les méthodes existantes et ajouter des comportements. Elle doit produire des forces avec la loi `steering = vitesseDésirée - vitesseActuelle`, respecter `maxForce`, puis utiliser `applyForce`; la mise à jour de la locomotion reste celle du véhicule de base.

### Classes d'entité

Créer un fichier séparé par type d'entité, dans le dossier de l'exemple concerné : par exemple `Player.js`, `Enemy.js`, `Target.js` et `TargetFuyante.js`. Ne pas regrouper plusieurs types d'entités dans un fichier. 

**Règle fondamentale :** Toute entité visible, même si elle paraît statique ou sert de cible, étend obligatoirement `Vehicle`. Ne créer aucune classe d'objet visible indépendante de `Vehicle`. Tous les objets graphiques se déplacent exclusivement en appliquant des forces via `applyForce()` et en mettant à jour leur cinématique par la locomotion `update()`. Aucune téléportation manuelle ou assignation directe de coordonnées ne doit remplacer le steering.

### Comportements et composition

Garder chaque comportement indépendant, réutilisable et testable. Les entités ou le code de l'exemple combinent les forces avec une somme pondérée ou une règle de priorité. Distinguer l'objectif choisi, le calcul des forces de steering et l'application des forces par la locomotion.

## Tests

Chaque nouvelle fonctionnalité d'un exemple doit être accompagnée de tests unitaires pertinents, exécutés avant de présenter la modification comme terminée. Consulter [`AGENTS.md`](AGENTS.md) pour les attentes de couverture, la reproductibilité de l'aléatoire et la communication du résultat des tests.
