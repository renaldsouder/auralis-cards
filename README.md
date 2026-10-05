# Auralis Cards

Auralis Cards est une collection de cartes modernes pour Home Assistant : pièce tout-en-un, suivi d’un PC, supervision d’un serveur UNRAID et pilotage d’un cluster Proxmox. Son langage graphique, **Auralis Frame**, associe photographie immersive, informations flottantes et surfaces vitrées.

![Aperçu des cartes Auralis Pièce, PC et UNRAID](docs/auralis-preview.svg)

## Cartes disponibles

- `custom:auralis-room-card`
- `custom:auralis-pc-card`
- `custom:auralis-unraid-card`
- `custom:auralis-proxmox-card`

Thèmes : `auto`, `halo`, `carbon`, `mono`, `aurora`.

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

## Développement

```bash
npm install
npm run dev
npm run verify
```

Le bundle final est généré dans `dist/auralis-cards.js`.

## Installation avec HACS

Une fois le dépôt public créé :

1. Ouvrir **HACS** dans Home Assistant.
2. Ouvrir le menu à trois points puis **Dépôts personnalisés**.
3. Coller l'URL GitHub du dépôt `auralis-cards`.
4. Choisir la catégorie **Dashboard** puis ajouter le dépôt.
5. Télécharger **Auralis Cards** et actualiser le navigateur.

La ressource distribuée par HACS sera disponible sous `/hacsfiles/auralis-cards/auralis-cards.js`. Ce chemin évite le cache persistant utilisé par `/local/`.

## Installation manuelle

1. Copier `dist/auralis-cards.js` dans `config/www/auralis-cards/`.
2. Ajouter `/local/auralis-cards/auralis-cards.js` comme ressource JavaScript de type `module`.
3. Rafraîchir Home Assistant.

Les anciens types `custom:orbit-*` restent temporairement reconnus par le bundle Auralis afin de faciliter la migration. Les nouvelles configurations doivent utiliser `custom:auralis-*`.

Chaque GitHub Release contenant `auralis-cards.js` devient une version sélectionnable et met à disposition les mises à jour dans HACS.

Le fichier `examples/dashboard.yaml` est une configuration complète à coller dans l'éditeur de configuration brute du dashboard. Les blocs commençant directement par `type: custom:...` sont, eux, destinés à l'éditeur YAML d'une carte individuelle.

## Exemple minimal — Pièce

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

`popup_titles` personnalise le titre de chaque pop-up. La section `climate_popup` choisit les capteurs représentés, génère un graphe séparé par capteur et règle la période avec `graph_period_unit: hours`, `days` ou `months`. Un mois correspond à 30 jours dans le graphe d'historique Home Assistant. Une liste `graph_entities: []` désactive les graphes ; les options `show_overview`, `show_current_values` et `show_thermostat` permettent de composer librement le contenu. Les cartes de valeurs actuelles sont masquées par défaut, car le résumé « Confort de la pièce » contient déjà ces mesures.

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
online_entity: binary_sensor.pc_bureau_online
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

La façade reprend la composition Auralis Frame d'origine : cadran CPU, contexte session/uptime et panneau inférieur. Elle affiche chaque entrée valide de `drives` sur une ligne distincte, en plus du GPU et de la mémoire. Un seul bouton **Détails** ouvre les informations secondaires : disques, périphériques audio, alimentation, activité système, interfaces réseau et commandes. Une zone dont la donnée est absente, indisponible ou invalide est entièrement masquée ; une température égale à `0` n'est donc pas présentée comme une mesure réelle. `drives` lit directement les attributs HASS.Agent `UsedSpacePercentage`, `UsedSpaceMB` et `TotalSizeMB`. `last_boot_entity` permet de calculer l'uptime sans capteur modèle. `session_entity` attend l'état de session HASS.Agent (`Locked`, `Unlocked`, `Active` ou `Disconnected`) tandis que `user_entity` contient le nom de l'utilisateur connecté. Consultez [`examples/pc-card.yaml`](examples/pc-card.yaml) pour une configuration complète et neutralisée.

