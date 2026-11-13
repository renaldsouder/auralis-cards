# Carte Veille d'écran Auralis

La carte `custom:auralis-screensaver-card` est faite pour une tablette murale allumée toute la journée. Après quelques minutes sans contact, l'écran passe sur une vue calme et sombre :

- une grande horloge et la date, lisibles de loin ;
- le temps et la température ;
- jusqu'à quatre valeurs (température intérieure, consommation…) ;
- un message mis en avant quand une entité d'alerte est active (détecteur de mouvement, sonnette).

Le premier toucher ramène le tableau de bord. Ce toucher ne déclenche rien en dessous : on ne risque pas d'allumer une lumière en réveillant l'écran.

La carte est invisible dans la grille du tableau de bord. En mode modification, elle apparaît sous la forme d'une petite carte « Veille d'écran · après 5 min » pour pouvoir la retrouver et la modifier.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/screensaver-card.yaml).

## Configuration

Aucune option n'est obligatoire : sans rien, la veille affiche l'horloge et la date après 5 minutes.

| Option | Défaut | Rôle |
| --- | --- | --- |
| `timeout` | `300` | Délai sans contact avant la veille, en secondes (15 au minimum). |
| `weather_entity` | — | Entité `weather.*` : icône et temps en français, température. |
| `temperature_entity` | — | Capteur de température local, affiché à la place de celui du service météo. |
| `entities` | — | Jusqu'à 4 valeurs : identifiants d'entités ou `{ entity, name }`. |
| `alert_entity` | — | Entité mise en avant quand elle est active (`on`, `open`, `detected`, `playing`…). |
| `show_clock` | `true` | Affiche l'horloge (24 h). |
| `show_date` | `true` | Affiche la date (« vendredi 13 novembre »). |
| `show_seconds` | `false` | Ajoute les secondes à l'horloge. |
| `dim_brightness` | `0.85` | Opacité du contenu, de 0,2 à 1. Le fond reste noir. |
| `night_dim` | `true` | Contenu plus sombre la nuit. |
| `night_start` | `22:00` | Début de la nuit (HH:MM). |
| `night_end` | `07:00` | Fin de la nuit (HH:MM). La plage peut passer minuit. |
| `night_brightness` | `0.35` | Opacité du contenu la nuit, de 0,1 à 1. |
| `navigate_on_wake` | — | Vue ouverte au réveil, par exemple `/tableau-de-bord/tablette`. Seuls les chemins internes sont acceptés. |
| `media_query` | toujours | Requête média CSS : la veille ne fonctionne que si elle correspond. `(pointer: coarse)` la limite aux écrans tactiles. |
| `disabled_entity` | — | Entité (`input_boolean`…) qui, allumée, empêche la veille. |
| `name` | — | Petit titre au-dessus de l'horloge. |

`theme` et `accent_color` sont acceptés : le thème ne s'applique qu'à la carte visible en mode modification, l'accent colore le message d'alerte. L'écran de veille, lui, est toujours sombre.

## Affichage

- L'horloge et la date suivent le fuseau horaire configuré dans Home Assistant. L'horloge change à chaque minute (ou chaque seconde avec `show_seconds`), seulement pendant la veille.
- Les valeurs sont formatées par Home Assistant (unités, états traduits).
- Contre le marquage des écrans, le contenu se décale de quelques pour cent chaque minute.
- La nuit suit `night_start` et `night_end`, dans le fuseau de Home Assistant. L'icône météo passe en version nuit quand `sun.sun` est sous l'horizon.

## Fonctionnement et limites

- La veille ne fonctionne que tant que la page du tableau de bord est ouverte. Elle ne compte pas quand la page est masquée et reprend son délai quand elle redevient visible.
- Elle ne se déclenche pas quand une fenêtre Auralis est ouverte, ni en mode modification du tableau de bord.
- Elle n'éteint pas l'écran : pour cela, utilisez les réglages d'écran de Fully Kiosk Browser ou de l'application Home Assistant de la tablette.
- Une carte n'existe que dans sa vue. Placez la carte dans chaque vue de la tablette (ou dans un élément commun à toutes les vues). Une seule veille est créée même si plusieurs cartes sont présentes : la plus récemment affichée donne sa configuration.
- Toucher l'écran, déplacer la souris, faire défiler ou taper au clavier repousse la veille. Toucher l'écran ou appuyer sur une touche (dont Échap) la ferme.
