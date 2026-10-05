# Cahier des charges — Auralis Cards

Version : 0.5 — infrastructure cinématique  
Date : 3 octobre 2026

## 1. Vision

Auralis Cards est une collection de cartes modernes pour les tableaux de bord Home Assistant, distribuable avec HACS. Son langage graphique porte le nom **Auralis Frame**. L’ensemble doit réunir dans une surface compacte les informations essentielles, puis proposer les commandes avancées dans des popups cohérents.

La collection vise trois usages initiaux :

1. piloter une pièce regroupant lumières, volets et climat ;
2. suivre et contrôler un ordinateur ;
3. superviser un serveur UNRAID, ses conteneurs Docker et ses machines virtuelles ;
4. superviser un cluster Proxmox, ses nœuds, VM et conteneurs LXC.

## 2. Objectifs

- Offrir une lecture immédiate des états importants.
- Réduire le nombre de cartes nécessaires sur un dashboard.
- Conserver les commandes individuelles lorsque plusieurs équipements appartiennent à un groupe.
- Séparer clairement les actions courantes et les actions dangereuses.
- Fonctionner avec des entités Home Assistant standards et des boutons/scripts configurables.
- S’adapter aux dashboards mobiles, tablettes murales et écrans de bureau.
- Proposer quatre thèmes interchangeables sans modifier la configuration fonctionnelle.

## 3. Périmètre fonctionnel du MVP

### 3.1 Carte Pièce

Nom du composant : `custom:auralis-room-card`.

La vue principale affiche :

- le nom et l’icône de la pièce ;
- la température ;
- l’humidité ;
- le nombre de lumières actives ;
- l’intervalle de position des volets ;
- une image d'ambiance facultative ;
- un accès direct à une scène et au lecteur multimédia ;
- un accès au thermostat et aux détails.

En format large, l'image constitue le centre visuel et les commandes restent disposées autour. En format étroit, les commandes latérales passent sous l'image sans masquer les informations.

Le popup Lumières permet :

- d’allumer ou éteindre le groupe ;
- de modifier la luminosité générale ;
- de consulter et basculer chaque lumière ;
- de régler individuellement chaque luminosité.

Le popup Volets permet :

- d’ouvrir, arrêter ou fermer le groupe ;
- de consulter la position de chaque volet ;
- de modifier chaque position ;
- d’ouvrir la fiche Home Assistant d’une entité.

### 3.2 Carte PC

Nom du composant : `custom:auralis-pc-card`.

La vue principale affiche :

- la disponibilité et l’uptime ;
- l’usage CPU, GPU et RAM ;
- les températures CPU et GPU ;
- le stockage ;
- les débits réseau.

La présentation reprend un format vertical immersif : fond facultatif, jauge principale, températures visibles en permanence, rail d'actions et synthèse des performances en pied de carte.

Les commandes disponibles sont configurables :

- démarrage ou Wake-on-LAN ;
- verrouillage ;
- mise en veille ;
- redémarrage avec confirmation ;
- extinction avec confirmation.

### 3.3 Carte UNRAID

Nom du composant : `custom:auralis-unraid-card`.

La vue principale affiche :

- disponibilité et uptime ;
- occupation de l’array ;
- nombre de disques sains, occupation individuelle et température maximale ;
- état de la parité, ancienneté du contrôle et erreurs détectées ;
- CPU, température, RAM et réseau ;
- nombre de conteneurs et de VM actifs.

Le popup Services propose deux onglets :

- Docker ;
- Machines virtuelles.

La carte principale utilise la même composition verticale que la carte PC, avec une couleur d'accent propre à UNRAID et un panneau de synthèse dédié à l'array.

Fonctions communes :

- recherche ;
- filtres par état ;
- regroupement logique ;
- démarrage individuel ;
- arrêt individuel ;
- sélection et démarrage multiple.

Fonctions Docker :

- démarrage d’un conteneur arrêté ;
- arrêt d’un conteneur actif ;
- redémarrage lorsque l’entité de redémarrage est configurée ;
- regroupement par stack ou famille.

Fonctions VM :

- démarrage ;
- arrêt ;
- mise en pause ;
- reprise d’une VM suspendue ;
- accès à une console configurée ;
- affichage des vCPU, mémoire, stockage et adresse IP.

Les actions suivantes demandent une confirmation :

- arrêt de l’array ;
- arrêt ou redémarrage d’un conteneur ou d’une VM ;
- extinction du serveur ;
- actions destructrices futures.

