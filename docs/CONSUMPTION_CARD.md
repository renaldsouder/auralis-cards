# Carte Consommation par appareil Auralis

La carte `custom:auralis-consumption-card` trace dans un seul graphe la consommation de chaque appareil suivi, comme le graphe global de la [carte Températures](CLIMATE_CARD.md#graphe-global). À droite, la liste des appareils donne la puissance actuelle et l'énergie de la période ; un appui sur un appareil n'affiche que sa courbe, un nouvel appui revient à tous.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md). Configuration minimale :

```yaml
type: custom:auralis-consumption-card
devices:
  - name: Lave-linge
    power_entity: sensor.lave_linge_puissance
```

## Configuration

| Option | Défaut | Rôle |
| --- | --- | --- |
| `devices` | **requis** | Appareils suivis (voir ci-dessous). |
| `total_power_entity` | — | Puissance de toute la maison (compteur Linky, en W ou VA). Ligne « Maison » en tête de liste, tracée seulement quand on la choisit pour ne pas écraser les appareils. |
| `total_energy_entity` | — | Compteur d'énergie de toute la maison (kWh cumulés). |
| `chart_metric` | `power` | Mesure affichée au départ : `power` (puissance, W) ou `energy` (énergie cumulée sur la période, kWh). Sans capteur de puissance, la carte part sur l'énergie. |
| `graph_hours` | `24` | Période affichée au départ, de 1 à 168 heures. Les boutons proposent aussi 24 h, 3 jours et 7 jours. |
| `show_summary` | `true` | Résumé sous le titre : maison, puissance des appareils suivis et leur part, plus gros poste, énergie de la période. |
| `name`, `icon`, `show_header` | « Consommation par appareil » | En-tête de la carte. |

Chaque appareil accepte :

| Option | Rôle |
| --- | --- |
| `name` | Nom affiché ; sinon celui du capteur. |
| `power_entity` | Capteur de puissance instantanée (W). |
| `energy_entity` | Compteur d'énergie cumulée (kWh, `state_class: total_increasing`). |
| `icon` | Icône de l’appareil. |
| `color` | Couleur de la courbe ; sinon la couleur de sa position dans la liste. |

Un appareil a besoin d'au moins `power_entity` ou `energy_entity`. Les options visuelles communes `theme`, `accent_color` et `card_background` sont acceptées.

## Mesures

- **Puissance** : l'historique des capteurs de puissance, moyenné sur 96 intervalles, terminé par la mesure actuelle.
- **Énergie cumulée** : les statistiques horaires du Recorder (`change`), additionnées depuis le début de la période. La dernière valeur de chaque courbe est donc l'énergie consommée sur la période, reprise dans la liste et le résumé. L'heure en cours n'est pas encore comptée.

Survol, toucher ou flèches du clavier sur le graphe : heure et valeur de chaque courbe. Le bouton « i » d'un appareil isolé ouvre sa fiche Home Assistant. L'historique est relu toutes les 5 minutes (30 minutes au-delà de 48 heures).

Les couleurs des courbes reprennent la palette du graphe des températures, validée pour le daltonisme en version claire et sombre ; au-delà de huit appareils, les couleurs reviennent en tirets puis en pointillés.

## Exemple

```yaml
type: custom:auralis-consumption-card
name: Consommation par appareil
theme: carbon
total_power_entity: sensor.compteur_puissance_apparente
total_energy_entity: sensor.compteur_energie
devices:
  - name: Serveur
    power_entity: sensor.serveur_puissance
    energy_entity: sensor.serveur_energie
  - name: Lave-linge
    power_entity: sensor.lave_linge_puissance
    energy_entity: sensor.lave_linge_energie
  - name: Réfrigérateur
    energy_entity: sensor.frigo_energie
```
