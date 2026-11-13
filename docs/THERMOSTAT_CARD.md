# Carte Thermostats Auralis

La carte `custom:auralis-thermostat-card` reprend la jauge et le panneau Auralis Frame. Elle affiche un ou plusieurs thermostats `climate.*` et permet de choisir celui à piloter sur la carte. Le fond et le texte suivent le thème choisi (`halo` et `aurora` clairs, `carbon` et `mono` sombres) ; avec une image de fond, la carte garde un voile sombre et un texte clair pour rester lisible.

Elle montre la température actuelle, la consigne, l'humidité si elle existe, l'action en cours et les modes annoncés par l'entité.

## Réglage de la consigne

- Les boutons −/+ respectent `min_temp`, `max_temp` et `target_temp_step`.
- Chaque pression change aussitôt la valeur affichée. Une seule commande `climate.set_temperature` part 700 ms après la dernière pression : trois pressions rapides envoient directement la valeur finale.
- La valeur envoyée reste affichée jusqu'à ce que Home Assistant la confirme (5 secondes au plus). En cas d'échec, un message apparaît et l'affichage revient à la consigne réelle.
- En mode plage (`heat_cool`), quand le thermostat expose `target_temp_low` et `target_temp_high`, deux réglages « Minimum » et « Maximum » apparaissent ; les deux bornes sont envoyées ensemble et le minimum ne peut pas dépasser le maximum.
- Sans consigne connue, la valeur affichée est « — » et les boutons sont désactivés : la température mesurée n'est jamais présentée comme une consigne.
- Une entité indisponible affiche « Indisponible » et ne reçoit aucune commande. Le bouton d'informations reste utilisable pour ouvrir la fiche Home Assistant.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis utilisez [l'exemple YAML](../examples/thermostat-card.yaml). Aucune ressource Thermostats séparée n'est nécessaire.

## Configuration

Voir [l'exemple YAML](../examples/thermostat-card.yaml).

- `entity` : un thermostat. `entities` : une liste ; les doublons sont retirés.
- `entity_labels` : noms affichés.
- `name`, `icon` : titre et icône de l'en-tête ; `show_header: false` masque l'en-tête.
- Options visuelles communes : `theme`, `card_background`, `show_grid`, `background_image`, `background_position`, `image_opacity` et `accent_color`.

La carte n'impose pas de hauteur : dans une vue Sections, elle suit la hauteur réelle de son contenu (sélecteur de thermostats, plage, modes).
