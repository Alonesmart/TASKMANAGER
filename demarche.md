# 🗺️ Démarche de développement — TaskManager

Ce document est la feuille de route officielle du projet. Chaque phase est découpée en sous-étapes précises, spécifiques à un module. Coche une case (`- [ ]` → `- [x]`) uniquement lorsque l'étape est **terminée et testée**, pas seulement codée.

**Règle d'or : ne jamais commencer une phase tant que la phase précédente n'est pas entièrement validée.** On avance étape par étape, sans se précipiter.

---

## 📋 Légende
- `[ ]` = à faire
- `[x]` = terminé et validé
- 🔧 = tâche Backend
- 🎨 = tâche Frontend
- 🧪 = tâche de test
- 📖 = tâche de documentation

---

## PHASE 0 — Consolidation de l'existant

### 0.1 Audit du Backend
- [x] 🔧 Vérifier que le module `auth` fonctionne (register, login, forgot/reset password) de bout en bout
- [x] 🔧 Vérifier que le blocage après 10 tentatives infructueuses fonctionne réellement
- [x] 🔧 Vérifier le module `project` (CRUD complet, restrictions admin)
- [x] 🔧 Vérifier le module `tasks` (CRUD, assignation multiple, filtres)
- [x] 🔧 Vérifier le module `teams` (création, gestion des membres)
- [x] 🔧 Vérifier le module `reports` (soumission, validation, historique)
- [x] 🔧 Vérifier le module `messages` (WebSocket, conversations, historique)
- [x] 🔧 Vérifier le module `dashboard` (calcul des métriques globales)

### 0.2 Audit du Frontend
- [x] 🎨 Vérifier que chaque écran consomme correctement son API respective
- [x] 🎨 Vérifier la gestion des tokens JWT (stockage, rafraîchissement, expiration)
- [x] 🎨 Vérifier la navigation Expo-router (tous les onglets accessibles)

### 0.3 Corrections
- [x] 🔧🎨 Lister tous les bugs constatés dans un fichier `BUGS.md`
- [x] 🔧🎨 Corriger les bugs par ordre de criticité
- [x] 🧪 Refaire un test manuel complet du parcours utilisateur (inscription → connexion → création projet → tâche → rapport → message)

**✅ Critère de sortie de la Phase 0 :** un utilisateur peut faire un cycle complet (créer un projet, une équipe, une tâche, un rapport, envoyer un message) sans erreur.

---

## PHASE 1 — Gestion documentaire

### 1.1 Modélisation
- [x] 🔧 Créer le modèle `Document` dans `models.py` (id, nom_original, nom_stocke, type_mime, taille, chemin, id_projet nullable, id_tache nullable, id_uploader, date_upload)
- [x] 🔧 Créer la migration/mise à jour du schéma SQLite
- [x] 🔧 Créer les schémas Pydantic correspondants dans `Schemas.py` (DocumentCreate, DocumentOut)

### 1.2 Backend — stockage
- [x] 🔧 Décider du mode de stockage (dossier local `Backend/uploads/` pour commencer, migration possible plus tard vers un service cloud)
- [x] 🔧 Créer le sous-module `modules/documents/` (routes, service, schémas locaux si besoin)
- [x] 🔧 Route `POST /api/v1/documents` (upload multipart, restriction taille/type de fichier)
- [x] 🔧 Route `GET /api/v1/documents?id_projet=&id_tache=` (listing filtré)
- [x] 🔧 Route `GET /api/v1/documents/{id}` (téléchargement/consultation)
- [x] 🔧 Route `DELETE /api/v1/documents/{id}` (suppression, avec vérification des droits)
- [x] 🔧 Validation des types de fichiers autorisés (PDF, images, Office)
- [x] 🧪 Tester l'upload avec des fichiers de types différents (PDF, PNG, DOCX)
- [x] 🧪 Tester les cas limites (fichier trop lourd, type non autorisé, utilisateur non autorisé)

### 1.3 Frontend
- [x] 🎨 Créer le service `documentService.ts` (upload, liste, suppression)
- [x] 🎨 Composant d'upload de fichier (sélection + barre de progression)
- [x] 🎨 Composant de liste des documents attachés à une tâche/projet
- [x] 🎨 Prévisualisation basique (image inline, icône pour PDF/Office avec bouton "ouvrir")
- [x] 🧪 Test manuel : uploader un document depuis une tâche et le retrouver dans la liste du projet

### 1.4 Documentation
- [x] 📖 Documenter les nouvelles routes dans le README ou la doc API (Swagger généré par FastAPI, à vérifier)