### 3.4 Carte Proxmox

Nom du composant : `custom:auralis-proxmox-card`.

La vue principale affiche :

- l’état du cluster et le quorum ;
- la charge, la mémoire et le stockage ;
- le nombre de nœuds disponibles ;
- le nombre de VM et conteneurs LXC actifs ;
- l’état de Ceph et de la prochaine sauvegarde ;
- le nombre d’alertes actives lorsqu’un capteur est configuré.

Le popup Cluster regroupe les nœuds, leurs métriques et leurs commandes. Le popup Charges virtuelles permet de filtrer, démarrer, reprendre, redémarrer et ouvrir la console des VM et conteneurs. Les actions d’arrêt ou de redémarrage d’un nœud ou du cluster demandent confirmation.

## 4. Thèmes

Les thèmes sont appliqués par variables CSS :

- `halo` : clair, lumineux et légèrement translucide ;
- `carbon` : sombre, technique et premium ;
- `mono` : monochrome, contrasté et minimal ;
- `aurora` : surfaces claires avec accents lavande, bleu et menthe ;
- `auto` : Halo ou Carbon suivant le mode du thème Home Assistant.

Les significations restent stables :

- vert : sain ou disponible ;
- bleu : information ou navigation ;
- ambre : actif, suspendu ou avertissement ;
- rouge : indisponible, erreur ou action dangereuse.

## 5. Configuration et compatibilité

- Les capteurs peuvent provenir de n’importe quelle intégration Home Assistant.
- Les commandes peuvent référencer des entités `button`, `input_button`, `script`, `switch` ou assimilées.
- Les listes Docker et VM sont configurées en YAML dans le MVP.
- Aucun accès direct à l’API UNRAID n’est effectué depuis le navigateur.
- Les secrets, jetons et mots de passe ne doivent jamais apparaître dans la configuration Lovelace.

## 6. Contraintes UX

- Toutes les commandes sont utilisables au clavier.
- Les contrastes doivent rester suffisants dans les quatre thèmes.
- Les valeurs absentes s’affichent avec `—` sans casser la mise en page.
- Les états `unknown` et `unavailable` ne sont jamais interprétés comme actifs.
- Les popups sont utilisables sur une largeur mobile de 320 px.
- Les actions dangereuses sont rouges, isolées et confirmées.
- Une commande groupée ne supprime jamais l’accès aux appareils individuels.
- Toutes les pop-up utilisent la même séquence : résumé, commandes principales, contenu détaillé, puis zone sensible éventuelle.
- Les photographies restent facultatives et ne doivent jamais être indispensables à la compréhension d'un état.

## 7. Architecture technique

- TypeScript strict.
- Web Components avec Lit.
- Un bundle ES module : `auralis-cards.js`.
- Vite pour le build.
- Vitest pour les fonctions pures.
- Enregistrement dans `window.customCards` pour le sélecteur Home Assistant.
- Formulaires natifs Home Assistant pour les champs simples.
- Distribution HACS par asset de release GitHub.

## 8. Critères d’acceptation du MVP

- `npm run verify` termine sans erreur.
- Les quatre cartes sont enregistrées dans le sélecteur de cartes.
- Le bundle final est un module JavaScript unique.
- La carte Pièce contrôle au moins une lumière et un volet.
- La carte PC exécute des boutons ou scripts configurés.
- La carte UNRAID ouvre les listes Docker et VM.
- Plusieurs services arrêtés peuvent être sélectionnés et démarrés.
- L’arrêt de l’array et l’extinction du PC demandent confirmation.
- Les quatre thèmes sont utilisables sans modifier les entités.
- Les cartes déclarent leur taille pour les vues Masonry et Sections.

## 9. Hors périmètre du MVP

- Découverte automatique complète des équipements par zone.
- Éditeur graphique imbriqué pour les listes Docker et VM.
- Historique natif avec graphiques longue durée.
- Traductions autres que le français.
- Gestion directe des identifiants UNRAID.
- Publication effective dans le catalogue HACS.

## 10. Évolutions prévues

1. éditeur graphique complet des services et VM ;
2. découverte automatique par zone Home Assistant ;
3. graphiques d’historique ;
4. actions personnalisées `tap`, `hold` et `double_tap` ;
5. internationalisation ;
6. carte de stratégie de dashboard ;
7. animations réduites lorsque `prefers-reduced-motion` est actif ;
8. tests navigateur dans une instance Home Assistant de démonstration.
