# 🏎️ AI AUTONOMOUS RACING LAB
## Neuro-Évolution & Steering Behaviors Simulator — Projet 9B

> **Cours : Intelligence Artificielle Réactive — 5IIR**  
> Inspiré de l'article de Craig W. Reynolds, *Steering Behaviors for Autonomous Characters* (GDC 1999)

---

## 🎮 C'est quoi ce projet ?

Ce projet est une **simulation de voitures autonomes qui apprennent toutes seules à conduire** sur un circuit de course, sans jamais être programmées avec des règles de conduite.

Elles apprennent par **essais et erreurs**, exactement comme un humain qui apprend à conduire : elles font des erreurs, se plantent dans les murs, mais à chaque génération elles deviennent un peu meilleures. Au bout de quelques dizaines de générations, elles pilotent parfaitement.

**La magie :** personne ne leur a dit "tourne à gauche ici" ou "freine dans ce virage". Elles ont *découvert* ces comportements elles-mêmes, guidées uniquement par la récompense d'aller le plus loin possible.

---

## 🧠 Le Concept Fondamental — Comment fonctionne l'IA ?

Le pipeline complet de l'IA suit **6 étapes à chaque image** (60 fois par seconde) :

```
👁️ CAPTEURS       →    🧠 RÉSEAU         →    🚗 VOITURE
(LiDAR / Rayons)       (Neurones)              (Steering / Vitesse)
      ↓                     ↓                        ↓
  Distances             Décision               Se déplace
  aux murs              [gauche/droite,         sur la piste
                         accélérer/freiner]
      ↑___________________FITNESS_____________________|
                   (Score = récompense)
                          ↓
               🔬 ALGORITHME GÉNÉTIQUE
               Sélection → Mutation → Nouvelle génération
```

### Étape 1 — Les Yeux de la Voiture : Rayons LiDAR 📡

Chaque voiture est équipée de **5 à 15 rayons laser** qui partent de sa position et mesurent la distance jusqu'aux murs dans différentes directions (champ de vision de ~135°).

- Rayon retourne **1.0** → voie dégagée, aucun obstacle devant
- Rayon retourne **0.1** → mur tout proche, danger immédiat 🔴
- Rayon retourne **0.5** → obstacle à mi-distance 🟡

Ces mesures constituent les **entrées (inputs)** du réseau de neurones.

### Étape 2 — Le Cerveau : Réseau de Neurones Artificiel 🧠

Le réseau a une topologie configurable, par exemple **`5 → 10 → 6 → 2`** :

| Couche | Neurones | Rôle |
|--------|----------|------|
| **Input** | 5 (= nb rayons) | Reçoit les distances LiDAR |
| **Cachée 1** | 10 | Détecte des patterns complexes |
| **Cachée 2** | 6 | Combine les patterns |
| **Output** | 2 | [Braquage, Accélération] |

Chaque connexion entre neurones a un **poids synaptique** (un nombre entre -1 et +1). C'est la combinaison de ces milliers de poids qui définit le comportement de conduite de la voiture.

> **Exemple concret :** Si les rayons de gauche retournent 0.1 (mur proche), le réseau apprend à activer une forte sortie "tourner à droite" pour éviter le mur.

### Étape 3 — L'Action : Steering Behaviors (Reynolds)

Les 2 sorties du réseau sont directement traduits en forces physiques :

```
Output[0] → Δangle (braquage gauche/droite)
Output[1] → Accélération (avancer/freiner)
```

Ces forces sont appliquées via `applyForce()` sur le modèle de locomotion de Reynolds :

```
Steering Force = Desired Velocity − Current Velocity
```

La voiture ne peut **jamais se téléporter** — elle obéit à la physique du modèle véhicule.

### Étape 4 — La Récompense : Fitness Score 🏆

À la mort de chaque voiture (crash ou timeout), on calcule son score de **fitness** :

```
Fitness = (checkpoints franchis × bonus)
        + (bonus de proximité au prochain checkpoint)
        + (vitesse moyenne × 5)
```

Les voitures qui vont loin ont un score élevé → elles ont plus de chances de se reproduire.

### Étape 5 — La Sélection : Algorithme Génétique 🔬

Une fois que **toutes les voitures sont mortes**, une nouvelle génération est créée :

1. **Élitisme** → Le meilleur conducteur (champion) est copié tel quel dans la génération suivante sans aucune modification
2. **Sélection par tournoi** → On tire 5 voitures au hasard, la meilleure devient parent
3. **Mutation gaussienne** → Les poids synaptiques du parent sont légèrement perturbés aléatoirement

