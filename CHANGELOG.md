# Changelog

## 0.13.8

- Réunit les neuf cartes Auralis dans le bundle unique `auralis-cards.js` pour HACS et l'installation manuelle.
- Ajoute les exemples de configuration Lumières, Frigo connecté et Thermostats avec le chemin de ressource commun.
- Vérifie l'enregistrement de toutes les cartes et conserve les bundles autonomes lors de la compilation principale.

## 0.13.7

- Adapte la hauteur de la carte Pièce à son contenu dans les vues Sections au lieu de réserver sept lignes.
- Garde la navbar dans la grille pendant l'édition du tableau de bord et ne l'épingle qu'en affichage normal.

## 0.13.6

- Place la navbar en bas par défaut lorsque `position` est absent ; `position: inline` reste disponible.
- Ajoute `height_desktop`, `height_tablet` et `height_mobile` pour régler séparément sa hauteur.
- Éloigne le bouton Ambiance du thermostat sur les cartes Pièce étroites.

## 0.13.5

- Centre la navigation fixe dans la zone du tableau de bord, même lorsque la barre latérale Home Assistant est ouverte.
- Affiche la navigation fixe hors des conteneurs du dashboard afin qu'elle reste attachée au bord visible sur Android.

## 0.13.4

- Permet de fixer la barre de navigation en haut, en bas, à gauche ou à droite de l'écran avec `position`.
- Conserve le placement dans la grille avec `position: inline` et réduit l'empreinte de la carte lorsqu'elle est fixée.

## 0.13.3

- Retire le texte visible des trois commandes directes des groupes de volets, en conservant leurs libellés accessibles.
- Ajoute `group_columns` (1 à 4) et affiche automatiquement un groupe unique sur toute la largeur.

## 0.13.2

- Supprime l'en-tête global et le compteur de disponibilité sous chaque groupe de la carte Volets.
- Place le nom à côté de l'icône et le chevron au niveau de l'état, tout en conservant les commandes directes.

## 0.13.1

- Affiche l'état de chaque groupe de volets directement sur sa tuile.
- Ajoute les commandes **Monter**, **Stop** et **Descendre** sur les tuiles, sans ouvrir la pop-up.
- Adapte la hauteur de la carte au nombre de groupes dans les vues Sections.

## 0.13.0

- Ajoute `custom:auralis-covers-card` avec quatre groupes photographiques configurables et une pop-up de commandes groupées et individuelles.
- Intègre les images de démonstration au bundle et permet de remplacer le fond de chaque groupe.

## 0.12.3

- Corrige la hauteur par défaut de Proxmox dans les vues Sections : la grille suit le contenu au lieu de réserver 11 lignes et de laisser un espace vide sous la carte.
- Documente `grid_options.rows: auto` pour les cartes existantes dont la hauteur a été enregistrée dans le dashboard.

## 0.12.2

- Ajoute une zone Proxmox de tuiles libres avec `info_items` : entités, attributs, libellés, icônes et ordre configurables, sans limite de nombre.
- Propose les formats état, durée, date/heure et utilisé/total, avec texte conditionnel (par exemple une sauvegarde en cours).
- Permet de régler le nombre de colonnes avec `info_columns` et masque par défaut les informations indisponibles.

## 0.12.1

- Masque les cases de sélection des VM et LXC Proxmox actifs, tout en conservant l’alignement des lignes.
- Retire de la sélection de démarrage les éléments qui deviennent actifs, suspendus ou indisponibles.

## 0.12.0

- Harmonise PC, UNRAID et Proxmox avec deux cadrans circulaires CPU/RAM côte à côte.
- Recentre la carte Proxmox sur un nœud : état sous le nom, sans bloc Nœuds redondant.
- Ajoute une liste illimitée de `storages` configurables et une pop-up Stockages et disques avec `disks`.
- Sépare les pop-ups VM et LXC et colore leurs icônes selon leur état.
- Réserve Détails aux informations du nœud et déplace la commande de sauvegarde dans cette pop-up.
- Préserve les anciennes clés `cluster_usage_entity`, `storage_entity` et `storage_label_entity`.

