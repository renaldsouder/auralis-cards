# Carte Caméras Auralis

La carte `custom:auralis-cameras-card` affiche les caméras de la maison en mosaïque. Les images se rafraîchissent régulièrement, sans jamais clignoter, et une caméra dont le détecteur de mouvement est actif passe au premier plan : bordure rouge pulsée et étiquette « Mouvement ».

Un appui ouvre la caméra en grand, en direct si Home Assistant peut diffuser son flux. Des flèches permettent de passer d'une caméra à l'autre, et des boutons commandent les équipements associés : projecteur, sirène, portail…

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/cameras-card.yaml).

Dans l'éditeur visuel, Home Assistant propose la carte quand vous partez d'une entité `camera.*`.

## Configuration

`cameras` est la seule option obligatoire. Chaque caméra accepte :

| Option | Rôle |
| --- | --- |
| `entity` | Entité `camera.*`. Obligatoire. |
| `name` | Nom affiché. Sans cette option, le nom Home Assistant de la caméra est utilisé. |
| `icon` | Icône devant le nom. |
| `motion_entity` | Détecteur `binary_sensor.*` : la tuile est mise en avant tant qu'il est actif, et la fenêtre indique le dernier mouvement. |
| `actions` | Boutons de la fenêtre, au format de la [carte Actions](ACTIONS_CARD.md) : `entity`, `name`, `icon`, `color`, `state_entity`, `confirm`, `danger`, `service`, `data`, `navigation_path`… Ils se comportent comme les tuiles de la carte Actions. |

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `name` | — | Titre de la carte (`Caméras` si l'en-tête est forcé sans titre). |
| `icon` | `mdi:cctv` | Icône de l'en-tête. |
| `layout` | `grid` | `grid` (mosaïque) ou `featured` (une grande image et des vignettes pour choisir laquelle). Tant qu'aucune vignette n'a été choisie, la caméra qui détecte un mouvement passe en grand. |
| `columns` | automatique | Nombre de colonnes de la mosaïque, de 1 à 4. Une seule colonne sur téléphone. |
| `aspect_ratio` | `16:9` | Format des images : `16:9`, `4:3`, `1:1`, `9:16`… |
| `refresh_interval` | `10` | Intervalle minimal entre deux images d'une tuile, en secondes (2 à 300). |
| `live` | `true` | Flux vidéo en direct dans la fenêtre. `false` garde des images rafraîchies en continu. |
| `show_header` | si `name` est défini | Affiche l'en-tête avec le nombre de caméras, de mouvements et de caméras indisponibles. Mettez `show_header: true` pour le garder sans titre. |

Les options visuelles communes `theme`, `accent_color` et `card_background` sont acceptées.

## Étiquettes des tuiles

| Étiquette | Signification |
| --- | --- |
| Mouvement (rouge) | Le détecteur `motion_entity` est actif. |
| REC (rouge) | La caméra indique qu'elle enregistre. |
| Actif (vert, clignotant) | Les images arrivent normalement. |
| Image figée (ambre) | Aucune nouvelle image depuis plus de trois intervalles (30 s minimum). |
| Erreur (ambre) | La dernière image n'a pas pu être chargée. |

En bas de chaque tuile : l'état de la caméra et l'heure de la dernière image reçue.

## Fenêtre d'une caméra

- **Image** : flux en direct par le lecteur de Home Assistant (HLS ou WebRTC selon la caméra), ou images rafraîchies en continu (au plus toutes les 1,5 seconde) si le direct n'est pas disponible. Le direct est retenté à chaque ouverture, et un bouton « Réessayer le direct » apparaît quand il a échoué.
- **Navigation** : flèches à l'écran, ou touches ← et → du clavier, pour passer à la caméra suivante.
- **Informations** : état de la caméra, mouvement en cours ou heure du dernier mouvement, position (2 / 5).
- **Boutons** : les `actions` de la caméra, puis l'historique des mouvements et la fiche de la caméra. Une action avec `confirm` demande une confirmation (bouton rouge seulement avec `danger: true`) ; un appui long ou un clic droit ouvre la fiche de l'entité. Une action `navigation_path` ferme la fenêtre avant d'ouvrir la vue, pour que le bouton Retour reste juste.
- Les tuiles de la carte sont en pause tant que la fenêtre est ouverte.

## Données et limites

- Les tuiles utilisent l'image fournie par Home Assistant (`/api/camera_proxy/…`), redimensionnée par Home Assistant à la taille affichée (paramètre `width`, par paliers de 160 px selon la densité de l'écran). Elles ne sont rafraîchies que lorsque la carte est à l'écran et l'onglet visible, pour ménager le réseau et les caméras.
- L'image suivante n'est demandée qu'une fois la précédente arrivée, et jamais plus souvent que `refresh_interval` : une caméra lente s'affiche à son rythme au lieu d'être interrompue. Elle est chargée en arrière-plan et remplace l'image affichée seulement quand elle est complète.
- Le lecteur en direct de Home Assistant est chargé à la première ouverture d'une fenêtre. Si le chargement échoue, la fenêtre passe automatiquement en images rafraîchies.
- Pour des tuiles fluides, préférez le sous-flux de la caméra (souvent nommé « fluide » ou « sub ») : les images sont plus légères.