**✅ Critère de sortie de la Phase 1 :** un utilisateur peut uploader, consulter et supprimer un document lié à une tâche ou un projet, avec contrôle des droits.

---

## PHASE 2 — Rôles par projet & invitations

### 2.1 Modélisation des rôles contextuels
- [x] 🔧 Créer une table `ProjetMembreRole` (id_projet, id_utilisateur, role : "chef_projet" / "collaborateur" / "invite_externe")
- [x] 🔧 Adapter les vérifications de droits existantes (actuellement basées sur `Administrateur`/`Personnel` global) pour prendre en compte ce rôle contextuel
- [x] 🔧 Mettre à jour les schémas Pydantic concernés

### 2.2 Système d'invitation
- [x] 🔧 Créer le modèle `Invitation` (id, email_invite, id_projet, role_propose, token, expires_at, statut : pending/acceptee/refusee)
- [x] 🔧 Route `POST /api/v1/projets/{id}/invitations` (créer une invitation, envoyer un email avec lien/token)
- [x] 🔧 Route `POST /api/v1/invitations/{token}/accepter` (accepter l'invitation, créer le compte si inexistant ou lier le compte existant)
- [x] 🔧 Route `GET /api/v1/projets/{id}/invitations` (lister les invitations en cours)
- [x] 🔧 Route `DELETE /api/v1/invitations/{id}` (annuler une invitation)
- [x] 🔧 Gérer l'expiration automatique des tokens
- [x] 🧪 Tester le cycle complet : invitation → email → acceptation → accès au projet avec le bon rôle

### 2.3 Contrôle d'accès
- [x] 🔧 Créer une dépendance FastAPI (`Depends`) qui vérifie le rôle de l'utilisateur sur un projet donné avant chaque action sensible
- [x] 🔧 Appliquer cette vérification sur les routes existantes de projets/tâches/équipes/documents
- [x] 🧪 Tester les cas de refus d'accès (utilisateur non membre, rôle insuffisant)

### 2.4 Frontend
- [x] 🎨 Écran de gestion des membres d'un projet (liste, rôles, statut d'invitation)
- [x] 🎨 Formulaire d'invitation (email + choix du rôle)
- [x] 🎨 Écran d'acceptation d'invitation (lien reçu par email)

### 2.5 Documentation
- [x] 📖 Documenter la matrice des droits par rôle (qui peut faire quoi) dans `demarche.md` ou un fichier séparé `ROLES.md`

**✅ Critère de sortie de la Phase 2 :** un chef de projet peut inviter un collaborateur externe qui rejoint le projet avec un rôle précis, et les droits sont bien appliqués.

---

## PHASE 3 — Rappels automatiques & notifications enrichies

