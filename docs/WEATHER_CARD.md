# Carte Météo Auralis

La carte `custom:auralis-weather-card` sert d'en-tête à un tableau de bord. Elle affiche :

- une salutation, la date et l'heure ;
- la température et le temps actuels ;
- l'humidité, le vent, le risque de pluie et le prochain lever ou coucher du soleil ;
- un bandeau de prévisions coloré.

Le fond suit le temps : ciel bleu et halo doré au soleil, bleu acier sous la pluie, violet pour l'orage. La nuit, il s'assombrit et des étoiles apparaissent par ciel dégagé.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/weather-card.yaml).

Dans l'éditeur visuel, Home Assistant propose la carte quand vous partez d'une entité `weather.*`.

## Configuration

`entity` est la seule option obligatoire.

| Option | Défaut | Rôle |
| --- | --- | --- |
| `entity` | — | Entité `weather.*` : conditions actuelles et prévisions. |
| `temperature_entity` | — | Capteur `sensor.*` de température local, affiché à la place de celle du service météo. |
| `humidity_entity` | — | Capteur `sensor.*` d'humidité local, prioritaire sur celle du service météo. |
| `sun_entity` | `sun.sun` | Entité soleil : lever, coucher et passage en mode nuit. |
| `alert_entity` | — | Entité de vigilance. `vert`, `jaune`, `orange` et `rouge` (ou `green`, `yellow`, `red`) sont colorés ; tout autre état est affiché tel quel. |
| `forecast_type` | `daily` | Bandeau de prévisions : `daily` (jours), `hourly` (heures) ou `twice_daily` (jour et nuit). Si le service ne le fournit pas, la carte prend un autre type disponible. |
| `forecast_count` | 5 jours, 8 heures | Nombre de prévisions du bandeau, de 1 à 12. Le bandeau défile s'il manque de place. |
| `show_clock` | `true` | Affiche l'horloge. Sans elle, le nom du lieu prend sa place. |
| `show_greeting` | `true` | Affiche « Bonjour », « Bon après-midi », « Bonsoir » ou « Bonne nuit » devant la date. |
| `show_forecast` | `true` | Affiche le bandeau de prévisions. |
| `dynamic_background` | `true` | Fond qui suit le temps. `false` garde le fond Auralis standard. |
| `name` | nom de l'entité | Nom du lieu. |
| `icon` | `mdi:map-marker-outline` | Icône devant le nom du lieu. |
| `thresholds` | paliers extérieurs | Paliers de couleur des températures, au même format que la [carte Climat](CLIMATE_CARD.md#paliers-de-couleur). |

Les options visuelles communes `theme`, `accent_color` et `card_background` sont acceptées. Un `card_background` remplace le fond dynamique. Sans `accent_color`, l'accent prend la couleur du temps actuel.

## Couleurs

Les températures (actuelle, maximales du bandeau, barres de plage) utilisent les paliers extérieurs de la carte Climat :

| Plage | Couleur |
| --- | --- |
| moins de 0 · Gel | `#CFE9FF` |
| moins de 10 · Froid | `#7CCBFF` |
| moins de 15 · Frais | `#4D9FFF` |
| moins de 19 · Doux | `#8FE3B0` |
| moins de 25 · Agréable | `#5BD69B` |
| moins de 30 · Chaud | `#FF9A5C` |
| au-delà · Très chaud | `#FF6B74` |

Dans le bandeau des jours, chaque barre verticale va de la minimale à la maximale du jour, sur une échelle commune à tous les jours affichés. Son dégradé change de couleur à chaque palier traversé.

## Fenêtre de détail

Un appui sur la carte ouvre une fenêtre avec :

- **Mesures actuelles** : ressenti, humidité, point de rosée, pression, vent, rafales, indice UV, couverture nuageuse, visibilité, lever et coucher du soleil. Seules les valeurs fournies par le service météo apparaissent.
- **Prochaines heures** : courbe de température sur 24 heures, barres de risque de pluie et détail heure par heure.
- **Prochains jours** : jusqu'à 10 jours avec temps, risque de pluie, minimale, barre de plage et maximale.

Les boutons du bas ouvrent la fiche Home Assistant du service météo, du capteur local et de la vigilance.

## Données et limites

- Les prévisions sont reçues par abonnement (`weather/subscribe_forecast`, Home Assistant 2023.9 ou plus récent) et mises à jour dès que le service météo en publie de nouvelles. Les anciennes intégrations qui exposent encore l'attribut `forecast` restent prises en charge.
- La carte s'abonne aux prévisions journalières et horaires quand le service les fournit, pour remplir le bandeau et les deux onglets de la fenêtre.
- Le maximum et le minimum du jour viennent de la prévision journalière. Le risque de pluie affiché sur la carte est le plus élevé des trois prochaines heures, ou à défaut celui du jour.
- Le mode nuit suit `sun.sun`. Sans cette entité, la nuit va de 20 h à 7 h.
- L'heure, la date et les jours sont affichés dans le fuseau horaire configuré dans Home Assistant.
