# Publication GitHub et HACS

## Préparer le dépôt

Le dépôt GitHub doit être public et porter idéalement le nom `auralis-cards`, afin de correspondre au fichier distribué `auralis-cards.js`.

Paramètres GitHub recommandés :

- description : `Auralis Frame dashboard cards for Home Assistant`
- topics : `home-assistant`, `hacs`, `lovelace`, `custom-card`, `unraid`, `proxmox`
- branche par défaut : `main`
- Issues : activées

## Première publication

1. Vérifier localement avec `npm ci` puis `npm run verify`.
2. Publier la branche `main` sur GitHub.
3. Vérifier que les workflows **Quality** et **Validate HACS** réussissent.
4. Créer et publier le tag correspondant exactement à `package.json`, par exemple `v0.10.1`.
5. Le workflow **Build release** crée automatiquement la GitHub Release et joint `auralis-cards.js`.
6. Ajouter le dépôt dans HACS en tant que dépôt personnalisé de catégorie **Dashboard**.

Un tag seul ne suffit pas : HACS utilise la GitHub Release publiée pour proposer les versions et les mises à jour.

## Publier une mise à jour

1. Mettre à jour la version dans `package.json`, `package-lock.json` et `src/index.ts`.
2. Compléter `CHANGELOG.md`.
3. Exécuter `npm run verify` et valider le bundle généré.
4. Fusionner les changements dans `main`.
5. Créer le tag `vX.Y.Z` correspondant à la version du paquet et le publier.

Le workflow refuse volontairement un tag qui ne correspond pas à la version déclarée dans `package.json`.
