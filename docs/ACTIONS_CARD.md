# Carte Actions Auralis

La carte `custom:auralis-actions-card` réunit des actions à un appui : lancer un script, appuyer sur un bouton, activer une scène, déclencher une automatisation, basculer un interrupteur ou ouvrir une vue.

Chaque tuile montre l'état utile de l'action : « Utilisé il y a 2 j » pour un bouton, « Lancé il y a 3 h » pour un script, « Allumé » pour un interrupteur. Pendant l'exécution, une roue tourne autour de l'icône. Ensuite, la tuile indique « Fait » en vert ou « Échec » en rouge pendant quelques secondes ; un échec affiche aussi un message en haut de l'écran avec la raison donnée par Home Assistant.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/actions-card.yaml).

Dans l'éditeur visuel, Home Assistant propose la carte quand vous partez d'une entité `script.*`, `button.*`, `input_button.*` ou `scene.*`.

## Configuration

`actions` est la seule option obligatoire. Chaque action a besoin d'au moins `entity`, `service` ou `navigation_path`.

| Option | Rôle |
| --- | --- |
| `entity` | Entité visée. Son domaine choisit l'action par défaut (tableau ci-dessous) et son état s'affiche sur la tuile. |
| `name` | Nom affiché. Sans cette option, le nom Home Assistant de l'entité est utilisé. |
| `icon` | Icône. Sans cette option : icône de l'entité, puis icône du domaine. |
| `color` | Couleur de la tuile. Sans cette option : `accent_color` de la carte s'il est défini, sinon une couleur par domaine. |
| `state_entity` | Entité dont l'état est affiché à la place, par exemple un `binary_sensor` qui indique si une machine répond. |
| `confirm` | `true`, ou le texte de la question, pour demander une confirmation avant d'agir. |
| `danger` | `true` pour un bouton de confirmation rouge (redémarrage, coupure). Sans cette option, le bouton de confirmation reste neutre. |
| `service` | Service à appeler, au format `domaine.service`, à la place de l'action par défaut. |
| `data` | Données envoyées au service. |
| `target` | Cible du service. Par défaut, l'entité `entity`. |
| `navigation_path` | Ouvre une vue du tableau de bord, par exemple `/dashboard-maison/cameras`. Le chemin doit commencer par une seule barre oblique : `//site` ou une adresse `https://` sont refusés. |

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `name` | — | Titre de la carte. L'en-tête n'apparaît que si un titre est défini. |
| `icon` | `mdi:gesture-tap-button` | Icône de l'en-tête. |
| `layout` | `tiles` | `tiles` (tuiles avec état) ou `compact` (pastilles en ligne, l'état est dans l'infobulle). |
| `columns` | automatique | Nombre de colonnes des tuiles, de 1 à 6. La carte repasse à deux colonnes sur un téléphone. |
| `show_header` | si `name` est défini | Force l'affichage ou le masquage de l'en-tête. |

Les options visuelles communes `theme`, `accent_color`, `card_background`, `background_image`, `show_grid` et `glass_opacity` sont acceptées. La carte suit les couleurs du thème choisi (clair avec `halo` et `aurora`, sombre avec `carbon` et `mono`) ; `accent_color` colore l'en-tête et devient la couleur des tuiles sans `color`.

## Action par défaut selon le domaine

| Domaine | Appui | État affiché |
| --- | --- | --- |
| `button`, `input_button` | `press` | « Utilisé il y a … » ou « Jamais utilisé » |
| `script` | `turn_on` | « En cours » pendant l'exécution, sinon « Lancé il y a … » |
| `scene` | `turn_on` | « Activée il y a … » |
| `automation` | `trigger` | « Déclenchée il y a … » ou « Désactivée » |
| `switch`, `light`, `input_boolean`, `fan`, `cover`, `media_player`, `siren` | `toggle` | Allumé, Éteint, Ouvert, Fermé… |
| `lock` | `lock` ou `unlock` selon l'état | Verrouillé ou Déverrouillé |
| autre | ouvre la fiche de l'entité | état formaté par Home Assistant |

Une tuile est mise en avant (icône pleine et halo) quand l'entité affichée est active : appareil allumé, porte déverrouillée, script en cours, machine en ligne via `state_entity`. Une automatisation activée n'est pas mise en avant, puisque c'est son état normal.

## Gestes

- **Appui** : lance l'action, ou ouvre la confirmation si `confirm` est défini.
- **Appui long ou clic droit** : ouvre la fiche Home Assistant de l'entité affichée, même quand la tuile est indisponible.
- Une tuile dont l'entité est indisponible est grisée et l'appui simple ne fait rien. Une entité absente de Home Assistant affiche « Entité introuvable ».
- **Échap** ferme la confirmation.

## Exemple

```yaml
type: custom:auralis-actions-card
name: Actions rapides
actions:
  - entity: script.wake_skynet
    name: Réveiller Skynet
    icon: mdi:nas
    color: "#FF8055"
    state_entity: binary_sensor.skynet_online
  - entity: button.reboot_freebox
    name: Redémarrer la Freebox
    icon: mdi:web-box
    danger: true
    confirm: Redémarrer la Freebox ? La connexion Internet sera coupée quelques minutes.
  - name: Prévenir la famille
    icon: mdi:bell-ring-outline
    service: notify.famille
    data:
      message: À table !
```
