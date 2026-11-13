# Carte Arrosage Auralis

La carte `custom:auralis-irrigation-card` pilote une ou plusieurs vannes d'arrosage. Chaque zone affiche son état (« Arrosage en cours · reste 3 min », « Fermé », « Indisponible »), le prochain arrosage programmé, la pile et les erreurs de l'appareil, et propose un arrosage manuel minuté. La ligne d'état de la carte résume l'ensemble : « 1 zone en cours », « Tout est fermé », « Pile faible »…

Un appui sur le nom ou l'icône d'une zone ouvre la fiche Home Assistant de la vanne.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/irrigation-card.yaml).

## Configuration

Une zone unique peut être décrite au premier niveau de la carte (`valve_entity`, `countdown_entity`…), plusieurs zones dans `zones`. Les deux formes se combinent : la zone du premier niveau s'affiche en premier, suivie de celles de `zones`.

Options d'une zone :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `valve_entity` | — | Vanne `switch.*` ou `valve.*`. Obligatoire. |
| `name` | nom de la vanne | Nom de la zone. Au premier niveau, utilisez `zone_name` (`name` est le titre de la carte). |
| `icon` | `mdi:sprinkler-variant` | Icône de la zone. Au premier niveau : `zone_icon`. |
| `countdown_entity` | — | Minuterie de l'appareil (`number.*` ou `input_number.*`) : la vanne se ferme seule à son terme. |
| `script_entity` | — | Script qui gère lui-même un arrosage minuté (voir plus bas). |
| `battery_entity` | — | Pile : pourcentage, texte (`low`, `faible`…) ou capteur binaire de batterie faible. |
| `error_entity` | — | Erreur de l'appareil. Vide, `none`, `ok`, `unknown` ou `unavailable` : aucune erreur. |
| `schedule_entity` | — | Programmation : `automation.*` ou `input_boolean.*` (suspendable depuis la carte), ou `schedule.*`. |
| `schedule` | — | Horaires affichés, au format `HH:MM` (`"23:00"` ou une liste). |
| `durations` | `[5, 10, 20]` | Durées proposées, en minutes. La première est présélectionnée. |
| `max_duration` | `60` | Durée maximale d'un arrosage manuel, en minutes. Les durées plus longues sont ignorées. |

Options de la carte :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `name` | `Arrosage` | Titre de la carte. |
| `icon` | `mdi:sprinkler` | Icône de l'en-tête. |
| `zones` | — | Liste de zones, avec les options ci-dessus. |
| `weather_entity` | — | Entité `weather.*` : affiche la pluie prévue sur 24 h. |
| `rain_threshold` | `2` | Cumul de pluie (mm sur 24 h) à partir duquel l'information s'affiche. |
| `theme` | `auto` | `auto`, `halo`, `aurora`, `carbon` ou `mono`. `auto` suit le mode sombre de Home Assistant. |
| `accent_color` | bleu eau | Couleur de l'eau : arrosage en cours, durée choisie, bouton d'arrosage. |
| `card_background` | — | Fond de la carte (`color`, ou `mode: gradient` et `gradient`). |

## Arrosage manuel en toute sécurité

Une vanne restée ouverte, c'est une cuve vidée ou un jardin inondé. La carte ne compte donc **jamais** sur le navigateur pour refermer une vanne : une tablette murale se met en veille, un onglet se ferme, le Wi-Fi tombe. Selon la configuration de la zone, elle choisit, dans cet ordre :

1. **Script (`script_entity`)** : la carte appelle `script.turn_on` avec `variables: { duration: <minutes> }`. Le script ouvre la vanne, attend, puis la referme ; c'est Home Assistant qui tient le temps. Le bouton « Arrêter » ferme la vanne puis arrête le script s'il tourne encore.
2. **Minuterie de l'appareil (`countdown_entity`)** : la carte écrit la durée dans la minuterie (`number.set_value`), puis ouvre la vanne. C'est l'appareil lui-même qui la referme, même si Home Assistant redémarre. La durée est convertie dans l'unité de l'entité (secondes, minutes ou heures, lue dans `unit_of_measurement`), arrondie à son pas (`step`) et bornée par son `min` et son `max` ; si l'appareil impose une autre durée, la carte l'indique.
3. **Ni l'un ni l'autre** : pas d'arrosage minuté. La carte propose seulement « Ouvrir la vanne » et « Fermer la vanne », avec un rappel que la vanne reste ouverte jusqu'à sa fermeture.

L'arrêt se fait sans confirmation (`switch.turn_off` ou `valve.close_valve`), le lancement aussi. Mettre en pause la programmation demande une confirmation ; la reprise non.

Exemple de script minuté :

```yaml
script:
  arrosage_minute_jardiniere:
    alias: Arrosage minuté jardinière
    mode: restart
    fields:
      duration:
        description: Durée en minutes
    sequence:
      - action: switch.turn_on
        target:
          entity_id: switch.mod_arrosage_jardiniere
      - delay:
          minutes: "{{ duration | int(5) }}"
      - action: switch.turn_off
        target:
          entity_id: switch.mod_arrosage_jardiniere
```

Un délai de script ne survit pas à un redémarrage de Home Assistant : quand l'appareil propose une minuterie, préférez-la, ou combinez les deux (le script écrit la minuterie avant d'ouvrir la vanne).

## Données et limites

- **Horaires.** Les déclencheurs d'une automatisation ne figurent pas dans son état ; les lire demanderait des appels réservés aux administrateurs. Les horaires affichés viennent donc de l'option `schedule` : tenez-la à jour avec l'automatisation. Ils sont calculés dans le fuseau horaire de Home Assistant (« ce soir à 23:00 », « demain à 07:00 »). Avec une entité `schedule.*` et sans `schedule`, la carte utilise son attribut `next_event`.
- **Pause.** Une automatisation désactivée ou un `input_boolean` à `off` affiche « Programmation en pause ». Une entité `schedule.*` ne peut pas être suspendue depuis la carte : son état `off` signifie seulement qu'on est hors d'une plage.
- **Temps restant.** Pendant un arrosage, « reste 3 min » est la valeur que l'appareil publie dans sa minuterie. Sans minuterie, la carte affiche le temps écoulé depuis l'ouverture, rafraîchi toutes les 30 secondes seulement pendant l'arrosage.
- **Pile.** En pourcentage : ambre sous 30 %, rouge sous 15 %. En texte : `low` ou `faible` donnent « Pile faible ».
- **Pluie.** La carte s'abonne aux prévisions horaires de `weather_entity` (ou journalières, au prorata, à défaut), additionne la pluie des 24 prochaines heures et affiche « Pluie prévue : 6 mm dans les 24 h » au-delà de `rain_threshold`. C'est une **indication** : la carte ne saute jamais un arrosage d'elle-même. Pour cela, ajoutez une condition à votre automatisation. Une entité sans prévisions est tolérée ; en cas d'échec, l'abonnement est retenté de plus en plus espacé.
- **Commandes.** Pendant une commande, les boutons de la zone sont désactivés ; un échec s'affiche en haut de l'écran. Une vanne `unknown` reste commandable, une vanne `unavailable` non.
