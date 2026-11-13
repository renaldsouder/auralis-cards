# Carte Énergie Auralis

La carte `custom:auralis-energy-card` suit la consommation d'un compteur d'électricité, de gaz ou d'eau. Elle compare chaque jour des sept derniers jours au même jour de la semaine précédente, affiche la consommation d'aujourd'hui, la puissance (ou le débit) instantanée et l'index du compteur. Avec un prix, elle affiche aussi ce que coûte chaque jour, et le total des sept derniers jours.

## Installation

La carte est incluse dans le bundle standard `auralis-cards.js`. Installez cette ressource comme indiqué dans le [README](../README.md), puis adaptez [l'exemple YAML](../examples/energy-card.yaml). La configuration minimale :

```yaml
type: custom:auralis-energy-card
energy_entity: sensor.compteur_energie
```

Le capteur `energy_entity` doit être un compteur cumulé qui alimente les statistiques long terme de Home Assistant (`state_class: total` ou `total_increasing`), comme ceux du tableau de bord Énergie.

## Configuration

| Option | Défaut | Rôle |
| --- | --- | --- |
| `energy_entity` | **requis** | Capteur de consommation cumulée (électricité, gaz ou eau). |
| `power_entity` | — | Capteur de puissance ou de débit instantané, affiché avec son unité. |
| `name` | selon le compteur | Titre : « Consommation électrique », « Consommation de gaz » ou « Consommation d’eau ». |
| `icon` | selon le compteur | Icône de l'en-tête (`mdi:lightning-bolt`, `mdi:fire`, `mdi:water`). |
| `unit` | `kWh`, ou l'unité du capteur | Unité des consommations. Une énergie est convertie (Wh, kWh, MWh…), un volume aussi (m³, L, mL). L'index du compteur suit cette unité. |
| `decimals` | `0` en Wh, L, mL ; `2` en m³ ; `1` sinon | Décimales des consommations et de l'index (0 à 3). |
| `theme` | `auto` | `auto` suit le mode clair ou sombre de Home Assistant ; `halo`, `carbon`, `mono` ou `aurora`. |
| `accent_color` | — | Couleur de la semaine en cours (barres, total du jour). |
| `card_background` | — | Fond de la carte : `{ mode: solid, color: "#101923" }` ou `{ mode: gradient, gradient: "linear-gradient(…)" }`. |

Le type de compteur vient de la classe du capteur (`device_class`) : `gas` pour le gaz, `water` pour l'eau (ou une unité L, mL, gal sans classe), électricité sinon.

### Coût

| Option | Défaut | Rôle |
| --- | --- | --- |
| `price` | — | Prix par kWh pour l'électricité (par exemple `0.2016`). Pour un autre compteur, prix par unité affichée (`€/m³` pour du gaz en m³). |
| `price_entity` | — | Capteur du prix **actuel**, prioritaire sur `price` (par exemple celui de l'intégration de votre fournisseur). Unités comprises : `EUR/kWh`, `€/kWh`, `c€/kWh` ou `ct/kWh` (centimes), `EUR/MWh`, `€/m³`, `€/m3`… Indisponible, il laisse la place à `price` s'il est défini. |
| `currency` | `€` | Symbole monétaire affiché. |
| `subscription_per_day` | `0` | Coût fixe ajouté à chaque jour (abonnement annuel ÷ 365, par exemple `0.42`). |
| `offpeak_price` | — | Prix des heures creuses, dans la même unité que `price`. |
| `offpeak_hours` | — | Plages des heures creuses : liste (`["22:00-06:00"]`) ou texte séparé par des virgules (`"01:30-07:30, 12:30-14:30"`). Une plage peut franchir minuit. |
| `show_cost` | `true` dès qu'un prix est défini | `false` masque les coûts sans retirer le prix de la configuration. |

Sans heures creuses, le coût d'un jour vaut `consommation × prix + abonnement`. Avec `offpeak_price` **et** `offpeak_hours`, chaque heure est classée dans sa plage tarifaire, dans le fuseau horaire de Home Assistant : heures pleines au prix `price` (ou `price_entity`), heures creuses à `offpeak_price`, plus l'abonnement. Les statistiques étant horaires, une plage qui commence à la demi-heure (`01:30`) partage l'heure concernée à parts égales entre les deux tarifs.

Une carte en Wh ou MWh garde un prix par kWh : la conversion est faite par la carte.

```yaml
type: custom:auralis-energy-card
energy_entity: sensor.compteur_energie
price: 0.2516                # heures pleines, € par kWh
offpeak_price: 0.1828        # heures creuses
offpeak_hours:
  - "22:00-06:00"
subscription_per_day: 0.47
```

Pour un compteur de gaz en m³ :

```yaml
type: custom:auralis-energy-card
energy_entity: sensor.compteur_gaz
price: 1.18                  # € par m³
```

## Affichage

- **Aujourd’hui** et **Il y a 7 jours** : consommation du jour et du même jour de la semaine précédente, avec leur coût en dessous (« 1,84 € »).
- **7 jours comparés** : une paire de barres par jour, semaine en cours et semaine précédente. Survoler, toucher ou parcourir au clavier une journée affiche son détail : date, consommation et coût de chaque semaine. Échap ferme le détail.
- **Coût sur 7 jours** : total des sept derniers jours, le total des sept jours précédents (« J−7 ») et le tarif appliqué (heures pleines, heures creuses, abonnement).
- En bas : la puissance ou le débit instantané (`power_entity`) et l'index du compteur. Un appui ouvre la fiche Home Assistant.

Les montants sont écrits à la française : virgule décimale, deux décimales et espace insécable avant la devise.

## Données et limites

- Les consommations viennent des **statistiques horaires** du Recorder : « Aujourd’hui » s'arrête à la dernière heure compilée et peut donc avoir **jusqu'à une heure de retard**. L'heure du dernier relevé est affichée au-dessus du graphique.
- Les statistiques sont relues toutes les 5 minutes. En cas d'échec, un nouvel essai a lieu après 30 s, puis de plus en plus espacé jusqu'à 5 minutes ; les dernières valeurs connues restent affichées.
- Avec des heures creuses, la carte lit les statistiques heure par heure sur 15 jours (au lieu des totaux journaliers) pour tarifer chaque heure. Les jours de changement d'heure comptent 23 ou 25 heures, rangées dans le bon jour et la bonne plage.
- `price_entity` ne donne que le **prix actuel** : il s'applique à tout l'historique affiché, y compris aux jours passés. Un changement de tarif modifie donc aussi le coût des jours précédents. Pour un historique tarifé au prix de l'époque, utilisez le tableau de bord Énergie de Home Assistant.
- Le coût est une estimation : il ne tient pas compte des taxes variables, des remises ni des arrondis du fournisseur, sauf si `price` ou `subscription_per_day` les incluent.
