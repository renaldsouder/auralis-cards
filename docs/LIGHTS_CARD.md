# Carte Lumières Auralis

La carte dédiée `custom:auralis-lights-card` complète la carte Pièce. Elle affiche un ou plusieurs groupes. Chaque groupe a, dès la façade, les commandes par icônes pour allumer, éteindre, régler l'intensité, choisir une couleur et appliquer une couleur prédéfinie. Le bouton chevron ouvre la pop-up avec les mêmes commandes pour chaque lampe. Le bouton étoile ouvre les ambiances Home Assistant configurées pour le groupe.

## Installation manuelle

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple complet](../examples/lights-card.yaml) aux entités réelles. Une [version minimale](../examples/lights-card-minimal.yaml) est disponible pour un premier test. Vous pouvez aussi copier les trois fichiers du dossier `images/` dans `config/www/auralis-cards/images/`.

## Configuration

- `groups` : groupes de lumières. Chaque groupe comporte `name` et une liste `lights` d'entités `light.*`.
- `lights` : liste simple, utilisée comme groupe unique si `groups` est absent.
- `show_lights: true` : affiche aussi les noms et boutons marche/arrêt individuels sur la façade du groupe.
- `image` : image facultative de la tuile du groupe, URL `/local/...`, `/hacsfiles/...` ou `https://...`.
- `scenes` : scènes Home Assistant de la carte, ou par groupe pour les remplacer. Les scènes pilotent les entités définies dans Home Assistant, selon leur propre configuration.
- `preset_colors` : liste facultative de `{ name, color }`, avec couleur au format `#RRGGBB`. Sans option, sept couleurs sont proposées.
- `entity_labels` : noms affichés pour les lumières.

Les commandes de couleur sont proposées uniquement aux lampes qui annoncent un mode couleur compatible. Les lampes indisponibles ne reçoivent aucune commande. Les boutons ne contiennent que des icônes ; leurs libellés restent accessibles aux lecteurs d'écran.

## Photos fournies

Les fichiers sont prêts à être copiés dans Home Assistant :

| Fichier | Usage suggéré | Source |
| --- | --- | --- |
| `images/lumieres-salon.jpg` | Lampe de salon, lumière chaude | [Evan Wise sur Unsplash](https://unsplash.com/photos/a-living-room-filled-with-furniture-and-a-lamp-OAiJ1gcainE) |
| `images/lumieres-bureau.jpg` | Suspension lumineuse | [Lee Milo sur Unsplash](https://unsplash.com/photos/a-modern-pendant-light-fixture-hangs-indoors-uIjVZb9TEDQ) |
| `images/lumieres-ambiance.jpg` | Éclairage coloré | [Mustafa Sheikhmouss sur Unsplash](https://unsplash.com/photos/colorful-lights-illuminate-a-dark-room-with-a-framed-display-ZMcgNHPdOl0) |

Ces photographies sont utilisables selon la [licence Unsplash](https://unsplash.com/license). Les crédits ci-dessus accompagnent les fichiers dans le projet.