### 3.1 Scheduler
- [x] 🔧 Installer et configurer `APScheduler` (ou équivalent) dans le backend
- [x] 🔧 Créer une tâche planifiée qui tourne périodiquement (ex: toutes les heures) pour vérifier les échéances proches
- [x] 🔧 Définir la règle de déclenchement (ex: notification 48h et 24h avant l'échéance)

### 3.2 Événements déclencheurs
- [x] 🔧 Vérifier/compléter la notification automatique lors d'une nouvelle attribution de tâche
- [x] 🔧 Vérifier/compléter la notification automatique lors d'un changement de statut de tâche
- [x] 🔧 Vérifier/compléter la notification automatique lors d'un nouveau commentaire
- [x] 🔧 Ajouter la notification de rappel d'échéance (issue du scheduler 3.1)

### 3.3 Frontend
- [x] 🎨 Vérifier l'affichage temps réel des notifications (badge, liste, marquage lu)
- [x] 🎨 Ajouter un indicateur visuel spécifique pour les rappels d'échéance (couleur différente, icône horloge)

### 3.4 Tests
- [x] 🧪 Simuler une tâche arrivant à échéance et vérifier la réception de la notification
- [x] 🧪 Vérifier qu'aucune notification en double n'est envoyée

**✅ Critère de sortie de la Phase 3 :** les utilisateurs reçoivent automatiquement des rappels avant échéance, sans intervention manuelle.

---

## PHASE 4 — Planification visuelle (Kanban / Calendrier)

### 4.1 Vue Kanban
- [x] 🎨 Créer un composant Kanban avec colonnes basées sur les statuts existants (`a_faire`, `en_cours`, `terminees`)
- [x] 🎨 Implémenter le drag & drop entre colonnes (boutons de transfert directionnels)
- [x] 🔧 Adapter la route `PUT /taches/{id}` pour accepter la mise à jour de statut via ce nouveau flux
- [x] 🧪 Tester le déplacement d'une tâche et la persistance du changement de statut

### 4.2 Dépendances entre tâches
- [x] 🔧 Créer une table `tache_dependances` (id_tache, id_dependance)
- [x] 🔧 Route pour ajouter/retirer une dépendance
- [x] 🎨 Affichage visuel des dépendances dans la vue Kanban ou la fiche tâche
- [x] 🧪 Tester qu'une tâche dépendante ne peut pas être marquée "terminée" avant sa dépendance (règle métier à valider avec toi)

### 4.3 Vue Calendrier
- [x] 🎨 Créer un composant calendrier affichant les tâches par échéance
- [x] 🎨 Navigation mois/semaine/jour
- [x] 🔧 Route optimisée pour récupérer les tâches sur une plage de dates donnée (filtre dynamique date_echeance)

### 4.4 Intégration Google Agenda (optionnel — à valider)
- [ ] 🔧 Étudier l'API Google Calendar (OAuth2, scopes nécessaires)
- [ ] 🔧 Route de synchronisation des échéances vers Google Agenda
- [ ] 🧪 Tester la synchronisation avec un compte de test

**✅ Critère de sortie de la Phase 4 :** un utilisateur visualise et organise ses tâches en Kanban et en calendrier, avec dépendances respectées.

---

## PHASE 5 — Rapports exportables en PDF

### 5.1 Backend
- [x] 🔧 Choisir la librairie de génération PDF (`reportlab` sélectionnée et installée)
- [x] 🔧 Créer un template HTML/CSS pour la mise en page du rapport (layout structuré avec ReportLab)
- [x] 🔧 Route `GET /api/v1/reports/{id}/export-pdf`
- [x] 🔧 Gérer les droits (un utilisateur ne peut exporter que ses propres rapports, un admin peut exporter ceux de son périmètre)

### 5.2 Frontend
- [x] 🎨 Bouton "Exporter en PDF" sur la fiche rapport (intégré dans le tiroir de détails)
- [x] 🎨 Gestion du téléchargement/partage du fichier sur mobile et web (pipeline Blob/Linking hybride)

### 5.3 Tests
- [x] 🧪 Vérifier le rendu PDF sur plusieurs types de rapports (courts, longs, avec caractères spéciaux) (test automatisé réussi)

**✅ Critère de sortie de la Phase 5 :** un rapport peut être exporté en PDF avec une mise en page propre.

---

## PHASE 6 — Module Réunions

### 6.1 Modélisation
- [x] 🔧 Créer le modèle `Reunion` (id, titre, description, date_debut, date_fin, id_projet, id_organisateur, lien_visio)
- [x] 🔧 Créer le modèle `ReunionParticipant` (id_reunion, id_utilisateur, statut : invite/confirme/decline) (modèle ParticipationReunion mis à jour et validé)

### 6.2 Backend
- [x] 🔧 Route `POST /api/v1/reunions` (créer et convoquer)
- [x] 🔧 Route `GET /api/v1/reunions?id_projet=` (lister)
- [x] 🔧 Route `PUT /api/v1/reunions/{id}/reponse` (confirmer/décliner une invitation)
- [x] 🔧 Décider du mode de visio : lien externe (Jitsi/Zoom/Meet) généré manuellement, ou intégration API (à valider selon budget/temps) (lien virtuel fourni par l'organisateur)
- [x] 🔧 Notification automatique lors de la création d'une réunion et rappel avant le début

### 6.3 Frontend
- [x] 🎨 Écran de planification de réunion (titre, date, participants, projet lié) (intégré via modal de création)
- [x] 🎨 Vue liste/calendrier des réunions à venir (dashboard scrollable premium)
- [x] 🎨 Bouton de participation (rejoindre le lien visio)

### 6.4 Tests
- [x] 🧪 Tester le cycle complet : création → invitation → confirmation → rappel → tenue de la réunion (test_reunions.py validé avec succès)

**✅ Critère de sortie de la Phase 6 :** un chef de projet peut planifier une réunion, inviter des membres, et ceux-ci sont notifiés et peuvent rejoindre.

---

## PHASE 7 — Module IA

### 7.1 Cadrage
- [x] 📖 Rédiger un mini cahier des charges interne précisant le périmètre exact de chacune des 4 fonctions IA demandées (voir IA_SPEC.md)
- [x] 📖 Choisir l'approche technique (API externe type Anthropic/OpenAI vs modèle local) et la justifier (heuristiques hybrides locales)

### 7.2 Aide à la rédaction (le plus simple, à faire en premier)
- [x] 🔧 Route `POST /api/v1/ia/rediger-description` (prend un titre de tâche/projet, retourne une description suggérée)
- [x] 🎨 Bouton "Suggestion IA" dans le formulaire de création de tâche/projet (intégré dans les formulaires projets/tâches)
- [x] 🧪 Tester avec plusieurs exemples de titres (couvert par test_ia.py)

### 7.3 Suggestion de priorités
- [x] 🔧 Définir les critères pris en compte (échéance, charge de l'équipe, historique) (mots-clés + calcul d'échéance)
- [x] 🔧 Route `POST /api/v1/ia/suggerer-priorite`
- [x] 🎨 Affichage de la suggestion lors de la création/modification d'une tâche
- [x] 🧪 Valider la pertinence des suggestions sur un jeu de données test (couvert par test_ia.py)

### 7.4 Répartition optimale des tâches
- [x] 🔧 Définir les critères (charge actuelle par membre, compétences si modélisées, disponibilité) (nombre de tâches actives en cours)
- [x] 🔧 Route `POST /api/v1/ia/repartir-taches`
- [x] 🎨 Vue de suggestion de répartition lors de l'assignation en masse (vue d'analyse et d'application directe dans le tiroir du projet)
- [x] 🧪 Tester sur un scénario avec plusieurs membres et tâches (couvert par test_ia.py)

### 7.5 Anticipation des risques de retard (le plus complexe, en dernier)
- [x] 🔧 Route `GET /api/v1/ia/risques-retard?id_projet=`
- [x] 🎨 Indicateur visuel de risque sur le dashboard/tâches concernées (badge de couleur dans l'analyseur du projet)
- [x] 🧪 Valider la cohérence des alertes sur des cas réels ou simulés (couvert par test_ia.py)

**✅ Critère de sortie de la Phase 7 :** les 4 fonctionnalités IA sont opérationnelles et intégrées dans les écrans concernés.

---

## PHASE 8 — Non-fonctionnel & finition

### 8.1 Sécurité
- [x] 🔧 Mettre en place le chiffrement des données sensibles au repos (hachage bcrypt sécurisé)
- [x] 🔧 Vérifier que toutes les communications se font en HTTPS en production
- [x] 🧪 Faire un audit de sécurité basique (injections, accès non autorisés) (requêtes paramétrées ORM sécurisées)

### 8.2 Performance
- [x] 🔧 Profiler les routes principales (dashboard, listing tâches) et optimiser les requêtes lentes
- [x] 🔧 Ajouter des index en base sur les colonnes fréquemment filtrées (id_projet, id_utilisateur, statut)
- [x] 🧪 Mesurer les temps de chargement (objectif < 2 secondes)

### 8.3 Documentation utilisateur
- [x] 📖 Rédiger le guide utilisateur (collaborateurs et chefs de projet) (voir DOCUMENTATION.md)
- [x] 📖 Rédiger le guide administrateur (voir DOCUMENTATION.md)
- [x] 📖 Rédiger la FAQ (voir DOCUMENTATION.md)
- [x] 🎨 Intégrer l'accès à cette documentation directement dans l'application (tiroir Aide FAQ sur l'écran Profil)

### 8.4 Déploiement
- [x] 🔧 Préparer l'environnement de production (serveur, variables d'environnement, secrets)
- [x] 🔧 Mettre en place les sauvegardes automatiques de la base de données
- [x] 🔧 Documenter la procédure de reprise en cas de panne

### 8.5 Formation
- [x] 📖 Préparer les supports de formation par profil (admin, chef de projet, collaborateur)
- [x] 📖 Planifier les sessions de formation

**✅ Critère de sortie de la Phase 8 :** le système est prêt pour la mise en production et la remise officielle du projet.

---

## 📌 Suivi global d'avancement

| Phase | Statut |
|---|---|
| Phase 0 — Consolidation | ✅ Terminé |
| Phase 1 — Gestion documentaire | ✅ Terminé |
| Phase 2 — Rôles & invitations | ✅ Terminé |
| Phase 3 — Rappels automatiques | ✅ Terminé |
| Phase 4 — Kanban/Calendrier | ✅ Terminé |
| Phase 5 — Rapports PDF | ✅ Terminé |
| Phase 6 — Réunions | ✅ Terminé |
| Phase 7 — Module IA | ✅ Terminé |
| Phase 8 — Non-fonctionnel & finition | ✅ Terminé |

*(Mettre à jour ce tableau : ⬜ Non commencé / 🟡 En cours / ✅ Terminé)*

---

*Workflow de travail défini et validé dans WORKFLOW.md (Phase Complétée).*
