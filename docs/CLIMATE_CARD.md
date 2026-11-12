# Carte Climat des pièces Auralis

La carte `custom:auralis-climate-card` réunit les capteurs de température de la maison dans une seule carte. Chaque pièce a sa tuile : température colorée selon un palier de confort, humidité, minimum et maximum de la période, et une courbe qui change de couleur quand elle traverse un palier. Un résumé indique la moyenne intérieure, la pièce la plus fraîche, la plus chaude et la température extérieure.

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

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `graph_hours` | `24` | Durée des courbes des tuiles, de 1 à 168 heures. |
| `columns` | automatique | Nombre de colonnes, de 1 à 6. La carte repasse à deux puis une colonne quand elle est étroite. |
| `low_battery` | `20` | Pourcentage à partir duquel une batterie est signalée. |
| `show_summary` | `true` | Affiche le bandeau de résumé. |
| `thresholds` | voir ci-dessous | Paliers de couleur des pièces intérieures. |
| `outdoor_thresholds` | voir ci-dessous | Paliers de couleur des pièces `outdoor: true`. |

Les options visuelles communes `theme`, `accent_color`, `card_background`, `show_grid`, `background_image`, `background_position`, `image_opacity` et `image_brightness` sont acceptées.

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

## Fenêtre d'une pièce

Un appui sur une tuile ouvre la fenêtre de la pièce : température actuelle, batterie, minimum, moyenne et maximum, puis les courbes de température et d'humidité sur 24 heures ou 7 jours. Les boutons du bas ouvrent la fiche Home Assistant de chaque capteur.

## Données et limites

- Les courbes viennent de l'historique Home Assistant (Recorder). Un capteur exclu de l'enregistrement affiche « Aucun historique », sans valeur inventée.
- Toutes les températures des tuiles sont chargées en une seule requête, renouvelée toutes les cinq minutes. Les courbes de la fenêtre ne sont chargées qu'à son ouverture.
- La période de 7 jours suppose que le Recorder conserve au moins sept jours (dix par défaut).
- Un capteur indisponible reste visible, atténué, et il est compté dans le résumé. Il n'entre pas dans la moyenne.
- Une batterie faible est signalée sur la tuile et dans le résumé ; le pourcentage exact est dans la fenêtre.
