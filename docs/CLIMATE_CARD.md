# Carte Climat des pièces Auralis

La carte `custom:auralis-climate-card` réunit les capteurs de température de la maison dans une seule carte. Chaque pièce a sa tuile : température colorée selon un palier de confort, humidité, minimum et maximum de la période, et une courbe qui change de couleur quand elle traverse un palier. Un résumé indique la moyenne intérieure, la pièce la plus fraîche, la plus chaude et la température extérieure.

Avec `layout: chart`, les pièces sont réunies dans un seul graphe, à côté de la liste des pièces : voir [Graphe global](#graphe-global).

Elle ne commande rien : pour régler une consigne, utilisez la [carte Thermostats](THERMOSTAT_CARD.md).

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/climate-card.yaml).

## Configuration

`rooms` est la seule option obligatoire. Chaque pièce accepte :

| Option | Rôle |
| --- | --- |
| `temperature_entity` | Capteur `sensor.*` de température. Obligatoire. |
| `humidity_entity` | Capteur `sensor.*` d'humidité, affiché sur la tuile et tracé dans la fenêtre. |
| `battery_entity` | Capteur `sensor.*` de batterie en pourcentage. |
| `name` | Nom affiché. Sans cette option, le nom Home Assistant du capteur est utilisé. |
| `icon` | Icône de la tuile. |
| `outdoor` | `true` pour un capteur extérieur : échelle de couleurs extérieure, et capteur exclu de la moyenne. |
| `color` | Couleur de la courbe dans le graphe global (`#RRGGBB`). Sans cette option, la couleur dépend de la position de la pièce dans la liste. |

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `layout` | `tiles` | `tiles` : une tuile par pièce. `chart` : un graphe global et la liste des pièces. |
| `chart_metric` | `temperature` | Mesure affichée à l'ouverture du graphe global : `temperature` ou `humidity`. |
| `graph_hours` | `24` | Durée des courbes (tuiles ou graphe global), de 1 à 168 heures. |
| `columns` | automatique | Nombre de colonnes, de 1 à 6. La carte repasse à deux puis une colonne quand elle est étroite. |
| `low_battery` | `20` | Pourcentage à partir duquel une batterie est signalée. |
| `show_summary` | `true` | Affiche le bandeau de résumé. |
| `show_header` | `true` | Affiche l'en-tête (icône, `name`, état des capteurs). |
| `thresholds` | voir ci-dessous | Paliers de couleur des pièces intérieures. |
| `outdoor_thresholds` | voir ci-dessous | Paliers de couleur des pièces `outdoor: true`. |

Les options visuelles communes `theme`, `accent_color`, `card_background`, `show_grid`, `background_image`, `background_position`, `image_opacity` et `image_brightness` sont acceptées. Le fond et le texte suivent le thème (`halo` et `aurora` clairs, `carbon` et `mono` sombres) ; avec une image de fond, la carte garde un voile sombre et un texte clair.

## Paliers de couleur

Un palier s'applique aux températures strictement inférieures à `below`. Le dernier palier n'a pas de borne et couvre tout le reste. Les valeurs sont comparées dans l'unité du capteur ; les paliers par défaut sont pensés pour des degrés Celsius.

| Intérieur | Couleur | | Extérieur | Couleur |
| --- | --- | --- | --- | --- |
| moins de 17 · Froid | `#5AA9FF` | | moins de 0 · Gel | `#CFE9FF` |
| moins de 19 · Frais | `#5FD4E6` | | moins de 10 · Froid | `#7CCBFF` |
| moins de 22 · Confort | `#5BD69B` | | moins de 15 · Frais | `#4D9FFF` |
| moins de 24 · Doux | `#FFC45F` | | moins de 19 · Doux | `#8FE3B0` |
| moins de 26 · Chaud | `#FF9A5C` | | moins de 25 · Agréable | `#5BD69B` |
| au-delà · Très chaud | `#FF6B74` | | moins de 30 · Chaud | `#FF9A5C` |
| | | | au-delà · Très chaud | `#FF6B74` |

Pour les remplacer, donnez la liste complète :