```
Nouveau poids = Ancien poids + N(0, MUTATION_AMOUNT)    [si random < MUTATION_RATE]
```

### Étape 6 — L'Évolution : Génération après Génération

La courbe du graphe de fitness monte génération après génération. C'est la **preuve mathématique que l'IA apprend**.

---

## 🚀 Lancer le Projet

### Prérequis
- Un navigateur moderne (Chrome, Firefox, Edge)
- Aucune installation nécessaire (tout tourne en JavaScript côté client)

### Démarrage en 2 secondes
```bash
# Option 1 : ouvrir directement
Double-clic sur index.html

# Option 2 : serveur local (recommandé)
npx serve .
# puis ouvrir http://localhost:3000
```

### ⚡ Démo Instantanée
Cliquez sur **`⚡ DÉMO CHAMPION`** dans l'interface pour charger immédiatement un champion pré-entraîné qui pilote parfaitement sans attendre 15 générations.

---

## 🎛️ Interface Utilisateur

L'interface est organisée en **dashboard de laboratoire IA** :

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏎️ AI AUTONOMOUS RACING LAB    GEN: 14    ALIVE: 18/30   ARCH: 5→10→6→2  │
├─────────────────┬──────────────────────────────┬────────────────────┤
│                 │                              │                    │
│  🎛️ AI CONFIG   │     CIRCUIT DE COURSE        │  🧠 BRAIN          │
│                 │                              │  VISUALIZER        │
│  • Capteurs     │    🚗 voitures en piste       │                    │
│  • Réseau       │    📡 rayons LiDAR            │  ●──●──●           │
│  • Génétique    │    ⚡ champion (vert)          │  ●──●──●           │
│  • Véhicule     │                              │  Jauges moteur     │
│                 │                              │                    │
├─────────────────┴──────────────────────────────┴────────────────────┤
│  📊 FITNESS GRAPH    📡 LIDAR BARS    🗺️ MINIMAP    ⏱️ COCKPIT HUD   │
└─────────────────────────────────────────────────────────────────────┘
```

### Panneau Gauche — AI Configuration
| Section | Paramètre | Effet |
|---------|-----------|-------|
| **Capteurs** | Nb rayons (3–15) | Plus de rayons = meilleure perception mais réseau plus lent |
| **Capteurs** | Portée (px) | Distance de détection des murs |
| **Capteurs** | FOV (°) | Angle du champ de vision |
| **Réseau** | Couches cachées | Complexité du cerveau |
| **Réseau** | Neurones / couche | Capacité de mémorisation |
| **Génétique** | Taux mutation | Fréquence des variations (exploration vs exploitation) |
| **Génétique** | Amplitude mutation | Force des variations synaptiques |
| **Véhicule** | Vitesse max | Limite de vitesse en px/frame |
| **Véhicule** | Force max | Réactivité du braquage |

### Barre de Caméra
| Bouton | Mode | Description |
|--------|------|-------------|
| 🌐 **Global** | Overview | Vue d'ensemble du circuit entier |
| 🎯 **Follow** | Follow | Caméra suit le leader en douceur |
| 🏎️ **Chase** | Chase | Caméra embarquée derrière le leader |

### Raccourcis Clavier
| Touche | Action |
|--------|--------|
| `D` | Activer/Désactiver le mode Debug (cercles de détection) |
| `N` | Afficher/Masquer le visualiseur réseau de neurones |
| `H` | Afficher/Masquer le graphe de fitness |
| `V` | Afficher/Masquer les jauges LiDAR |
| `M` | Afficher/Masquer la minimap radar |
| `F` | Activer/Désactiver le suivi du leader |
| `S` | Sauvegarder le champion en JSON |
| `L` | Charger un champion depuis un fichier JSON |

---

## 🌍 Environnements (Thèmes)

Le projet propose **4 univers futuristes** sélectionnables dans le dropdown **THÈME CIRCUIT** :

| Thème | Nom | Ambiance |
|-------|-----|----------|
| 🌃 `tokyo` | **Neo Tokyo 2099** | Nuit, pluie, néons, gratte-ciels cyberpunk, hologrammes |
| 🪐 `mars` | **Mars Grand Prix** | Désert rouge, tempête de poussière, colonie futuriste |
| 🌕 `lunar` | **Lunar Racing Base** | Surface lunaire, cratères, Terre visible, étoiles |
| 🌋 `volcanic` | **Volcanic Core** | Lave, cendres, fissures, fumée volcanique |

Chaque environnement génère dynamiquement :
- Ville futuriste en **3 couches de profondeur** (premier plan / plan moyen / horizon)
- **Pluie/poussière** animée
- **Ponts suspendus** avec câbles et néons
- **Hologrammes** avec effets de glitch et scanlines
- **Véhicules de fond** sur les ponts
- **Vignette cinématique** et brouillard de profondeur

---

## 📁 Architecture du Code

```
9b - Voiture suit circuit version 2/
│
├── index.html              # Structure HTML + dashboard UI complet
├── css/
│   └── style.css           # Thème glassmorphism cyberpunk
│
├── js/
│   ├── globals.js          # Variables globales et configuration centrale
│   ├── utils.js            # Fonctions utilitaires mathématiques
│   ├── NeuralNetwork.js    # Réseau de neurones multicouche (feedforward)
│   ├── Ray.js              # Capteur LiDAR — détection d'intersection
│   ├── Car.js              # Véhicule autonome (LiDAR + cerveau + locomotion)
│   ├── Track.js            # Génération du circuit + rendu asphalte/vibreurs
│   ├── Genetic.js          # Algorithme génétique (élitisme + tournoi + mutation)
│   ├── BrainVisualizer.js  # Visualiseur du réseau de neurones en temps réel
│   ├── WorldRenderer.js    # Environnement futuriste (ville, pluie, néons…)
│   ├── championPreset.js   # Champion pré-entraîné embarqué (démo instantanée)
│   └── main.js             # Boucle principale p5.js + HUD + contrôles
│
└── tests/
    └── car_neuro.test.mjs  # 25 tests unitaires automatisés (Node.js)
