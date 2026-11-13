# Carte Batteries et alertes Auralis

La carte `custom:auralis-batteries-card` liste au même endroit toutes les piles faibles et tous les appareils qui ne répondent plus. Elle est pensée pour la tablette murale : on voit d'un coup d'œil qu'un capteur est à 9 %, qu'un module d'arrosage signale une pile faible ou qu'un capteur de température est indisponible depuis trois jours.

Aucune liste d'entités n'est nécessaire : la carte trouve seule les piles et les appareils indisponibles. Un appui sur une ligne ouvre la fiche Home Assistant de l'entité.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/batteries-card.yaml). La configuration minimale tient en une ligne :

```yaml
type: custom:auralis-batteries-card
```

## Ce que la carte détecte

| Type | Entités retenues | Lecture |
| --- | --- | --- |
| Pourcentage | `sensor.*` de classe `battery` avec un état numérique (`9`, `9.5`, `98,5`), ou identifiant finissant par `_battery` / `_batterie` en `%` | Critique sous `critical_threshold`, faible sous `low_threshold`, bornes incluses. |
| État texte | `sensor.*` de classe `battery` avec un état texte, ou identifiant finissant par `_battery_state` | `low` / `faible` : faible. `critical` / `critique` / `empty` / `vide` : critique. `medium` / `moyen` : bon, ou faible avec `warn_on_medium`. `high` / `full` / `ok` / `normal` : bon. |
| Capteur binaire | `binary_sensor.*` de classe `battery` | `on` : faible. `off` : bon. |
| Appareil indisponible | Entité à l'état `unavailable` (et `unknown` avec `include_unknown`) dans un domaine de `unavailable_domains` | Regroupée par appareil, avec la durée d'indisponibilité. |

Les entités d'un même appareil sont réunies sur une seule ligne : un capteur mort n'occupe pas six lignes. La carte utilise le registre des appareils de Home Assistant ; sans lui, elle regroupe les entités par début d'identifiant (`sensor.capt_temp_02_temperature` et `sensor.capt_temp_02_humidity` deviennent `capt_temp_02`).

## Configuration

Toutes les options sont facultatives.

| Option | Défaut | Rôle |
| --- | --- | --- |
| `name` | `Batteries et alertes` | Titre de la carte. |
| `icon` | `mdi:battery-alert-variant-outline` | Icône de l'en-tête. |
| `low_threshold` | `20` | Pourcentage à partir duquel une pile est faible. |
| `critical_threshold` | `10` | Pourcentage à partir duquel une pile est critique. Ramené à `low_threshold` s'il le dépasse. |
| `warn_on_medium` | `false` | Signale aussi les piles à l'état texte « moyen ». |
| `show_unavailable` | `true` | Signale les appareils indisponibles. |
| `include_unknown` | `false` | Compte aussi les entités à l'état `unknown` comme indisponibles. |
| `unavailable_domains` | voir ci-dessous | Domaines surveillés pour l'indisponibilité. |
| `include` | — | Entités ou motifs avec `*` ajoutés à la découverte (ex. `sensor.*_pile`). |
| `exclude` | — | Entités ou motifs retirés de la carte (ex. `sensor.*_voltage`). |
| `max_items` | `6` | Lignes affichées sur la carte. Les autres sont dans « Voir tout ». |
| `show_ok` | `false` | Ajoute à la fenêtre une section repliée « Toutes les piles », de la plus faible à la plus chargée. |

Domaines surveillés par défaut : `sensor`, `binary_sensor`, `light`, `switch`, `cover`, `climate`, `lock`, `camera`, `media_player`, `valve`.

`include` et `exclude` acceptent une liste ou un texte séparé par des virgules. `exclude` l'emporte sur `include`. Une entité ajoutée par `include` est lue comme une pile si son état est un pourcentage ou un niveau texte, et signalée si elle est indisponible, quel que soit son domaine.

Les options visuelles communes `theme`, `accent_color` et `card_background` sont acceptées. La carte suit les couleurs du thème : elle convient aux thèmes clairs `halo` et `aurora` comme aux thèmes sombres `carbon` et `mono`.

## Affichage

- L'en-tête résume la situation : « Tout va bien » en vert, « 3 piles faibles » en ambre, « 1 pile critique · 2 appareils indisponibles » en rouge dès qu'une pile est critique ou qu'un appareil est indisponible.
- Les lignes sont triées : piles critiques (la plus faible d'abord), piles faibles, puis appareils indisponibles (le plus ancien d'abord).
- Sans problème, la carte affiche « Toutes les piles sont chargées et tous les appareils répondent. »
- « Voir tout » ouvre une fenêtre par sections : Piles critiques, Piles faibles, Appareils indisponibles, et Toutes les piles avec `show_ok`. On la ferme avec Échap, le bouton Fermer ou un appui hors de la fenêtre.

## Données et limites

- La carte lit tous les états de la maison, mais ne recalcule sa liste d'entités que lorsque des entités apparaissent ou disparaissent. Elle ne se redessine que si ce qu'elle affiche change : un capteur de puissance qui varie chaque seconde ne la sollicite pas.
- Les durées (« depuis 12 min », « depuis 3 h », « depuis 2 j ») viennent du dernier changement d'état de l'entité et avancent chaque minute. Après un redémarrage de Home Assistant, elles repartent de ce redémarrage.
- Les entités masquées ou désactivées dans Home Assistant sont ignorées, sauf si `include` les cite.
- Certaines intégrations laissent des entités indisponibles en permanence : retirez-les avec `exclude`.
- Une entité de pile indisponible n'est pas comptée comme pile : elle apparaît avec son appareil parmi les indisponibles.
- Les états `unknown` sont ignorés par défaut, car beaucoup d'entités le sont brièvement au démarrage. Activez `include_unknown` pour repérer un capteur qui n'a jamais rien envoyé.
