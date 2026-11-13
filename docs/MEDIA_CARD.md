# Carte Média Auralis

La carte `custom:auralis-media-card` pilote les lecteurs multimédias de la maison : ampli audio-vidéo, enceintes connectées, télévision. Elle affiche la pochette du morceau en fond flou, le titre et l'artiste, la progression de la lecture, puis les commandes utiles à l'appareil :

- la lecture (précédent, lecture/pause, suivant) ;
- un curseur de volume qui ne dépasse jamais le maximum choisi ;
- la sourdine ;
- les sources favorites.

Pour un ampli sans morceau en cours, la carte affiche la source et le mode sonore actifs (« Télé · Dolby Surround »).

Plusieurs lecteurs peuvent partager la même carte : des pastilles en haut permettent de passer de l'un à l'autre (au clavier : flèches gauche et droite). Par défaut, la carte montre celui qui joue.

### Lecteur affiché

1. Le lecteur choisi avec une pastille reste affiché. Ce choix tombe quand ce lecteur s'éteint pendant qu'un autre joue.
2. Sans choix, la carte ne change pas de lecteur sous le doigt : elle garde celui affiché tant que la fenêtre du lecteur est ouverte, et pendant 8 secondes après chaque action (bouton, curseur, pastille).
3. Ensuite, elle montre celui qui joue, sinon celui qui est allumé, sinon le premier.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/media-card.yaml).

Dans l'éditeur visuel, Home Assistant propose la carte quand vous partez d'une entité `media_player.*`.

## Configuration

Un seul lecteur s'écrit directement :

```yaml
type: custom:auralis-media-card
entity: media_player.tx_nr686
name: Ampli
max_volume: 60
```

Plusieurs lecteurs passent par `players`. Chaque lecteur accepte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `entity` | | Entité `media_player.*`. Obligatoire. |
| `name` | nom Home Assistant | Nom affiché. |
| `icon` | selon l'appareil | Icône quand il n'y a pas de pochette. |
| `device_class` | déduit | `receiver` (ampli, ambre), `speaker` (enceinte, violet) ou `tv` (bleu). Sans cette option, la classe de l'entité est utilisée. Un appareil qui propose des modes sonores est considéré comme un ampli. |
| `color` | selon l'appareil | Couleur du lecteur (curseur, boutons, halo). |
| `sources` | toutes | Sources favorites, dans l'ordre. Chaque source est un nom de la liste `source_list` de l'appareil, ou un objet `source`, `name`, `icon`. |
| `max_volume` | `100` | Volume maximal autorisé par la carte, en pourcentage (5 à 100). |
| `volume_step` | `2` | Pas des boutons − et +, en pourcentage (1 à 20). |
| `volume_scale` | | Affiche le volume sur cette échelle au lieu d'un pourcentage. Par exemple `80` pour retrouver le chiffre de l'afficheur de l'ampli. |

Avec `entity`, ces options s'écrivent directement au niveau de la carte.

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `name` | `Multimédia` | Titre de l'en-tête. Avec `entity`, c'est le nom du lecteur. |
| `icon` | `mdi:music-box-multiple-outline` | Icône de l'en-tête. |
| `show_header` | avec `players` et `name` | Affiche l'en-tête avec le nombre de lecteurs allumés ou en lecture. |
| `show_sources` | `true` | Affiche les sources favorites sur la carte. |
| `show_progress` | `true` | Affiche la progression du morceau. |

Les options visuelles communes `theme`, `accent_color` et `card_background` sont acceptées. `accent_color` remplace la couleur de tous les lecteurs qui n'ont pas de `color`.

## Commandes

La carte n'affiche que les commandes que l'appareil prend en charge (attribut `supported_features`). Un ampli Onkyo, par exemple, n'a ni « précédent » ni « suivant » : la rangée de lecture disparaît et la carte se concentre sur le volume et les sources.

- **Marche/arrêt** : bouton en haut à droite. Un appareil éteint ou en veille affiche un bouton « Allumer » à la place des commandes.
- **Volume** : le curseur envoie la valeur au relâchement ; pendant le glissement, il n'est jamais ramené en arrière par une mise à jour de l'appareil. Les boutons − et + utilisent `volume_step`. Si l'appareil ne permet pas de choisir une valeur précise, la carte utilise ses commandes − et + d'origine. Le maximum `max_volume` s'applique dans tous les cas.
- **Sources** : un appui sélectionne la source. La source active est mise en couleur ; les sources sont grisées le temps du changement.
- **Échecs** : si l'appareil refuse une commande, son bouton clignote en rouge et un message en haut de l'écran donne la raison.
- **Pochette** : une pochette qui ne se charge pas est remplacée par l'icône de l'appareil.

## Fenêtre du lecteur

Un appui sur la pochette ou l'icône ouvre la fenêtre du lecteur :

- la pochette en grand et la position de lecture, réglable si l'appareil le permet (le curseur reste où vous le lâchez le temps que l'appareil suive) ;
- la lecture, avec la lecture aléatoire et la répétition quand elles existent ;
- le volume ;
- **toutes** les sources de l'appareil, avec les noms et icônes de vos favorites ;
- les modes sonores de l'ampli (Stéréo, Direct, Dolby Surround…) ;
- les boutons Éteindre et Fiche.

## Noms des sources

Les noms à indiquer dans `sources` sont ceux de l'attribut `source_list`, visibles dans **Outils de développement → États**. Pour un ampli Onkyo, ce sont souvent des identifiants courts (`tv`, `bd-dvd`, `cbl-sat`, `strm-box`, `game`, `pc`, `bluetooth`, `network`…) : donnez-leur un nom lisible avec `name`.

Sans `icon`, la carte choisit une icône d'après le nom : télévision, Bluetooth, Spotify, réseau, console, Blu-ray, radio, USB, PC, décodeur, platine vinyle, entrée auxiliaire…
