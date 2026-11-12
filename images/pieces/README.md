# Fonds des pièces

Dix-sept fonds photographiques au format JPEG, 1672 × 941 pixels, préparés pour les cartes Auralis. Les images reprennent la lumière chaude et le crépuscule bleu du fond de salon existant. [Ouvrir la galerie](apercu.html).

| Pièce | Fichier |
| --- | --- |
| Salon | [salon.jpg](salon.jpg) |
| Salle à manger | [salle-a-manger.jpg](salle-a-manger.jpg) |
| Cuisine | [cuisine.jpg](cuisine.jpg) |
| Bureau | [bureau.jpg](bureau.jpg) |
| Salle de bain | [salle-de-bain.jpg](salle-de-bain.jpg) |
| Salle d’eau | [salle-d-eau.jpg](salle-d-eau.jpg) |
| Chambre d’enfant | [chambre-enfant.jpg](chambre-enfant.jpg) |
| Chambre d’ados | [chambre-ados.jpg](chambre-ados.jpg) |
| Salle vidéo | [salle-video.jpg](salle-video.jpg) |
| Garage extérieur | [garage-exterieur.jpg](garage-exterieur.jpg) |
| Piscine | [piscine.jpg](piscine.jpg) |
| Jardin | [jardin.jpg](jardin.jpg) |
| Chambre | [chambre.jpg](chambre.jpg) |
| Chambre invitée | [chambre-invitee.jpg](chambre-invitee.jpg) |
| Garderie | [garderie.jpg](garderie.jpg) |
| Assistante maternelle | [assistante-maternelle.jpg](assistante-maternelle.jpg) |
| Hall d’entrée | [hall-d-entree.jpg](hall-d-entree.jpg) |

## Utilisation dans Home Assistant

Copier les fichiers voulus dans `/config/www/auralis-cards/images/pieces/`, puis utiliser leur URL `/local/` dans la configuration de la carte. Par exemple :

```yaml
type: custom:auralis-room-card
name: Cuisine
background_image: /local/auralis-cards/images/pieces/cuisine.jpg
```

La même option `background_image` fonctionne pour un groupe de la carte Volets.

## Prompts de création

Mode : générateur d’images intégré. Direction commune : photographie d’intérieur résidentiel européen, réaliste et chaleureuse, cadrage horizontal large à hauteur des yeux, bois naturel et tons neutres, lampes ambrées avec un crépuscule bleu aux fenêtres, textures crédibles et contraste modéré pour garder les commandes lisibles. Aucun personnage, texte, logo, filigrane ou élément d’interface. Chaque sujet ci-dessous a été généré séparément :

- **Salon** : canapé profond, table basse en bois, lampadaire, plantes et grande fenêtre au crépuscule.
- **Salle à manger** : table en chêne pour six personnes, chaises rembourrées, suspension et vaisselle discrète.
- **Cuisine** : placards en chêne, îlot et plan de travail en pierre, éclairage sous les meubles, herbes et céramiques.
- **Bureau** : bureau en bois, fauteuil, bibliothèque, lampe de travail et écran éteint sans marque.
- **Salle de bain** : baignoire îlot, meuble vasque en bois, pierre claire, serviettes et miroir.
- **Salle d’eau** : douche à l’italienne vitrée, pommeau pluie, pierre claire, petite vasque et miroir rond, sans baignoire.
- **Chambre d’enfant** : petit lit, livres, jouets choisis, étagère basse et veilleuse chaude.
- **Chambre d’ados** : lit, bureau personnel, livres, casque audio, guitare et décor sobre adapté à un adolescent.
- **Salle vidéo** : écran de projection vide et sombre, canapé bas, panneaux acoustiques et éclairage indirect.
- **Garage extérieur** : garage indépendant vu depuis l’allée, porte fermée, éclairage extérieur et végétation.
- **Piscine** : bassin extérieur éclairé, terrasse en pierre, transats discrets et lumière chaude de la maison au crépuscule.
- **Jardin** : pelouse, arbres et massifs, chemin de pierre, éclairage paysager et coin salon extérieur, sans piscine.
- **Chambre** : grand lit en lin, tête de lit rembourrée, chevets en chêne, rideaux et lumière douce.
- **Chambre invitée** : chambre d’amis accueillante, lit double soigné, deux lampes de lecture, banc à bagages et décoration épurée.
- **Garderie** : espace collectif avec plusieurs tables d’enfants, casiers, tapis de jeu et rangements bas.
- **Assistante maternelle** : pièce de vie privée adaptée à quelques enfants, petit mobilier, tapis de jeu et lit à barreaux.
- **Hall d’entrée** : porte d’entrée en bois, console, miroir, banc, patères et appliques murales.
