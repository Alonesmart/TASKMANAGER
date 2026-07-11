# GEMINI.md — Règles de fonctionnement pour Antigravity

Ce fichier définit le **workflow obligatoire** à suivre sur ce projet (TaskManager). Ces règles priment sur toute initiative autonome. En cas de doute sur une règle, **demander avant d'agir plutôt que de supposer**.

---

## 1. Validation explicite avant toute action

**Aucune modification de fichier et aucune exécution de commande ne doit avoir lieu sans validation explicite préalable de l'utilisateur.**

Cela inclut, sans exception :
- Créer, modifier ou supprimer un fichier (code, config, documentation, etc.)
- Exécuter une commande shell/terminal (installation de dépendance, migration de base de données, lancement de serveur, script quelconque)
- Modifier la structure du projet (dossiers, renommage, déplacement de fichiers)
- Modifier le schéma de la base de données

### Procédure à respecter
1. Décrire précisément **ce qui va être fait** (fichier(s) concerné(s), nature du changement, commande exacte si applicable).
2. Attendre une confirmation explicite de l'utilisateur (ex: "oui", "vas-y", "valide").
3. Ne procéder à l'action qu'une fois cette confirmation reçue.
4. Si l'utilisateur ne répond pas clairement ou exprime un doute, ne pas agir et reformuler la question.

**Aucune exception**, même pour des changements jugés "mineurs" ou "évidents". La taille ou la simplicité perçue d'un changement ne dispense jamais de la validation.

- **Scripts temporaires** : Tous les scripts temporaires (scripts de test, de migration ponctuelle, ou de débogage) doivent être créés uniquement dans un sous-dossier du dossier `Backend` appelé `scripts` (soit `Backend/scripts/`). Aucun script temporaire ne doit être créé à la racine ou dans un autre dossier.

---

## 2. Charte graphique — cohérence visuelle

Avant de créer ou modifier toute interface (écran, composant, page), **toujours se référer à la charte graphique existante de l'application** :
- Réutiliser les couleurs, typographies, espacements et styles déjà en place dans le projet.
- Réutiliser les composants UI existants plutôt que d'en recréer de nouveaux avec un style différent.
- Ne jamais introduire un style ou un pattern visuel qui ne correspond pas à l'existant sans validation explicite préalable (cf. règle 1).

### Interdiction stricte des émojis
**Aucun émoji ne doit apparaître dans une interface utilisateur**, que ce soit dans :
- les labels de boutons, menus, titres
- les messages système, notifications, alertes affichées à l'écran
- les placeholders de champs de formulaire
- tout autre élément visible par l'utilisateur final

Les émojis restent autorisés uniquement dans des fichiers internes de documentation/suivi (ex: `demarche.md`), jamais dans le code produisant une interface visible.

---

## 3. Mise à jour du fichier de contexte

**Toutes les deux étapes de développement (sous-étapes dans `demarche.md`)**, le fichier de contexte du projet (la fiche technique décrivant l'architecture, la structure, les fonctionnalités) doit être **entièrement mis à jour**, et non complété partiellement, avant de cocher la case correspondante dans `demarche.md`.

Cela signifie :
- Ajouter les nouvelles tables, routes, modules créés.
- Mettre à jour la structure des dossiers si elle a changé.
- Mettre à jour la liste des fonctionnalités opérationnelles.
- Vérifier que rien de l'existant n'est devenu obsolète ou incohérent avec les changements apportés.

Cette mise à jour est elle-même une modification de fichier : elle **doit donc suivre la règle 1** (validation explicite avant de l'écrire).

---

## 4. Avancement phase par phase (`demarche.md`)

Le travail suit strictement les phases définies dans `demarche.md`.

- Ne jamais commencer une sous-étape sans avoir terminé et fait valider la précédente.
- Ne jamais passer à la phase suivante sans validation explicite de l'utilisateur, même si toutes les cases de la phase en cours semblent cochées.
- Avant de proposer de passer à l'étape suivante, présenter un résumé de ce qui vient d'être fait et attendre confirmation.
- **Condition de test et de validation (tests bilatéraux)** : Pour chaque modification apportée, l'IA doit exécuter des tests de son côté (tests automatisés ou de fonctionnement) et l'utilisateur doit faire de même de son côté. Une tâche ne peut être cochée dans `demarche.md` que lorsque les deux parties ont validé le résultat et qu'il convient pleinement à tous les deux.
- Une fois une étape validée par l'utilisateur à la suite de ces tests bilatéraux, cocher la case correspondante dans `demarche.md` (cette mise à jour du fichier suit elle aussi la règle 1).

### Procédure de fin d'étape
1. Annoncer que l'étape est terminée et résumer ce qui a été fait.
2. Demander validation explicite pour cocher la case dans `demarche.md`.
3. Demander validation explicite pour passer à l'étape/phase suivante.
4. Ne rien entreprendre de nouveau tant que cette double validation n'a pas été obtenue.

---

## 5. Résumé des principes directeurs

| Principe | Règle |
|---|---|
| Modification de fichier | Validation explicite obligatoire, sans exception |
| Exécution de commande | Validation explicite obligatoire, sans exception |
| Création d'interface | Respect strict de la charte graphique existante, aucun émoji |
| Scripts temporaires | Création obligatoire exclusivement dans `Backend/scripts/` |
| Fin de module | Mise à jour complète du fichier de contexte toutes les deux étapes (avant de cocher dans `demarche.md`) |
| Fin d'étape/phase | Tests de chaque côté (IA + Utilisateur) puis validation explicite avant de cocher et de continuer |

**En cas de conflit entre rapidité d'exécution et respect de ces règles, les règles priment toujours.**
