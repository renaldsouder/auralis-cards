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

Tous les champs sont facultatifs ; les valeurs non configurées ou indisponibles affichent `—`. Les identifiants du YAML sont des exemples à remplacer. Les températures et mesures viennent des entités `sensor.*`. Les portes, la connexion et l'alerte sont prévues pour des `binary_sensor.*` (`on` signifie ouvert ou actif). Les consignes modifiables attendent des entités `number.*`, dont la plage et le pas sont lus avant chaque commande. Le mode accepte `select.*` ou `input_select.*`. Les fonctions rapides acceptent `switch.*` ou `button.*` ; le verrouillage accepte aussi `lock.*`. Une commande n'est envoyée que si l'entité correspondante est disponible.

La carte ne crée aucune entité et ne suppose aucune intégration ou marque de frigo particulière. Vous pouvez omettre les fonctions absentes de votre modèle. `extra_entities` ajoute des mesures ou diagnostics dans la fenêtre de détails.