## 0.11.0

- Ajoute `custom:auralis-navbar-card` pour naviguer entre les vues et sous-vues Lovelace sans rechargement.
- Détecte automatiquement la route active, prend en charge les sous-routes, les libellés masquables et les badges d’entité.
- Réorganise la carte UNRAID autour de la jauge d’occupation et de l’état de l’array, avec deux jauges compactes CPU/RAM.
- Sépare les pop-up Détails, Docker, VM et Disques ; Docker et VM ne mélangent plus leurs listes.
- Colore les icônes des conteneurs, VM et boutons du rail lorsqu’une charge est active.
- Ajoute `docker_group_labels` et `vm_group_labels` pour renommer les groupes, ainsi que `show_on_card` pour choisir les disques de la synthèse.

## 0.10.1

- Restaure la composition PC Auralis Frame d'origine : cadran CPU, contexte session/uptime et panneau inférieur.
- Supprime le bouton « Détails » en double et conserve l'accès unique dans le panneau inférieur.
- Affiche tous les volumes HASS.Agent valides dans le panneau inférieur, sans libellé imposé « Stockage principal ».
- Masque les métriques, températures et sections dont l'entité est absente, indisponible ou invalide.
- Partage `card_background` (`solid`, `gradient`, `grid`) entre les cartes Pièce, PC et UNRAID.
- Ajoute `show_grid` pour afficher ou masquer indépendamment la trame décorative.
- Confirme l'enregistrement de `custom:auralis-unraid-card` dans le bundle principal.

## 0.10.0

- Recompose la carte PC autour des informations prioritaires : état, batterie et charges CPU/RAM/GPU.
- Ajoute un second niveau compact pour la session, l'uptime, le stockage principal et la sortie audio.
- Étend la pop-up avec les disques HASS.Agent, l'audio, l'alimentation, le système et les interfaces réseau.
- Accepte un capteur numérique disponible comme indicateur `online_entity`.
- Calcule l'uptime depuis `last_boot_entity` et lit directement les attributs des volumes HASS.Agent.
- Ajoute une configuration Skynet fondée sur 188 entités UNRAID réelles, avec 19 conteneurs, 5 VM et 13 volumes exploitables.
- Regroupe les disques par rôle, prend en charge les capteurs de santé inversés et masque les commandes Docker/VM non disponibles.
- Hiérarchise les métriques secondaires UNRAID dans Explorer : version, mises à jour, notifications, activité Docker, réseau et onduleur.

## 0.9.4

- Ajoute `image_opacity` de 0 à 100 pour régler l'opacité de l'image de fond de la carte PC.
- Conserve les textes, commandes, indicateurs et la grille à pleine opacité.

## 0.9.3

- Ajoute `card_background.mode` avec les variantes `grid`, `solid` et `gradient` pour la carte Pièce.
- Ajoute `card_background.color` et `card_background.gradient` pour personnaliser précisément le fond.
- Complète les pop-up UNRAID avec les commandes contextuelles de démarrage, arrêt, redémarrage, pause, reprise et console pour Docker et les VM.
- Distingue les charges UNRAID arrêtées des entités indisponibles et neutralise leurs commandes.
- Ajoute le détail des disques, leur occupation et température, la température maximale, les erreurs de parité et le trafic réseau à la vue UNRAID.

## 0.9.2

- Applique à la carte Pièce la trame technique discrète utilisée en arrière-plan de la carte PC.
- Ajoute un léger halo lié à `accent_color` afin d'unifier le langage graphique Auralis Frame.

## 0.9.1

- Rétablit automatiquement `dist/orbit-home-cards.js` à chaque build comme bundle de compatibilité.
- Permet de conserver temporairement l'ancien chemin de ressource et `custom:orbit-room-card` pour la carte Salon.

