# Carte Onglets Auralis

La carte `custom:auralis-tabs-card` range plusieurs cartes sous des onglets. Chaque onglet contient une ou plusieurs cartes, Auralis ou non : une carte Lumières, une tuile Home Assistant, un graphique, une carte d'une autre extension…

Elle évite les vues trop longues sur une tablette : une seule zone de l'écran, et un appui pour passer de « Lumières » à « Volets » ou « Caméras ».

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/tabs-card.yaml).

Les cartes des onglets s'écrivent en YAML : l'éditeur visuel règle les options de la carte, et le champ « Onglets et cartes » ouvre l'éditeur YAML des onglets.

## Configuration

`tabs` est la seule option obligatoire. Chaque onglet accepte :

| Option | Rôle |
| --- | --- |
| `label` | Nom de l'onglet (`name` est accepté). Sans nom : « Onglet 2 »… |
| `icon` | Icône de l'onglet. |
| `cards` | Liste des cartes de l'onglet, au même format que dans un tableau de bord. |
| `card` | Une carte seule, à la place de `cards`. |
| `columns` | Nombre de colonnes des cartes de l'onglet, de 1 à 4. Une seule colonne sur un écran étroit. |
| `badge_entity` | Entité affichée en pastille : un nombre (rouge, « 99+ » au-delà) ou un point de couleur quand l'entité est active (`on`, `open`, `detected`…). |

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `default_tab` | `1` | Onglet ouvert au chargement, compté à partir de 1. |
| `remember_tab` | `false` | Rouvre le dernier onglet choisi, sur cet appareil et ce navigateur. |
| `id` | — | Clé de mémorisation, à donner quand deux cartes Onglets ont les mêmes noms d'onglets sur la même vue. |
| `tab_style` | `pills` | `pills` (pastilles dans une barre) ou `underline` (soulignés). |
| `show_labels` | `true` | `false` n'affiche que les icônes ; le nom reste lu par les lecteurs d'écran. |
| `framed` | `false` | Entoure les onglets et leur contenu d'un cadre Auralis. Sans cadre, les cartes gardent leur propre fond. |
| `swipe` | `false` | Glisser horizontalement sur le contenu (écran tactile) pour changer d'onglet. Laissez-le désactivé si les onglets contiennent des curseurs horizontaux. |
| `name` | `Onglets` | Nom de la barre d'onglets pour les lecteurs d'écran. |

Les options visuelles communes `theme` et `accent_color` sont acceptées. L'accent colore l'onglet actif.

## Exemple

```yaml
type: custom:auralis-tabs-card
remember_tab: true
tabs:
  - label: Lumières
    icon: mdi:lightbulb-group-outline
    cards:
      - type: custom:auralis-lights-card
        groups:
          - name: Salon
            lights: [light.salon_plafond, light.salon_lampe]
  - label: Volets
    icon: mdi:window-shutter
    card:
      type: custom:auralis-covers-card
      groups:
        - name: Rez-de-chaussée
          covers: [cover.gr_volet_rdc]
  - label: Caméras
    icon: mdi:cctv
    badge_entity: binary_sensor.cam_rouderes_mouvement
    columns: 2
    cards:
      - type: tile
        entity: camera.cam_rouderes_fluide
      - type: tile
        entity: camera.cam_int_garderie_fluide
```

## Fonctionnement

- Les cartes d'un onglet sont créées à sa première ouverture, puis conservées : revenir sur un onglet ne recharge pas ses cartes et garde leur état (fenêtre ouverte exceptée).
- Les cartes des onglets reçoivent les mises à jour de Home Assistant même quand l'onglet est caché.
- Clavier : les flèches, Début et Fin changent d'onglet quand la barre a le focus.
- Dans une vue en sections, la carte occupe toute la largeur de sa section et sa hauteur suit l'onglet ouvert.