`background_image` ajoute une photographie derrière la carte PC. `image_opacity` règle uniquement l'opacité de ce fond de `0` à `100`, sans modifier les textes, boutons et indicateurs. `background_position` permet de recadrer l'image et `image_brightness` d'ajuster sa luminosité.

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
    usage_entity: sensor.unraid_disk_1_usage
    capacity_entity: sensor.unraid_disk_1_capacity
    temperature_entity: sensor.unraid_disk_1_temperature
    status_entity: binary_sensor.unraid_disk_1_healthy
docker:
  - name: Plex
    entity: switch.unraid_docker_plex
    restart_entity: button.unraid_docker_plex_restart
    stop_entity: button.unraid_docker_plex_stop
vms:
  - name: HomeLab Ubuntu
    entity: switch.unraid_vm_homelab
    start_entity: button.unraid_vm_homelab_start
    stop_entity: button.unraid_vm_homelab_stop
    restart_entity: button.unraid_vm_homelab_restart
    pause_entity: button.unraid_vm_homelab_pause
    resume_entity: button.unraid_vm_homelab_resume
    console_url: https://unraid.example.local/vms/homelab
```

La carte principale affiche l’occupation et la capacité de l’array, la température disque maximale, la santé des disques et les ratios Docker/VM actifs. La pop-up **Explorer** ajoute la parité, la date du dernier contrôle, les erreurs, le détail de chaque disque et le trafic réseau.

Chaque entrée de `disks` accepte `group` pour séparer l’array des caches et pools, ainsi que `healthy_state` pour les intégrations dont un capteur binaire à `off` signifie « sain ». Les champs facultatifs `version_entity`, `updates_entity`, `notifications_entity`, `docker_cpu_entity`, `docker_memory_entity` et `ups_*` restent dans **Explorer** afin de préserver la hiérarchie de la carte principale. Les sections et commandes sans entité configurée sont masquées.

Dans les pop-ups Docker et VM, chaque élément distingue les états actif, arrêté, suspendu et indisponible. Une entité `switch` sert automatiquement au démarrage et à l’arrêt lorsque `start_entity` ou `stop_entity` ne sont pas fournis. Les commandes dédiées restent recommandées pour les intégrations UNRAID qui les exposent. L’arrêt et le redémarrage demandent confirmation.

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
cluster_usage_entity: sensor.proxmox_cpu
memory_entity: sensor.proxmox_memory_percent
memory_label_entity: sensor.proxmox_memory_used
storage_entity: sensor.proxmox_storage_percent
storage_label_entity: sensor.proxmox_storage_used
ceph_entity: sensor.proxmox_ceph_health
backup_entity: sensor.proxmox_next_backup
alerts_entity: sensor.proxmox_active_alerts
backup_action_entity: button.proxmox_backup_now
nodes:
  - name: pve-01
    status_entity: binary_sensor.pve_01_online
    cpu_entity: sensor.pve_01_cpu
    temperature_entity: sensor.pve_01_temperature
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

La carte Nova conserve sa composition immersive tout en affichant en permanence la charge, la mémoire, les nœuds, les ratios de VM/LXC actives, le stockage, Ceph et la prochaine sauvegarde. `alerts_entity` est facultatif et ajoute un signal d’alerte à la synthèse et à la pop-up Cluster. Les valeurs indisponibles restent affichées avec `—` au lieu d’être interprétées comme zéro.

Les pop-up suivent toujours la même organisation : un résumé en tête, les commandes courantes, les éléments individuels, puis une zone séparée pour les actions sensibles avec confirmation. Les listes Proxmox prennent en charge les VM et conteneurs LXC, les filtres, le démarrage multiple et les consoles configurées.

## Sécurité

Les cartes appellent uniquement les services Home Assistant associés aux entités configurées. Ne placez aucun jeton ou mot de passe dans la configuration Lovelace. Les actions dangereuses sont affichées séparément et demandent confirmation.

## Licence

MIT