## 0.9.0

- Renomme la collection **Auralis Cards** et son langage graphique **Auralis Frame**.
- Renomme les composants en `custom:auralis-room-card`, `custom:auralis-pc-card`, `custom:auralis-unraid-card` et `custom:auralis-proxmox-card`.
- Renomme le bundle de distribution en `auralis-cards.js` et met à jour HACS, les exemples et la documentation.
- Conserve des alias `custom:orbit-*` pour assurer la transition des tableaux de bord existants.

## 0.8.1

- Rétablit un seul bouton « Ambiance » sur la photographie au lieu d'un bouton par scène.
- Ajoute une pop-up compacte qui liste les modes d'éclairage configurés et active le mode sélectionné.
- Ajoute `ambiance.label`, `ambiance.icon` et `ambiance.position` pour personnaliser le bouton unique.
- Ajoute `popup_titles.ambiance` pour personnaliser le titre de la pop-up.
- Enrichit la synthèse immersive Proxmox avec les ratios VM/LXC, la capacité de stockage, Ceph, la prochaine sauvegarde et les alertes facultatives.
- Distingue les métriques et états Proxmox indisponibles des valeurs nulles, et neutralise leurs commandes.

## 0.8.0

- Permet de placer le thermostat dans chacun des quatre coins de la photo avec `thermostat.position`.
- Ajoute une liste `scenes` acceptant plusieurs ambiances avec libellé et icône propres.
- Conserve la compatibilité avec l'ancienne option `scene_entity`.

## 0.7.3

- Force directement `border: none` lorsque `thermostat.show_border` vaut `false`.
- Force un fond transparent sans flou ni ombre lorsque `thermostat.show_background` vaut `false`.
- Resynchronise le bundle principal avec le bundle de distribution.

## 0.7.2

- Ajoute `thermostat.show_border` pour afficher ou masquer la bordure du thermostat.
- Ajoute `thermostat.show_background` pour rendre le fond complètement transparent et supprimer le flou.

## 0.7.1

- Corrige l'activation du bouton Mode soirée en appelant explicitement le service Home Assistant `scene.turn_on`.
- Ajoute un test automatisé pour l'activation des scènes.

## 0.7.0

- Ajoute deux zones de commandes configurables de chaque côté de la photographie.
- Centre automatiquement une commande unique et empile deux commandes dans la même colonne.
- Ajoute les commandes latérales Lumières, Volets, Climat, Musique, TV, Scène et Entité libre.
- Ajoute une pop-up TV avec alimentation, lecture/pause, volume et accès aux détails Home Assistant.
- Ajoute un thermostat superposé à la photo avec consigne, boutons −/+ et couleurs entièrement configurables.
- Raccourcit le sous-titre dynamique de la pièce et ajoute l'option `subtitle`.
- Ajoute un fichier YAML complet fondé sur les entités réelles fournies pour le Salon.

## 0.6.2

- Masque par défaut le bloc redondant « Valeurs actuelles » de la pop-up Température et humidité.
- Conserve `show_current_values: true` pour permettre son affichage volontaire.

## 0.6.1

- Remplace le grand bloc d'allumage général par une commande compacte et explicite sans chevron.
- Ajoute le réglage de couleur global et individuel pour les éclairages compatibles.
- Affiche une ampoule pleine, colorée et lumineuse lorsqu'une lumière est allumée.
- Désactive les commandes unitaires des lumières indisponibles.

## 0.6.0

- Ajoute `entity_labels` pour renommer les lumières, volets, capteurs, thermostats et lecteurs multimédias dans toutes les pop-up.
- Ajoute `popup_titles` pour personnaliser les titres des pop-up Détails, Lumières, Volets, Température/Humidité et Multimédia.
- Remplace le titre Climat par Température et humidité par défaut.
- Ajoute un graphe Home Assistant distinct pour chaque capteur configuré dans `climate_popup.graph_entities`.
- Permet de régler la période des graphes en heures, jours ou mois, ainsi que d'afficher ou masquer le résumé, les valeurs actuelles et le thermostat.

