# Auralis Cards

Auralis Cards est une collection de cartes modernes pour Home Assistant : navigation entre les sous-vues, pièce tout-en-un, groupes de volets, prises et interrupteurs, éclairage, thermostats, températures des pièces, météo, caméras, ampli et multimédia, frigo connecté, arrosage, piles et appareils muets, onglets, veille d’écran, suivi d’un PC, supervision d’un serveur UNRAID et pilotage d’un nœud Proxmox. Son langage graphique, **Auralis Frame**, associe photographie immersive, informations flottantes et surfaces vitrées.

![Aperçu des cartes Auralis Pièce, PC et UNRAID](docs/auralis-preview.svg)

## Cartes disponibles

| Carte | Rôle | Documentation |
| --- | --- | --- |
| `custom:auralis-room-card` | Pièce tout-en-un : lumières, volets, climat, musique, ambiances | [Exemple](#exemple-minimal--pièce) |
| `custom:auralis-lights-card` | Éclairage par groupes, couleurs, blancs et ambiances | [LIGHTS_CARD](docs/LIGHTS_CARD.md) |
| `custom:auralis-covers-card` | Groupes de volets, position volet par volet | [Volets](#carte-volets) |
| `custom:auralis-switches-card` | Prises et interrupteurs groupés | [Prises](#carte-prises-et-interrupteurs) |
| `custom:auralis-thermostat-card` | Consignes et modes des thermostats | [THERMOSTAT_CARD](docs/THERMOSTAT_CARD.md) |
| `custom:auralis-climate-card` | Températures, humidité et piles des pièces | [CLIMATE_CARD](docs/CLIMATE_CARD.md) |
| `custom:auralis-weather-card` | Horloge, météo et prévisions | [WEATHER_CARD](docs/WEATHER_CARD.md) |
| `custom:auralis-media-card` | Ampli, enceintes, télévision | [MEDIA_CARD](docs/MEDIA_CARD.md) |
| `custom:auralis-cameras-card` | Mosaïque de caméras, mouvement, direct | [CAMERAS_CARD](docs/CAMERAS_CARD.md) |
| `custom:auralis-actions-card` | Scripts, boutons et scènes à un appui | [ACTIONS_CARD](docs/ACTIONS_CARD.md) |
| `custom:auralis-energy-card` | Consommation du jour, comparaison à J−7, coût | [ENERGY_CARD](docs/ENERGY_CARD.md) |
| `custom:auralis-fridge-card` | Frigo connecté : températures, portes, alertes | [FRIDGE_CARD](docs/FRIDGE_CARD.md) |
| `custom:auralis-irrigation-card` | Vannes d'arrosage, arrosage minuté sûr | [IRRIGATION_CARD](docs/IRRIGATION_CARD.md) |
| `custom:auralis-batteries-card` | Piles faibles et appareils indisponibles, sans configuration | [BATTERIES_CARD](docs/BATTERIES_CARD.md) |
| `custom:auralis-pc-card` | Suivi et commandes d'un ordinateur | [PC](#exemple-minimal--pc) |
| `custom:auralis-unraid-card` | Serveur UNRAID : array, Docker, VM | [UNRAID](#exemple-minimal--unraid) |
| `custom:auralis-proxmox-card` | Nœud ou cluster Proxmox, VM et LXC | [Proxmox](#exemple-minimal--proxmox) |
| `custom:auralis-navbar-card` | Barre de navigation entre les vues | [Navigation](#exemple-minimal--navigation) |
| `custom:auralis-tabs-card` | Plusieurs cartes sous des onglets | [TABS_CARD](docs/TABS_CARD.md) |
| `custom:auralis-screensaver-card` | Veille d'écran pour tablette murale | [SCREENSAVER_CARD](docs/SCREENSAVER_CARD.md) |

Thèmes : `auto`, `halo`, `carbon`, `mono`, `aurora` (voir [Thèmes](#thèmes)).

Le design cinématique accepte une image locale facultative avec `background_image`. Placez l'image dans `config/www/`, puis utilisez une URL `/local/...`. Sans image, une ambiance abstraite sombre est affichée automatiquement.

Les cartes **Pièce, PC et UNRAID** partagent le même système de fond :

```yaml
card_background:
  mode: gradient # solid, gradient ou grid
  gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)"
show_grid: false # true affiche la trame décorative
```

Les cartes techniques acceptent aussi une image superposée :

```yaml
background_image: /local/auralis-cards/images/machine.jpg
background_position: 50% center
accent_color: "#50d59b"
image_brightness: 72
glass_opacity: 0.84
```

`card_background.color` est utilisé avec `mode: solid` ou `mode: grid`. `card_background.gradient` est utilisé avec `mode: gradient`. `show_grid` permet d'afficher ou masquer les lignes sans changer le fond choisi.

Le [cahier des charges](docs/CAHIER_DES_CHARGES.md) décrit le périmètre et les choix fonctionnels.

## Comportements communs

Toutes les cartes partagent les mêmes règles :

- **Commandes** : un bouton montre l'état « en cours » pendant l'appel. Si Home Assistant refuse la commande, un message l'indique quelques secondes en haut de l'écran. Un bouton jamais pressé (état `unknown`) reste utilisable ; seule une entité `unavailable` désactive la commande.
- **Fiche de l'entité** : un appui long ou un clic droit sur une ligne ouvre la fiche Home Assistant de l'entité.
- **Fenêtres de détail** : Échap ou le geste retour les ferment, et le focus revient au bouton qui les a ouvertes.
- **Mises à jour** : une carte ne se redessine que lorsqu'une entité qu'elle affiche change, ce qui ménage les tablettes allumées en permanence.
- **Seuils d'alerte** : les mesures des cartes machines passent en ambre puis en rouge au-delà de leurs seuils. Les valeurs par défaut se règlent avec `alert_levels` :

```yaml
alert_levels:
  cpu: { warning: 80, critical: 95 }        # %
  memory: { warning: 85, critical: 95 }     # %
  disk: { warning: 85, critical: 95 }       # %
  temperature: { warning: 70, critical: 85 } # °C
```

## Thèmes

Chaque carte accepte `theme` : `halo` (clair), `aurora` (clair, teinté), `carbon` (sombre) ou `mono` (sombre, sans couleur). Avec `auto`, la valeur par défaut, la carte suit le mode sombre de Home Assistant : `carbon` s'il est actif, `halo` sinon.

Les surfaces planes suivent le thème : fond de carte, tuiles, lignes, puces, en-têtes, fenêtres de détail, confirmations et formulaires. Une fenêtre ouverte depuis une carte `halo` ou `aurora` est donc claire.

Les façades photo restent sombres dans tous les thèmes, avec un texte clair : façade des cartes PC, UNRAID, Proxmox et Frigo, ciel de la carte Météo, pochette de la carte Multimédia, images des caméras, photo de la carte Pièce et tuiles photo des volets et des prises. Une image n'a pas de couleur fixe : le voile sombre garantit la lecture quelle que soit la photo. Les couleurs vives (seuils de température, conditions météo, accents) sont assombries automatiquement quand elles servent de texte sur un fond clair.

## Développement

```bash
npm install
npm run dev
npm run verify
```

Toutes les cartes sont enregistrées dans le point d'entrée TypeScript [`auralis-cards.ts`](auralis-cards.ts). Le bundle unique est généré dans `dist/auralis-cards.js`.

## Installation avec HACS

Une fois le dépôt public créé :

1. Ouvrir **HACS** dans Home Assistant.
2. Ouvrir le menu à trois points puis **Dépôts personnalisés**.
3. Coller l'URL GitHub du dépôt `https://github.com/renaldsouder/auralis-cards`.
4. Choisir la catégorie **Dashboard** puis ajouter le dépôt.
5. Télécharger **Auralis Cards** et actualiser le navigateur.

La ressource distribuée par HACS sera disponible sous `/hacsfiles/auralis-cards/auralis-cards.js`. Ce chemin évite le cache persistant utilisé par `/local/`.

Si Home Assistant affiche `Custom element doesn't exist`, vérifiez dans **Paramètres → Tableaux de bord → ⋮ → Ressources** que cette URL est déclarée comme **module JavaScript**, puis rechargez la page. Coller le YAML d'une carte ne charge pas la ressource JavaScript.

## Installation manuelle

1. Copier `dist/auralis-cards.js` dans `config/www/auralis-cards/`.
2. Ajouter `/local/auralis-cards/auralis-cards.js` comme ressource JavaScript de type `module`.
3. Rafraîchir Home Assistant.

Les anciens types `custom:orbit-*` restent temporairement reconnus par le bundle Auralis afin de faciliter la migration. Les nouvelles configurations doivent utiliser `custom:auralis-*`.

Chaque GitHub Release contenant `auralis-cards.js` devient une version sélectionnable et met à disposition les mises à jour dans HACS.

Le fichier `examples/dashboard.yaml` est une configuration complète à coller dans l'éditeur de configuration brute du dashboard. Les blocs commençant directement par `type: custom:...` sont, eux, destinés à l'éditeur YAML d'une carte individuelle.

Lumières, Thermostats et Frigo utilisent le même `auralis-cards.js` que les autres cartes. La carte Lumières accepte aussi les éclairages commandés par relais (`switch.*`), et la carte Frigo un réfrigérateur exposé comme thermostat (`climate_entity`). Leurs configurations sont dans [Lumières](examples/lights-card.yaml) ([version minimale](examples/lights-card-minimal.yaml)), [Thermostats](examples/thermostat-card.yaml) et [Frigo connecté](examples/fridge-card.yaml). Pour le fond du frigo, copiez [frigo-connecte.jpg](images/frigo-connecte.jpg) dans `config/www/auralis-cards/images/`, puis remplacez les identifiants d'entités par ceux de votre appareil. Voir les guides [Lumières](docs/LIGHTS_CARD.md), [Thermostats](docs/THERMOSTAT_CARD.md) et [Frigo](docs/FRIDGE_CARD.md).

La [carte Énergie](examples/energy-card.yaml) compare les sept derniers jours aux mêmes jours de la semaine précédente. Renseignez `energy_entity` avec un capteur d’énergie cumulée qui alimente les statistiques Recorder, et `power_entity` pour afficher la puissance instantanée. Elle suit aussi un compteur de gaz ou d’eau : l’unité du capteur (m³, L…) est reprise automatiquement, et `unit` permet d’en choisir une autre.

`accent_color` colore la courbe et le total de la semaine en cours ; `card_background` remplace le fond de la carte.

Dans une vue Sections, la carte Énergie utilise 12 colonnes par défaut. Modifiez sa largeur dans l’onglet **Disposition** ou définissez `grid_options.columns: full` pour occuper toute la section.

La [carte Climat des pièces](examples/climate-card.yaml) réunit les capteurs de température de la maison : une tuile par pièce avec température colorée par palier de confort, humidité, batterie faible et courbe sur 24 heures. Un appui ouvre les courbes de température et d’humidité sur 24 heures ou 7 jours. Voir le [guide Climat](docs/CLIMATE_CARD.md).

```yaml
type: custom:auralis-climate-card
name: Températures
rooms:
  - name: Salon
    temperature_entity: sensor.salon_temperature
    humidity_entity: sensor.salon_humidite
    battery_entity: sensor.salon_batterie
  - name: Extérieur
    temperature_entity: sensor.exterieur_temperature
    outdoor: true
```

La [carte Météo](examples/weather-card.yaml) sert d’en-tête : salutation, date, heure, temps actuel et bandeau de prévisions coloré, sur un fond qui suit le temps et passe en mode nuit. Un appui ouvre les mesures détaillées, la courbe des prochaines heures et les prochains jours. Voir le [guide Météo](docs/WEATHER_CARD.md).

```yaml
type: custom:auralis-weather-card
entity: weather.forecast_maison
temperature_entity: sensor.exterieur_temperature
```

La [carte Actions](examples/actions-card.yaml) réunit des tuiles à un appui : scripts, boutons, scènes, automatisations, interrupteurs, services libres ou navigation. Chaque tuile affiche la dernière utilisation ou l’état, une roue pendant l’exécution puis « Fait » ou « Échec ». Une confirmation est possible pour les actions sensibles. Voir le [guide Actions](docs/ACTIONS_CARD.md).

```yaml
type: custom:auralis-actions-card
actions:
  - entity: script.wake_skynet
    name: Réveiller Skynet
  - entity: button.reboot_freebox
    confirm: Redémarrer la Freebox ?
    danger: true
```

La [carte Caméras](examples/cameras-card.yaml) affiche les caméras en mosaïque rafraîchie, met en avant celles qui détectent un mouvement et ouvre chaque caméra en grand, en direct, avec ses commandes (projecteur, sirène…). Voir le [guide Caméras](docs/CAMERAS_CARD.md).

```yaml
type: custom:auralis-cameras-card
cameras:
  - entity: camera.allee
    motion_entity: binary_sensor.allee_mouvement
  - entity: camera.jardin
```

La [carte Média](examples/media-card.yaml) pilote un ampli, des enceintes ou une télévision : pochette, lecture, volume plafonné, sources favorites et modes sonores. Plusieurs lecteurs peuvent partager la même carte. Voir le [guide Média](docs/MEDIA_CARD.md).

```yaml
type: custom:auralis-media-card
entity: media_player.tx_nr686
name: Ampli
max_volume: 60
sources:
  - source: tv
    name: Télé
  - source: bluetooth
```

## Exemple minimal — Navigation

Une configuration autonome est disponible dans [`examples/navbar-card.yaml`](examples/navbar-card.yaml).

```yaml
type: custom:auralis-navbar-card
theme: carbon
position: bottom
phone_position: bottom
tablet_position: right
height_desktop: 76
height_tablet: 72
height_mobile: 56
hide_native_header: true
accent_color: "#79D6F2"
show_labels: true
compact: true
grid_options:
  rows: auto
items:
  - label: Accueil
    icon: mdi:home-outline
    path: /dashboard-auralis/accueil
  - label: Pièces
    icon: mdi:floor-plan
    path: /dashboard-auralis/pieces
    active_paths:
      - /dashboard-auralis/salon
      - /dashboard-auralis/cuisine
  - label: Systèmes
    icon: mdi:server-network
    path: /dashboard-auralis/systemes
    badge_entity: sensor.systemes_en_alerte
```

`position` place la barre au bord visible de l'écran : `top`, `bottom`, `left` ou `right`. Le placement par défaut est `bottom` ; `inline` conserve la carte dans le flux du dashboard. `phone_position` et `tablet_position` remplacent cette position selon l'appareil. Sur Android, une tablette est reconnue par son côté court d'au moins 600 px, y compris en paysage. Avec `tablet_position: right`, la navbar réserve 176 px dans la vue Home Assistant pour que les cartes ne passent pas dessous. Les placements horizontaux sont centrés dans la zone du tableau de bord, même avec la barre latérale Home Assistant ouverte. Les positions latérales empilent les boutons verticalement. `height_desktop` s'applique au-delà de 1024 px, `height_tablet` entre 601 et 1024 px et `height_mobile` jusqu'à 600 px. Chaque hauteur est un entier de 56 à 160 pixels ; les valeurs par défaut sont 76, 72 et 72 px. `path` cible une vue ou une sous-vue interne Home Assistant. Une entrée reste active dans ses sous-routes ; `exact: true` limite l’état actif à la route exacte. `active_paths` associe plusieurs sous-vues au même bouton. `show_labels: false` produit une barre uniquement composée d’icônes.

La navbar fixée réserve automatiquement la place nécessaire en bas ou en haut pour que les cartes puissent défiler entièrement hors de sa zone. Sur téléphone, `height_mobile: 56` avec `compact: true` réduit sa hauteur. `hide_native_header: true` masque l'en-tête et les onglets Home Assistant dans la vue qui contient la navbar ; ils restent visibles en mode édition. Les administrateurs gardent toujours l'en-tête : son menu ⋮ est le seul accès au mode modification. Pour le masquer aussi à un administrateur (tablette murale), utilisez kiosk-mode. Ajoutez l'option sur chaque vue concernée. Pour masquer seulement certains onglets en gardant l'en-tête, utilisez la visibilité des vues Home Assistant (`visible: false`).

En mode édition, la navbar reste une carte normale dans la grille pour pouvoir la sélectionner et la déplacer. Elle se fixe au bord choisi dès la sortie de l'éditeur.
Si son ancien emplacement réserve encore une ligne dans une vue Sections, mettez `grid_options.rows: auto` sur la carte navbar existante.

## Exemple minimal — Pièce

Dans une vue Sections, la carte Pièce suit sa hauteur réelle. Si une carte existante garde une zone vide, remplacez un éventuel `grid_options.rows` enregistré par `auto` dans sa configuration :

```yaml
grid_options:
  columns: 12
  rows: auto
```

### Pièce remplie depuis une zone Home Assistant

Avec `area`, la carte reprend les appareils d'une zone (pièce) de Home Assistant : plus besoin de lister chaque entité.

```yaml
type: custom:auralis-room-card
area: salon            # identifiant ou nom de la zone, sans tenir compte de la casse
# Facultatif :
# area_exclude:        # entités de la zone à ignorer (identifiants ou motifs avec * et ?)
#   - light.veilleuse_*
#   - media_player.salon_groupe
# area_include_switches: true   # reprend aussi les interrupteurs switch.* (hors prises) comme lumières
```

Une entité appartient à la zone quand elle y est rattachée directement, ou, à défaut, quand son appareil l'est. Les entités masquées, désactivées, de configuration ou de diagnostic sont ignorées. Chaque option **non renseignée** (ou laissée vide) est remplie :

| Option | Reprise depuis la zone |
| --- | --- |
| `name` | nom de la zone |
| `lights` | lumières `light.*`, triées par nom ; un groupe de lumières de la zone remplace ses membres. Avec `area_include_switches: true`, les `switch.*` qui ne sont pas des prises (`device_class: outlet`) |
| `covers` | volets `cover.*`, sauf portes de garage et portails (`device_class: garage` ou `gate`) |
| `temperature_entity` / `humidity_entity` | premier capteur de classe `temperature` / `humidity`, en évitant ceux dont le nom contient « batterie » ou « battery » |
| `climate_entity` | premier thermostat `climate.*` |
| `media_player_entity` | premier lecteur `media_player.*` qui n'est pas une télévision |
| `right_controls` | si la zone contient une télévision (`device_class: tv`) et que `right_controls` n'est pas défini : le lecteur puis une commande `tv` |

Une option renseignée l'emporte toujours sur la zone ; pour ne retirer que certains appareils, utilisez `area_exclude` (par exemple `light.*` pour n'afficher aucune lumière). Si la zone n'existe pas, ou si elle ne contient ni lumière, ni volet, ni capteur, ni thermostat, ni lecteur, la carte affiche un message explicite à la place de la pièce. Un thermostat, un lecteur ou une télévision seuls suffisent à afficher la pièce. Les zones nécessitent Home Assistant 2023.x ou plus récent. Toutes les autres options (photo, ambiances, thermostat, libellés…) restent disponibles.

Une version autonome, limitée à la carte Salon, est disponible dans [`examples/salon-card.yaml`](examples/salon-card.yaml).

```yaml
type: custom:auralis-room-card
name: Salon
theme: carbon
card_background:
  mode: gradient
  gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)"
show_grid: false
# Une photographie de salon est intégrée par défaut.
# background_image: /local/auralis-cards/images/salon.jpg
background_position: center
accent_color: "#79d6f2"
temperature_entity: sensor.salon_temperature
humidity_entity: sensor.salon_humidity
climate_entity: climate.salon
media_player_entity: media_player.salon
ambiance:
  label: Ambiance
  icon: mdi:creation-outline
  position: bottom-right
scenes:
  - entity: scene.soiree_salon
    label: Mode soirée
    icon: mdi:weather-night
  - entity: scene.normal_salon
    label: Mode normal
    icon: mdi:lightbulb-group-outline
popup_titles:
  lights: Éclairage
  covers: Volets
  climate: Température et humidité
  media: Musique
  tv: Télévision
  ambiance: Choisir une ambiance
left_controls:
  - type: lights
    label: Lumières
    icon: mdi:ceiling-light-outline
right_controls:
  - type: media
    entity: media_player.salon
    label: Musique
    icon: mdi:music-note
  - type: tv
    entity: media_player.tv_salon
    label: TV
    icon: mdi:television
thermostat:
  entity: climate.salon
  position: bottom-left
  label: Thermostat
  step: 0.5
  show_border: true
  show_background: true
  label_color: "#B9C6D5"
  value_color: "#FFFFFF"
  button_color: "#79D6F2"
  background_color: "rgba(13, 18, 25, 0.78)"
  border_color: "rgba(121, 214, 242, 0.28)"
entity_labels:
  light.plafonnier_salon: Plafonnier
  light.lampadaire_salon: Lampadaire
  cover.baie_salon: Baie vitrée
  cover.fenetre_salon: Fenêtre
  sensor.salon_temperature: Température
  sensor.salon_humidity: Humidité
  climate.salon: Thermostat
  media_player.salon: Enceinte du salon
climate_popup:
  graph_entities:
    - sensor.salon_temperature
    - sensor.salon_humidity
  graph_period: 7
  graph_period_unit: days
  show_overview: true
  show_current_values: false
  show_thermostat: true
lights:
  - light.plafonnier_salon
  - light.lampadaire_salon
covers:
  - cover.baie_salon
  - cover.fenetre_salon
```

La pop-up Volets propose uniquement les commandes **Ouvrir**, **Stop** et **Fermer**, pour le groupe comme pour chaque volet. Aucun positionnement en pourcentage n'est affiché.

`card_background.mode` accepte `grid`, `solid` ou `gradient`. Un fond uni utilise `card_background.color`. Un fond dégradé utilise une valeur CSS dans `card_background.gradient`, par exemple `linear-gradient(135deg, #0D151D, #183044)`.
Les valeurs de `entity_labels` remplacent uniquement les libellés affichés par la carte ; les noms des entités Home Assistant restent inchangés. Toute entité absente de cette liste conserve automatiquement son nom Home Assistant. L'ancien champ `cover_labels` reste accepté.

La pop-up Lumières contient une commande générale compacte, une luminosité générale, puis les commandes unitaires. Les éclairages annonçant un mode couleur compatible dans Home Assistant disposent automatiquement d'un sélecteur de couleur global et individuel. Une lumière allumée utilise une icône pleine avec un halo de sa couleur actuelle.

`left_controls` et `right_controls` acceptent chacun jusqu'à deux commandes. Une commande unique est centrée verticalement ; deux commandes sont empilées. Les types disponibles sont `lights`, `covers`, `climate`, `media`, `tv`, `scene` et `entity`. Le type `tv` ouvre une pop-up dédiée avec alimentation, lecture/pause, volume et accès aux détails.

`thermostat` affiche sur la photographie la consigne du thermostat et les boutons −/+. Son libellé, son pas de réglage et toutes ses couleurs sont configurables. `show_border: false` masque la bordure et `show_background: false` rend le fond entièrement transparent, sans flou résiduel. `position` accepte `top-left`, `top-right`, `bottom-left` ou `bottom-right`.

`ambiance` configure l'unique bouton affiché sur la photographie : son `label`, son `icon` et sa `position` (`top-left`, `top-right`, `bottom-left` ou `bottom-right`). Un clic ouvre une petite pop-up. La liste `scenes` fournit les modes proposés dans cette pop-up ; chaque entrée possède sa propre `entity`, son `label` et son `icon`. L'ancien `scene_entity` reste accepté et produit un bouton « Ambiance » contenant le mode « Mode soirée ». Le fichier [`examples/salon-card-complete.yaml`](examples/salon-card-complete.yaml) reprend les identifiants réels fournis pour la carte Salon ; seule l'entité de télévision doit être remplacée par son identifiant réel.

`accent_color` colore toute la carte : commandes latérales, avatar, halo, dock des volets et fenêtre Ambiance. Le titre d'une fenêtre ouverte par une commande latérale vient de son `popup_title`, puis de son `label` ; `popup_titles` sert quand aucun des deux n'est défini.

`popup_titles` personnalise le titre de chaque pop-up. La section `climate_popup` choisit les capteurs représentés, génère un graphe séparé par capteur et règle la période avec `graph_period_unit: hours`, `days` ou `months`. Un mois correspond à 30 jours dans le graphe d'historique Home Assistant. Une liste `graph_entities: []` désactive les graphes ; les options `show_overview`, `show_current_values` et `show_thermostat` permettent de composer librement le contenu. Les cartes de valeurs actuelles sont masquées par défaut, car le résumé « Confort de la pièce » contient déjà ces mesures.

## Carte Volets

La carte `custom:auralis-covers-card` affiche directement les groupes sous forme de grandes tuiles photographiques. Le nom est placé en haut à côté de l'icône ; l'état et le chevron apparaissent au-dessus de trois commandes par icône : monter, arrêter et descendre. Les libellés restent accessibles aux lecteurs d'écran et au survol. Un clic sur la zone photographique ouvre la pop-up du groupe avec les commandes groupées et individuelles. Les quatre photographies de la proposition sont intégrées au bundle ; `background_image` dans un groupe permet de remplacer sa photo par une URL `/local/...`. `background_position` règle son cadrage. Le `background_image` de la carte sert d'image commune aux groupes qui n'ont pas leur propre photo.

Une configuration prête à adapter se trouve dans [`examples/volets-card.yaml`](examples/volets-card.yaml) :

```yaml
type: custom:auralis-covers-card
theme: carbon
groups:
  - name: Salon
    covers:
      - cover.baie_salon
      - cover.fenetre_salon
  - name: Bureau
    covers:
      - cover.fenetre_bureau
      - cover.velux_bureau
```

`accent_color` colore les icônes, l'état et le contour de survol des tuiles ; `card_background` remplace le fond de la carte (`mode: gradient` avec `gradient`, ou `mode: solid` avec `color`). Sans ces options, l'apparence d'origine est conservée.

Les quatre photos intégrées se répètent si davantage de groupes sont configurés. Les entités absentes ou indisponibles restent visibles, et leurs commandes individuelles sont désactivées.

`group_columns` règle le nombre de colonnes des groupes, de 1 à 4. Sans cette option, un seul groupe occupe toute la largeur et plusieurs groupes utilisent deux colonnes. Pour forcer une seule colonne, ajoutez `group_columns: 1` au niveau de la carte, à côté de `theme`. Sur une carte étroite, la grille réduit automatiquement le nombre de colonnes pour garder les commandes utilisables. Cette option est distincte de `grid_options.columns`, qui règle la largeur de la carte dans Home Assistant.

## Carte Prises et interrupteurs

`custom:auralis-switches-card` accepte une liste `switches` contenant une seule entité ou plusieurs. Pour créer plusieurs tuiles, utilisez `groups` : chaque groupe possède un `name` et une liste `switches`. Touchez la zone avec l'icône, le nom et l'état pour ouvrir la pop-up des interrupteurs. L'interrupteur large sous cette zone commande tout le groupe : éteint à gauche, mixte au centre, allumé à droite. Les entités absentes ou indisponibles restent visibles, avec leurs commandes désactivées.

Le visuel se règle comme sur les autres cartes : `theme`, `accent_color`, `card_background`, `show_grid`, une `background_image` commune ou propre à chaque groupe, `background_position`, `image_brightness`, `image_opacity`, `glass_opacity`, ainsi que `icon` et `entity_labels`. Mettez `show_header: false` pour masquer tout l'en-tête ou `show_group_label: false` pour masquer « Groupes d'interrupteurs ». Ces deux options sont aussi proposées dans l'éditeur visuel. `group_columns` accepte de 1 à 4 colonnes ; un groupe unique prend toujours toute la largeur, même avec `group_columns: 2`. Voir [l’exemple complet](examples/switches-card.yaml).

```yaml
type: custom:auralis-switches-card
name: Prises du salon
switches:
  - switch.lampe_salon
  - switch.television_salon
```

## Exemple minimal — PC

```yaml
type: custom:auralis-pc-card
name: PC Bureau
theme: carbon
card_background:
  mode: gradient
  gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)"
show_grid: false
background_image: /local/auralis-cards/images/pc-bureau.jpg
background_position: center
image_opacity: 35
status_entity: binary_sensor.pc_bureau_online # online_entity reste accepté
session_entity: sensor.pc_bureau_session
uptime_entity: sensor.pc_bureau_uptime
cpu_entity: sensor.pc_bureau_cpu
cpu_temperature_entity: sensor.pc_bureau_cpu_temperature
gpu_entity: sensor.pc_bureau_gpu
gpu_temperature_entity: sensor.pc_bureau_gpu_temperature
memory_entity: sensor.pc_bureau_memory
storage_entity: sensor.pc_bureau_storage_percent
storage_label_entity: sensor.pc_bureau_storage_used
network_down_entity: sensor.pc_bureau_network_down
network_up_entity: sensor.pc_bureau_network_up
lock_entity: button.pc_bureau_lock
sleep_entity: button.pc_bureau_sleep
restart_entity: button.pc_bureau_restart
shutdown_entity: button.pc_bureau_shutdown
wake_entity: button.pc_bureau_wake
```

La carte distingue un PC hors ligne d'un état Home Assistant indisponible. Dans ce dernier cas, les commandes sont suspendues et les métriques non disponibles affichent `—` plutôt qu'une valeur nulle. Un capteur numérique HASS.Agent peut désormais servir de `online_entity` : tant qu'il est disponible, la machine est considérée en ligne.

La façade reprend la composition Auralis Frame d'origine : cadrans circulaires CPU et RAM côte à côte, contexte session/uptime et panneau inférieur. Elle affiche chaque entrée valide de `drives` sur une ligne distincte, en plus du GPU. Un seul bouton **Détails** ouvre les informations secondaires : disques, périphériques audio, alimentation, activité système, interfaces réseau et commandes. Une zone dont la donnée est absente, indisponible ou invalide est entièrement masquée ; une température égale à `0` n'est donc pas présentée comme une mesure réelle. `drives` lit directement les attributs HASS.Agent `UsedSpacePercentage`, `UsedSpaceMB` et `TotalSizeMB`. `last_boot_entity` permet de calculer l'uptime sans capteur modèle. `session_entity` attend l'état de session HASS.Agent (`Locked`, `Unlocked`, `Active` ou `Disconnected`) tandis que `user_entity` contient le nom de l'utilisateur connecté. Consultez [`examples/pc-card.yaml`](examples/pc-card.yaml) pour une configuration complète et neutralisée.

`background_image` ajoute une photographie derrière la carte PC. `image_opacity` règle uniquement l'opacité de ce fond de `0` à `100`, sans modifier les textes, boutons et indicateurs. `background_position` permet de recadrer l'image et `image_brightness` d'ajuster sa luminosité.

Pour afficher d'autres entités dans la fenêtre **Détails** de la carte PC, utilisez `extra_sections`. Chaque section contient un `title` et une liste `entities` avec `entity` et, facultativement, `label`. Un clic sur une ligne ouvre la fiche native Home Assistant de l'entité. Cela permet de consulter ou commander des entités qui ne correspondent pas aux champs spécialisés de la carte, sans ajouter de cartes sous le PC.

```yaml
extra_sections:
  - title: Système
    entities:
      - entity: sensor.pc_linux_cpu_load_average
        label: Charge CPU
      - entity: switch.pc_linux_do_not_disturb
        label: Ne pas déranger
```

## Exemple minimal — UNRAID

Consultez [examples/dashboard.yaml](examples/dashboard.yaml) pour une configuration complète avec Docker et VM.
Une configuration autonome et neutralisée est disponible dans [`examples/unraid-card.yaml`](examples/unraid-card.yaml).

```yaml
type: custom:auralis-unraid-card
name: Atlas
theme: carbon
card_background:
  mode: gradient
  gradient: "linear-gradient(145deg, #09111A 0%, #0D1822 58%, #081018 100%)"
show_grid: false
status_entity: binary_sensor.unraid_online
array_usage_entity: sensor.unraid_array_usage
array_label_entity: sensor.unraid_array_capacity
disk_temperature_entity: sensor.unraid_disk_max_temperature
parity_entity: sensor.unraid_parity_status
parity_age_entity: sensor.unraid_last_parity_check
parity_errors_entity: sensor.unraid_parity_errors
disks:
  - name: Disque 1
    group: array
    show_on_card: true
    usage_entity: sensor.unraid_disk_1_usage
    capacity_entity: sensor.unraid_disk_1_capacity
    temperature_entity: sensor.unraid_disk_1_temperature
    status_entity: binary_sensor.unraid_disk_1_healthy
docker_group_labels:
  default: Applications
  media: Multimédia
vm_group_labels:
  default: Machines virtuelles
  production: Production
docker:
  - name: Plex
    group: media
    entity: switch.unraid_docker_plex
    restart_entity: button.unraid_docker_plex_restart
    stop_entity: button.unraid_docker_plex_stop
vms:
  - name: HomeLab Ubuntu
    group: production
    entity: switch.unraid_vm_homelab
    start_entity: button.unraid_vm_homelab_start
    stop_entity: button.unraid_vm_homelab_stop
    restart_entity: button.unraid_vm_homelab_restart
    pause_entity: button.unraid_vm_homelab_pause
    resume_entity: button.unraid_vm_homelab_resume
    console_url: https://unraid.example.local/vms/homelab
```

La carte principale affiche deux cadrans circulaires CPU/RAM côte à côte, l’occupation et l’état de l’array en contexte, et les disques sélectionnés. Le rail ouvre trois fonctions séparées : **Détails**, **Docker** et **VM** ; le bouton **Disques** du panneau inférieur ouvre la liste complète des volumes. La pop-up Détails regroupe l’état du serveur, l’array, le CPU, la RAM, le réseau, la parité et l’onduleur sans mélanger les listes Docker, VM ou disques.

Chaque entrée de `disks` accepte `group` pour séparer l’array des caches et pools, `show_on_card` pour l’inclure ou non dans le panneau inférieur, et `healthy_state` pour les intégrations dont un capteur binaire à `off` signifie « sain ». Le champ `name` devient le libellé affiché. `docker_group_labels` et `vm_group_labels` remplacent les libellés de groupe sans modifier les valeurs `group` des éléments. Les sections et commandes sans entité configurée sont masquées.

`wake_entity` démarre le serveur éteint : un script, un bouton Wake-on-LAN ou un interrupteur. Le bouton **Réveiller le serveur** n’apparaît sous l’état que lorsque le serveur est hors ligne, puis indique « Démarrage demandé… » pendant trois minutes.

Les pop-up Docker et VM sont indépendantes. Chaque élément distingue les états actif, arrêté, suspendu et indisponible, et son icône devient verte lorsqu’il fonctionne. Une entité `switch` sert automatiquement au démarrage et à l’arrêt lorsque `start_entity` ou `stop_entity` ne sont pas fournis. Les commandes dédiées restent recommandées pour les intégrations UNRAID qui les exposent. L’arrêt et le redémarrage demandent confirmation.

## Exemple minimal — Proxmox

```yaml
type: custom:auralis-proxmox-card
name: Nova
theme: carbon
background_image: /local/auralis-cards/images/proxmox.jpg
accent_color: "#50d59b"
status_entity: binary_sensor.proxmox_online
version_entity: sensor.proxmox_version
quorum_entity: sensor.proxmox_quorum
cpu_entity: sensor.proxmox_cpu
memory_entity: sensor.proxmox_memory_percent
memory_label_entity: sensor.proxmox_memory_used
storages:
  - name: Local système
    usage_entity: sensor.proxmox_local_percent
    capacity_entity: sensor.proxmox_local_capacity
  - name: Volumes des VM
    usage_entity: sensor.proxmox_lvm_percent
  - name: Sauvegardes
    usage_entity: sensor.proxmox_backup_percent
    show_on_card: false
disks:
  - name: SSD système
    status_entity: sensor.proxmox_ssd_health
    capacity_entity: sensor.proxmox_ssd_capacity
    temperature_entity: sensor.proxmox_ssd_temperature
ceph_entity: sensor.proxmox_ceph_health
backup_entity: sensor.proxmox_next_backup
alerts_entity: sensor.proxmox_active_alerts
backup_action_entity: button.proxmox_backup_now
vms:
  - name: Home Assistant
    entity: switch.proxmox_vm_home_assistant
    node: pve-01
    vcpus: 4
    memory: 8 Go
    start_entity: button.proxmox_vm_home_assistant_start
containers:
  - name: Mosquitto
    entity: switch.proxmox_lxc_mosquitto
    node: pve-01
    restart_entity: button.proxmox_lxc_mosquitto_restart
```

Une carte représente un nœud Proxmox. Son état apparaît sous son nom, puis deux cadrans circulaires affichent CPU et RAM côte à côte. `cpu_entity` et `memory_entity` attendent des pourcentages de 0 à 100 ; une valeur en GiB ne doit pas être utilisée comme pourcentage. `memory_label_entity` peut afficher une quantité de mémoire dans les détails. Les jauges indisponibles sont masquées, tandis que 0 % reste une valeur valide.

Le panneau inférieur contient uniquement les entrées de `storages`, sans limite de nombre. Chaque `name` est libre. `show_on_card: false` masque une entrée de la façade tout en la conservant dans la pop-up. Le bouton **Disques** ouvre les stockages et les disques physiques de `disks`. Les champs facultatifs sont `usage_entity` (pourcentage utilisé), `capacity_entity` (capacité ou résumé), `status_entity` et `temperature_entity`. Un disque sans mesure d’occupation reste visible avec ses autres informations, sans inventer un taux d’utilisation.

Le rail comporte **Détails du nœud**, **VM** et **LXC**. Chaque pop-up VM/LXC présente exclusivement son type de charge, avec recherche, groupes, filtres, sélection multiple et commandes disponibles. Chaque charge accepte `start_entity`, `stop_entity`, `restart_entity`, `pause_entity`, `resume_entity` et `console_url` : une charge arrêtée propose **Démarrer**, une charge active **Pause**, **Redémarrer**, **Éteindre** (VM) ou **Arrêter** (LXC) et **Console**, une charge suspendue **Reprendre** et l’arrêt. Seules les commandes configurées apparaissent ; un `switch` sert de repli pour démarrer et arrêter. Le redémarrage et l’arrêt demandent confirmation. Les icônes sont vertes pour les charges actives, neutres pour les charges arrêtées, orange pour les suspendues et atténuées pour les indisponibles. Les groupes se nomment via `group` et chaque charge via `name`.

La pop-up Détails regroupe l’état, CPU, RAM, version, quorum, température, uptime, réseau, Ceph, sauvegarde et alertes si leurs capteurs sont disponibles. Elle ne répète aucune liste de disques, VM ou LXC. L’ancien bouton circulaire était la commande de sauvegarde : elle se trouve désormais ici, avec son libellé explicite. Les commandes sensibles conservent leur confirmation.

`wake_entity` démarre le nœud éteint (script, bouton Wake-on-LAN ou interrupteur). Le bouton **Démarrer le nœud** n’apparaît que lorsque le nœud est hors ligne.

Compatibilité : `cluster_usage_entity` reste un alias CPU ; `storage_entity` et `storage_label_entity` fournissent une ligne de stockage lorsque `storages` est absent. Consultez [l’exemple YAML Proxmox complet](examples/proxmox-card.yaml) et remplacez ses entités d’exemple par celles de votre nœud.

### Informations libres sur la carte Proxmox (depuis 0.12.2)

Depuis 0.12.3, la hauteur Proxmox suit automatiquement son contenu dans une vue Sections. Pour une carte existante qui conserve une hauteur enregistrée, remplacer uniquement `rows` par `auto` dans son bloc `grid_options` (garder la valeur actuelle de `columns`). Cela évite l'espace vide sous le fond de la carte. Par exemple :

```yaml
grid_options:
  columns: 6
  rows: auto
```

Entre les cadrans et le stockage, `info_items` affiche les informations choisies par l'utilisateur. La liste n'a pas de limite de nombre et suit l'ordre du YAML. Pour supprimer la zone, omettre la clé ou utiliser `info_items: []`. `info_columns` règle le nombre de colonnes (1 à 4, 3 par défaut, au maximum 2 sur petit écran). Les lignes supplémentaires agrandissent la carte.

```yaml
info_columns: 3
info_items:
  - label: En ligne depuis
    icon: mdi:clock-outline
    entity: sensor.mon_noeud_uptime
    format: duration
    duration_unit: hours
  - label: Sauvegarde
    icon: mdi:backup-restore
    entity: sensor.mon_noeud_last_backup
    format: datetime
    active_entity: binary_sensor.mon_noeud_backup_running
    active_state: "on"
    active_text: En cours
  - label: RAM utilisée
    icon: mdi:memory
    entity: sensor.mon_noeud_memory_used
    format: ratio
    total_entity: sensor.mon_noeud_memory_total
    unit: Gio
    precision: 1
```

Chaque entrée demande une `entity`. `label` et `icon` sont libres ; sans libellé, le nom de l'entité est utilisé. `attribute` permet de lire un attribut au lieu de l'état. `show: false` masque une tuile. Les données absentes, invalides ou indisponibles sont masquées par défaut ; `hide_unavailable: false` affiche « Indisponible ».

| Format | Affichage et options |
| --- | --- |
| `state` (défaut) | État de n'importe quelle entité, par exemple température, débit ou version. `unit` remplace le suffixe et `precision` règle les décimales (0 à 6). |
| `duration` | Durée numérique en jours/heures, puis heures/minutes pour moins d'un jour. `duration_unit` : `seconds`, `minutes`, `hours` ou `days`. Sans ce champ, utilise l'unité du capteur (s, min, h, d), ou les secondes si aucune unité n'est déclarée. |
| `datetime` | Date ISO affichée en date/heure locales du navigateur. |
| `ratio` | Valeur / total, avec `total_entity` et éventuellement `total_attribute`. Les deux valeurs doivent être dans la même unité : `unit` modifie le texte, sans conversion. |

Pour tous les formats, `active_entity` remplace temporairement la valeur par `active_text` (défaut « En cours ») lorsque son état correspond à `active_state` (défaut `"on"`). Les tuiles sont informatives et ne déclenchent aucune commande. Exemple : ajouter une quatrième entrée avec `label: Température`, `entity: sensor.mon_noeud_temperature` et `icon: mdi:thermometer`.

## Sécurité

Les cartes appellent uniquement les services Home Assistant associés aux entités configurées. Ne placez aucun jeton ou mot de passe dans la configuration Lovelace. Les actions dangereuses sont affichées séparément et demandent confirmation.

## Vérification visuelle locale

Après `npm run verify`, lancer la démo avec `npm run dev -- --host 127.0.0.1 --port 4173`, puis `node scripts/verify-machine-ui.cjs` dans un environnement disposant de Playwright et d’Edge. Le script teste le bundle distribué avec des données simulées. `AURALIS_PLAYWRIGHT_MODULE` peut désigner une installation existante de Playwright ; `AURALIS_BROWSER_CHANNEL` permet de choisir un autre navigateur installé. Les captures sont enregistrées dans `dist/ui-audit`.

## Licence

MIT