```

### Responsabilité de chaque fichier

**`NeuralNetwork.js`** — Le cerveau  
Réseau de neurones feedforward avec activation sigmoïde. Supporte la sérialisation JSON (sauvegarde/chargement), le clonage exact et la mutation gaussienne.

**`Car.js`** — Le véhicule  
Hérite du modèle de locomotion Reynolds. Possède `look()` (lecture des rayons), `think()` (prédiction du réseau), `update()` (physique), `checkCheckpoints()` (score). Ne se téléporte jamais — toutes les forces passent par `applyForce()`.

**`Ray.js`** — Le capteur  
Chaque rayon calcule une intersection segment-segment entre lui-même et les murs. Retourne `hitFraction` entre 0 (mur immédiat) et 1 (voie libre).

**`Genetic.js`** — L'évolution  
`nextGeneration()` → trie par fitness, copie le champion (élitisme), crée les enfants par tournoi + mutation, libère la mémoire de l'ancienne génération.

**`Track.js`** — Le circuit  
Génère un circuit aléatoire avec un algorithme de déformation de cercle. Crée les murs intérieurs/extérieurs, les checkpoints, l'asphalte texturé et les vibreurs bicolores.

**`WorldRenderer.js`** — L'univers  
Module IIFE indépendant. Génère procéduralement la ville futuriste (bâtiments, fenêtres, néons, ponts, hologrammes) et anime la météo (pluie, poussière, brouillard). N'interfère jamais avec la logique IA.

---

## 🧪 Tests Automatisés

```bash
# Lancer les 25 tests unitaires
node --test "tests/car_neuro.test.mjs"
```

**Résultat attendu :** `✔ 25/25 tests passent`

Les tests couvrent :
- ✅ 4 topologies obligatoires du cahier des charges (5→, 8→, 10→, 12→ rayons)
- ✅ Modèle Reynolds : `applyForce` + locomotion (pas de téléportation)
- ✅ Mutation gaussienne sans altérer la topologie
- ✅ Sérialisation JSON du champion
- ✅ Détection d'intersection LiDAR
- ✅ Algorithme génétique (élitisme + tournoi)
- ✅ 3 thèmes de circuit (Tokyo, Mars, Cyber)
- ✅ WorldRenderer : init + draw sur 4 thèmes sans exception
- ✅ BrainVisualizer, modes caméra, champion pré-entraîné…

---

## 📐 Formules Mathématiques Clés

### Activation Sigmoïde (neurones)
$$\sigma(x) = \frac{1}{1 + e^{-x}}$$

### Force de Steering (Reynolds)
$$\vec{F}_{steering} = \vec{v}_{desired} - \vec{v}_{current}$$
$$\vec{v}_{desired} = \hat{d}_{target} \times v_{max}$$

### Mutation Gaussienne
$$w' = w + \mathcal{N}(0,\, \sigma_{mutation}) \quad \text{si } U(0,1) < p_{mutation}$$

### Fitness Score
$$\text{fitness} = \text{score}_{cp} + \text{bonus}_{proximit\acute{e}} + \bar{v} \times 5$$

---

## 🎬 Guide pour la Vidéo YouTube

> Durée recommandée : **3 à 5 minutes**

### Plan de la vidéo

**[0:00 – 0:30] Introduction accroche**  
- Ouvrir le simulateur → cliquer **⚡ DÉMO CHAMPION** immédiatement  
- Laisser tourner le champion une dizaine de secondes en mode **Follow 🎯**  
- Voix off : *"Cette voiture pilote seule, sans aucune règle codée. Elle a appris par elle-même en mourant des centaines de fois."*

**[0:30 – 1:30] Expliquer le concept**  
- Passer en mode caméra **🌐 Global** pour montrer toutes les voitures en génération 1  
- Cliquer **RESET** pour repartir de la Génération 1  
- Montrer les rayons LiDAR colorés (rouge = danger, vert = libre)  
- Voix off : *"Chaque voiture voit le monde avec des rayons laser. Ces distances entrent dans un réseau de neurones qui décide de tourner à gauche ou à droite."*

**[1:30 – 2:30] Montrer l'évolution**  
- Passer en **accélération x10** (menu Simulation Speed)  
- Regarder la génération 5 → 10 → 15 et commenter la montée du graphe de fitness  
- Zoomer sur le **graphe d'évolution** (courbe verte = best, cyan = moyenne)  
- Voix off : *"À chaque génération, les meilleures voitures transmettent leurs gènes. Les poids synaptiques mutent légèrement. La courbe monte — l'IA converge."*

**[2:30 – 3:30] Features visuelles**  
- Changer de thème : **🪐 Mars → 🌋 Volcanic → 🌕 Lunar**  
- Montrer le **visualiseur du cerveau** à droite avec les synapses qui s'illuminent  
- Montrer les **jauges LiDAR** en temps réel (barres rouge/jaune/vert)  
- Mode **Chase 🏎️** pour l'effet cinématique

**[3:30 – 4:00] Conclusion**  
- Revenir au champion qui boucle des tours parfaits  
- Montrer les stats : génération, meilleure fitness, temps de tour  
- Voix off : *"Ce projet illustre 3 concepts fondamentaux de l'IA réactive : les steering behaviors de Reynolds, les réseaux de neurones feedforward, et les algorithmes génétiques. Aucune ligne de code de conduite — seulement de l'évolution artificielle."*

### Tips de capture vidéo
- Utiliser **OBS Studio** (gratuit) pour enregistrer le navigateur en plein écran
- Résolution : 1920×1080, 60fps
- Thème recommandé pour la vidéo : **🌃 Neo Tokyo** (le plus spectaculaire visuellement)
- Désactiver les notifications Windows avant d'enregistrer

---

## 🔬 Concepts Académiques Couverts

| Concept | Implémentation dans le projet |
|---------|------------------------------|
| **Steering Behaviors** (Reynolds 1999) | `Car.js` — seek, flee, arrive via `applyForce()` |
| **Réseau de Neurones Feedforward** | `NeuralNetwork.js` — topologie configurable, activation sigmoïde |
| **Algorithme Génétique** | `Genetic.js` — élitisme, sélection par tournoi, mutation gaussienne |
| **IA Explicable (XAI)** | Jauges LiDAR + visualiseur réseau en temps réel |
| **Séparation Action/Steering/Locomotion** | Architecture 3 couches stricte (Reynolds) |
| **Neuro-Évolution** | Aucun gradient descent — optimisation par évolution |

---

## 👥 Crédits

- **Cours** : Intelligence Artificielle Réactive — 5IIR 2026/2027
- **Référence** : Craig W. Reynolds, *Steering Behaviors for Autonomous Characters*, GDC 1999
- **Moteur graphique** : [p5.js](https://p5js.org/) v1.9.0
- **Tests** : Node.js Test Runner (natif, sans dépendance externe)
- **Environnement visuel** : « GRAND PRIX FUTURISTE CYBERPUNK — NEO TOKYO 2099 »