## 0.5.3

- Ajoute `cover_labels` pour personnaliser le libellé de chaque volet dans la carte Salon.
- Réutilise ces libellés dans la pop-up Volets et dans la liste détaillée des appareils.
- Conserve automatiquement le nom Home Assistant lorsque aucun libellé personnalisé n'est défini.

## 0.5.2

- Simplifie la pop-up Volets de la carte Pièce avec trois commandes directes par volet : ouvrir, stop et fermer.
- Supprime les curseurs et toutes les positions en pourcentage de cette pop-up.
- Conserve une commande groupée identique pour piloter tous les volets de la pièce.

## 0.5.1

- Aligne la carte Salon sur la maquette « Cadre vivant » validée.
- Conserve les commandes latérales jusqu’aux cartes très étroites au lieu de les déplacer trop tôt.
- Ajoute une photographie de salon intégrée par défaut pour éviter le grand espace vide lorsque `background_image` n’est pas configuré.
- Conserve le thème Carbon de la maquette de référence, avec température et humidité groupées dans l’en-tête.
- Rend le titre de la pièce cliquable pour conserver l’accès à la vue détaillée sans ajouter de bouton visuel.

## 0.5.0

- Ajout de `custom:orbit-proxmox-card` avec quorum, nœuds, VM, conteneurs LXC, Ceph et sauvegardes.
- Ajout des commandes de démarrage, reprise, redémarrage, console et démarrage multiple pour les charges Proxmox.
- Ajout des confirmations pour le redémarrage et l’arrêt des nœuds ou du cluster.
- Unification du design immersif PC, UNRAID et Proxmox.
- Ajout des options `accent_color`, `background_position`, `image_brightness` et `glass_opacity`.

## 0.4.0

- Nouvelle carte Pièce cinématique centrée sur une image, avec climat, éclairage, média et volets accessibles directement.
- Nouvelle présentation immersive des cartes PC et UNRAID avec jauge, rail d'actions et panneau de synthèse.
- Refonte de toutes les pop-up : résumé, sections fonctionnelles, listes détaillées et zone sensible séparée.
- Ajout de pop-up Orbit dédiées au climat et au lecteur multimédia.
- Ajout des options `background_image`, `media_player_entity`, `scene_entity` et `session_entity`.
- Mise en page responsive vérifiée de 318 px à 668 px sans débordement horizontal.

## 0.3.2

- Empêche les libellés des secteurs de déborder sur les cartes étroites.
- Remplace l'agrandissement mobile de l'orbite par une adaptation à la largeur réelle de la carte.
- Rend la ligne de résumé compacte et sûre lorsque l'espace horizontal manque.

## 0.3.1

- Correction de la hauteur déclarée dans les vues Sections et Masonry.
- Suppression du chevauchement d’une carte voisine sous le pied de carte.
- Isolation du rendu et ajustement de l’espacement inférieur.

## 0.3.0

- Retour à la carte orbitale validée : quatre secteurs remplis autour de la pièce.
- Lumières, volets, température et humidité sont affichés dans les secteurs.
- Ajout du résumé des ouvertures et des appareils indisponibles.
- Popup Lumières aligné sur la maquette avec action générale et interrupteurs.

## 0.2.0

- Refonte visuelle de la carte Pièce pour correspondre aux maquettes Halo.
- Anneau SVG précis avec segments d’état indépendants.
- Nouvelle hiérarchie typographique, surfaces tonales et badges d’équipements.
- Commandes compactes corrigées pour les petites largeurs.

## 0.1.0

- Première version de la carte de pièce Orbit.
- Carte PC avec métriques et commandes sécurisées.
- Carte UNRAID avec array, Docker et machines virtuelles.
- Thèmes Halo, Carbon, Mono et Aurora.
- Popups pour le contrôle individuel et groupé.
