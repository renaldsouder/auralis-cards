# Carte Auralis · Frigo connecté

La carte affiche les températures du réfrigérateur et du congélateur, les portes, l'état de connexion, l'alerte, le mode et le filtre. **Détails** ouvre une fenêtre avec les consignes et les commandes réellement configurées. Chaque mesure ouvre également la fiche native de son entité Home Assistant.

Le visuel [frigo-connecte.jpg](../images/frigo-connecte.jpg) reprend les tons chauds et la lumière de crépuscule des fonds Auralis. Il a été généré pour ce projet. Copiez-le dans `config/www/auralis-cards/images/` pour utiliser le chemin de [l'exemple YAML](../examples/fridge-card.yaml).

## Installation

Le bundle standard regroupe Navigation, Pièce, PC, UNRAID, Proxmox, Lumières, Thermostats et Frigo dans une seule ressource :

```bash
npm run build
```

Copiez `auralis-cards.js` dans `config/www/auralis-cards/`, puis déclarez `/local/auralis-cards/auralis-cards.js` comme ressource JavaScript de type **module**. Le dépôt HACS utilise ce même fichier ; une seule ressource Auralis suffit. La nouvelle carte sera disponible aux installations HACS après publication d'une version contenant ce bundle.

## Entités et commandes

Tous les champs sont facultatifs ; les valeurs non configurées ou indisponibles affichent `—`. Les identifiants du YAML sont des exemples à remplacer. Les températures et mesures viennent des entités `sensor.*`. Les portes, la connexion et l'alerte sont prévues pour des `binary_sensor.*` (`on` signifie ouvert ou actif). Les consignes modifiables attendent des entités `number.*`, dont la plage et le pas sont lus avant chaque commande. Le mode accepte `select.*` ou `input_select.*`. Les fonctions rapides acceptent `switch.*` ou `button.*` ; le verrouillage accepte aussi `lock.*`. Une commande n'est envoyée que si l'entité correspondante n'est pas `unavailable` : un bouton jamais pressé (état `unknown`) reste utilisable. En cas d'échec, un message s'affiche quelques secondes en haut de l'écran.

La connexion de l'appareil se déclare avec `status_entity`, le nom commun à toutes les cartes machines ; l'ancien nom `connected_entity` reste accepté. Sans entité de congélateur (`freezer_temperature_entity`, `freezer_target_entity` ou `freezer_climate_entity`), la tuile **Congélateur** n'est pas affichée et le réfrigérateur occupe toute la largeur.

### État et alertes

L'en-tête résume l'état de l'appareil : **Alerte du réfrigérateur** en rouge, **Porte ouverte** en ambre, **Hors ligne** ou **Indisponible** en gris, sinon **Fonctionnement normal**. Une porte dont le capteur ne répond pas affiche « état inconnu » au lieu d'être signalée comme fermée.

Les températures passent en rouge au-delà d'un seuil réglable :

```yaml
fridge_alert_above: 8     # °C, valeur par défaut
freezer_alert_above: -12  # °C, valeur par défaut
```

### Consignes

Les boutons − et + modifient d'abord la consigne affichée ; la commande part après une courte pause (0,7 s). Plusieurs appuis rapides donnent donc une seule commande avec la bonne valeur. Si l'appareil refuse la commande, la consigne affichée revient à sa valeur réelle. Quand le mode actuel ne figure pas dans la liste proposée, le choix du mode affiche « Choisir un mode… » au lieu de présélectionner une option au hasard.

Le thème suit par défaut celui de Home Assistant (`theme: auto`) pour la fenêtre de détails ; la façade photographique reste sombre dans tous les thèmes.

### Frigo exposé comme thermostat

Certaines intégrations n'exposent le réfrigérateur que sous forme de thermostat `climate.*`. Indiquez-le dans `climate_entity` (et `freezer_climate_entity` pour le congélateur) :

```yaml
type: custom:auralis-fridge-card
climate_entity: climate.refrigerateur
```

La carte lit alors la température mesurée (`current_temperature`) et la consigne (`temperature`) du thermostat. Les boutons − et + de la fenêtre règlent la consigne au pas, au minimum et au maximum du thermostat. S'il propose des préréglages (`preset_modes`), ils apparaissent dans le choix du mode.

Les champs `fridge_temperature_entity`, `fridge_target_entity` et `mode_entity` restent prioritaires : vous pouvez par exemple garder une sonde de température plus précise et la consigne du thermostat.

La carte ne crée aucune entité et ne suppose aucune intégration ou marque de frigo particulière. Vous pouvez omettre les fonctions absentes de votre modèle. `extra_entities` ajoute des mesures ou diagnostics dans la fenêtre de détails.
