# Carte Lumières Auralis

La carte dédiée `custom:auralis-lights-card` complète la carte Pièce. Elle affiche un ou plusieurs groupes. Comme les autres cartes Auralis, chaque groupe ne montre sur la carte que l'essentiel : allumer et éteindre (à droite du nom) et l'intensité. Un appui sur la photo du groupe, marquée d'une petite icône de réglages, ouvre la fenêtre qui réunit tout le reste : couleur, couleurs prédéfinies, ambiances Home Assistant et les mêmes commandes pour chaque lampe. `show_colors: true` remet la couleur, les couleurs prédéfinies et le bouton des ambiances sur la carte.

## Installation manuelle

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple complet](../examples/lights-card.yaml) aux entités réelles. Une [version minimale](../examples/lights-card-minimal.yaml) est disponible pour un premier test. Vous pouvez aussi copier les trois fichiers du dossier `images/` dans `config/www/auralis-cards/images/`.

## Configuration

- `groups` : groupes de lumières. Chaque groupe comporte `name` et une liste `lights` d'entités `light.*` ou `switch.*`.
- `lights` : liste simple, utilisée comme groupe unique si `groups` est absent.
- `show_lights: true` : affiche aussi les noms et boutons marche/arrêt individuels sur la façade du groupe.
- `show_colors: true` : affiche aussi sur la carte le sélecteur de couleur, les couleurs prédéfinies et le bouton des ambiances. Par défaut, ils ne sont que dans la fenêtre du groupe, ouverte par un appui sur la photo.
- `background_image` : image de la tuile d'un groupe (`image` reste accepté). Placée au niveau de la carte, elle sert à tous les groupes qui n'ont pas leur propre image. Adresses acceptées : `https://…`, `/local/…`, `/hacsfiles/…` et les images servies par Home Assistant (`/api/…`, par exemple `/api/image/serve/…`). Les adresses `media-source://` ne sont pas lisibles directement par le navigateur : utilisez l'adresse `/local/` correspondante. Une adresse refusée laisse le dégradé par défaut.
- `scenes` : scènes Home Assistant de la carte, ou par groupe pour les remplacer. Les scènes pilotent les entités définies dans Home Assistant, selon leur propre configuration. La fenêtre des ambiances ne se ferme que si l'activation a réussi ; sinon, un message d'erreur apparaît.
- `preset_colors` : liste facultative de `{ name, color, kelvin }`, avec couleur au format `#RRGGBB`. `kelvin` (1000 à 12000) est facultatif. Sans option, huit couleurs sont proposées, dont trois blancs (chaud 2700 K, neutre 4000 K, froid 6000 K).
- `entity_labels` : noms affichés pour les lumières.
- `name`, `icon` : titre et icône de l'en-tête ; `show_header: false` masque l'en-tête.
- `accent_color` : couleur des icônes, des curseurs et des lumières allumées, sur la carte et dans ses fenêtres. Sans option, la couleur du thème est conservée.
- `card_background` : fond de la carte, `mode: gradient` avec `gradient`, ou `mode: solid` avec `color`.

## Comportement des commandes

- **Intensité et couleur de groupe** : elles ne s'appliquent qu'aux lampes déjà allumées, pour ne pas rallumer toute la pièce. Si aucune lampe n'est allumée, elles s'appliquent à toutes les lampes compatibles, qui s'allument au réglage choisi. Une seule commande part pour tout le groupe.
- **Curseurs** : le remplissage et le pourcentage suivent le doigt pendant le glissement ; la commande part au relâchement.
- **Blancs prédéfinis** : envoyés en température de blanc (`color_temp_kelvin`) aux lampes qui la gèrent, en couleur aux autres.
- **Relais** : les éclairages commandés par un relais (`switch.*`) n'ont que la marche et l'arrêt. Un groupe qui ne contient que des interrupteurs n'affiche ni intensité ni couleur. Dans un groupe mixte, l'intensité et la couleur ne s'appliquent qu'aux lampes `light.*`.
- **Indisponible** : une lampe indisponible affiche « Indisponible » et ne reçoit aucune commande.
- **Fiche Home Assistant** : un appui long (une demi-seconde) ou un clic droit sur une lampe ouvre sa fiche.
- Les commandes de couleur sont proposées uniquement aux lampes qui annoncent un mode couleur compatible. Les boutons ne contiennent que des icônes ; leurs libellés restent accessibles aux lecteurs d'écran. Un échec de commande affiche un message.

La carte n'impose pas de hauteur : dans une vue Sections, elle suit la hauteur réelle de ses groupes.

## Photos fournies

Les fichiers sont prêts à être copiés dans Home Assistant :

| Fichier | Usage suggéré | Source |
| --- | --- | --- |
| `images/lumieres-salon.jpg` | Lampe de salon, lumière chaude | [Evan Wise sur Unsplash](https://unsplash.com/photos/a-living-room-filled-with-furniture-and-a-lamp-OAiJ1gcainE) |
| `images/lumieres-bureau.jpg` | Suspension lumineuse | [Lee Milo sur Unsplash](https://unsplash.com/photos/a-modern-pendant-light-fixture-hangs-indoors-uIjVZb9TEDQ) |
| `images/lumieres-ambiance.jpg` | Éclairage coloré | [Mustafa Sheikhmouss sur Unsplash](https://unsplash.com/photos/colorful-lights-illuminate-a-dark-room-with-a-framed-display-ZMcgNHPdOl0) |

Ces photographies sont utilisables selon la [licence Unsplash](https://unsplash.com/license). Les crédits ci-dessus accompagnent les fichiers dans le projet.
