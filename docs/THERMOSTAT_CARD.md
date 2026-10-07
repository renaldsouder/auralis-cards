# Carte Thermostats Auralis

La carte `custom:auralis-thermostat-card` reprend le fond cinématique, la jauge et le panneau vitré Auralis Frame. Elle affiche un ou plusieurs thermostats `climate.*` et permet de choisir celui à piloter sur la carte.

Elle montre la température actuelle, la consigne, l'humidité si elle existe, l'action en cours et les modes annoncés par l'entité. Les boutons −/+ respectent `min_temp`, `max_temp` et `target_temp_step`. Si le thermostat ne fournit pas de consigne simple, les boutons sont désactivés ; une plage `target_temp_low`–`target_temp_high` reste visible et le bouton d'informations ouvre le panneau Home Assistant pour la régler. Une entité indisponible ne reçoit aucune commande.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis utilisez [l'exemple YAML](../examples/thermostat-card.yaml). Aucune ressource Thermostats séparée n'est nécessaire.

## Configuration

Voir [l'exemple YAML](../examples/thermostat-card.yaml). `entity` accepte un thermostat. `entities` accepte une liste ; les doublons sont retirés. `entity_labels` personnalise les noms affichés. Les options visuelles communes `theme`, `card_background`, `show_grid`, `background_image`, `background_position`, `image_opacity` et `accent_color` sont acceptées.