```yaml
thresholds:
  - below: 18
    color: "#5AA9FF"
    label: Froid
  - below: 22
    color: "#5BD69B"
    label: Confort
  - color: "#FF6B74"
    label: Chaud
```

Une liste vide ou sans couleur valide est ignorée et les paliers par défaut sont conservés.

## Graphe global

```yaml
type: custom:auralis-climate-card
layout: chart
rooms:
  - name: Salon
    temperature_entity: sensor.salon_temperature
    humidity_entity: sensor.salon_humidity
  - name: Chambre
    temperature_entity: sensor.chambre_temperature
    humidity_entity: sensor.chambre_humidity
  - name: Extérieur
    temperature_entity: sensor.exterieur_temperature
    outdoor: true
```

- **Le graphe** trace une courbe par pièce. En haut à droite, « 24 h », « 3 j » et « 7 j » changent la période (la carte s'ouvre sur `graph_hours`, ajoutée à la liste si elle diffère), et les deux boutons à icône passent de la température à l'humidité.
- **La moyenne intérieure** est tracée en trait épais blanc (sombre sur un thème clair) : moyenne, point par point, des pièces qui ne sont pas `outdoor`. Elle est aussi en tête de la liste, avec la température et l'humidité moyennes actuelles ; un appui l'affiche seule. Le résumé ajoute « Humidité moyenne » à côté de la température moyenne.
- **La liste des pièces**, à droite sur deux colonnes (sous le graphe sur un écran étroit), sert de légende : un trait de la couleur de la courbe et le nom, puis la valeur actuelle de la mesure affichée et celle de l'autre mesure. Comme sur les tuiles, la bordure et la température prennent la couleur du palier de température.
- **Une seule pièce** : un appui sur une pièce de la liste n'affiche que sa courbe. Un nouvel appui, ou le bouton « Toutes les pièces », revient à toutes les courbes. Le bouton ⓘ ouvre la fenêtre de la pièce.
- **Lire une valeur** : survolez le graphe, ou touchez-le, pour afficher l'heure et la valeur de chaque courbe. Au clavier, le graphe prend le focus ; les flèches le parcourent (Maj pour aller plus vite), Début et Fin vont aux extrémités, Échap efface la lecture.
- **L'extérieur** n'est pas tracé avec les autres pièces, pour ne pas écraser les courbes intérieures ; sa ligne de la liste est atténuée, et un appui l'affiche seul.
- **Couleurs** : huit couleurs choisies pour rester distinctes, daltonisme compris, avec une variante pour les thèmes clairs et une pour les thèmes sombres. La couleur suit la pièce : masquer ou isoler une courbe ne repeint pas les autres. Au-delà de huit pièces, les mêmes couleurs reviennent en tirets, puis en pointillés.
- En mode humidité, une pièce sans `humidity_entity` est atténuée dans la liste.

## Fenêtre d'une pièce

Un appui sur une tuile ouvre la fenêtre de la pièce : température actuelle, batterie, minimum, moyenne et maximum, puis les courbes de température et d'humidité sur 24 heures ou 7 jours. Les boutons du bas ouvrent la fiche Home Assistant de chaque capteur.

## Données et limites

- Les courbes viennent de l'historique Home Assistant (Recorder). Un capteur exclu de l'enregistrement affiche « Aucun historique », sans valeur inventée.
- Le minimum, le maximum et la moyenne sont calculés sur les mesures brutes de la période (et la mesure actuelle), pas sur les points du tracé, qui sont des moyennes par intervalle et écrêteraient les pics. La moyenne est pondérée par la durée de chaque valeur.
- Toutes les températures des tuiles (et, en graphe global, les humidités) sont chargées en une seule requête, renouvelée toutes les cinq minutes, ou toutes les 30 minutes pour une période de plus de 48 h. Les courbes de la fenêtre ne sont chargées qu'à son ouverture.
- La période de 7 jours suppose que le Recorder conserve au moins sept jours (dix par défaut).
- Un capteur indisponible reste visible, atténué, et il est compté dans le résumé. Il n'entre pas dans la moyenne.
- Une batterie faible est signalée sur la tuile et dans le résumé ; le pourcentage exact est dans la fenêtre.
