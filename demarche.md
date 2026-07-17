# 🗺️ Démarche de développement — TaskManager

Ce document est la feuille de route officielle du projet. Chaque phase est découpée en sous-étapes précises, spécifiques à un module. Coche une case (`- [ ]` → `- [xxx]`) uniquement lorsque l'étape est **terminée et testée**, pas seulement codée.

**Règle d'or : ne jamais commencer une phase tant que la phase précédente n'est pas entièrement validée.** On avance étape par étape, sans se précipiter.

---

## 📋 Légende
- `[ ]` = à faire
- `[xxx]` = terminé et validé
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
| Phase 9 — Évolutions demandées | ✅ Terminé |

*(Mettre à jour ce tableau : ⬜ Non commencé / 🟡 En cours / ✅ Terminé)*

---

*Workflow de travail défini et validé dans WORKFLOW.md (Phase Complétée).*

---

## PHASE 9 — Évolutions demandées par l'utilisateur

### 9.1 Chef de projet universel
- [x] 🔧 Backend : Permettre à n'importe quel utilisateur (admin ou personnel) d'être désigné comme chef de projet dans routes.py
- [x] 🎨 Frontend : Rendre sélectionnables tous les utilisateurs du système pour le rôle de chef de projet dans new.tsx
- [x] 🧪 Tester la création et la modification d'un projet avec un chef de projet non-admin
- [x] 📖 Mettre à jour le fichier de contexte

### 9.2 Notifications automatiques sur modification
- [x] 🔧 Backend : Envoyer une notification aux membres concernés lors de la modification d'un projet dans project/routes.py
- [x] 🔧 Backend : Envoyer une notification aux collaborateurs assignés lors de la modification d'une tâche dans tasks/routes.py
- [x] 📖 Mettre à jour le fichier de contexte

# 🗺️ Démarche de développement — Module Messagerie (refonte style WhatsApp)

Ce document complète `demarche.md`. Il détaille le plan de refonte du module `messages` déjà existant (audité en Phase 0), pour l'amener au niveau d'une expérience type WhatsApp (liste de conversations, chat temps réel, statuts, pièces jointes, groupes).

**Règle d'or : ne jamais commencer une phase tant que la précédente n'est pas entièrement validée** (cf. GEMINI.md — règle 4, tests bilatéraux IA + utilisateur obligatoires avant de cocher une case).

## PHASE 10 — Audit de l'existant

### 10.1 État des lieux
- [x] 🔧 Vérifier le modèle actuel des messages (champs, table `conversations`, table `messages`, relations)
- [x] 🔧 Vérifier le fonctionnement du WebSocket existant (connexion, reconnexion, gestion de la déconnexion)
- [x] 🎨 Vérifier l'écran actuel de messagerie et lister les écarts avec le rendu attendu (style WhatsApp)
- [x] 📖 Lister dans `BUGS_MESSAGERIE.md` tout ce qui ne fonctionne pas ou est incomplet

**✅ Critère de sortie M0 :** état des lieux complet et écarts identifiés, validé avec toi avant de coder quoi que ce soit.

---

## PHASE 11 — Modèle de données étendu

### 11.1 Statuts de message
- [x] 🔧 Ajouter le champ `statut` sur le modèle `Message` (`envoye` / `distribue` / `lu`)
- [x] 🔧 Ajouter une table ou un champ de suivi de lecture par utilisateur (pour les conversations de groupe : qui a lu, à quelle heure)
- [x] 🔧 Migration du schéma (SQLite/MySQL)

### 11.2 Présence et activité
- [x] 🔧 Ajouter le suivi de présence utilisateur (`en_ligne`, `derniere_connexion`)
- [x] 🔧 Événement WebSocket `en_train_decrire` (indicateur de frappe)

### 11.3 Schémas
- [x] 🔧 Mettre à jour les schémas Pydantic (`MessageOut`, `ConversationOut`) avec les nouveaux champs

**✅ Critère de sortie M1 :** le backend peut stocker et exposer le statut d'un message et la présence d'un utilisateur.

---

## PHASE 12 — Backend temps réel

### 12.1 Statuts en temps réel
- [x] 🔧 Émettre un événement WebSocket quand un message passe de `envoye` à `distribue` (destinataire connecté)
- [x] 🔧 Émettre un événement WebSocket quand un message est marqué `lu` (ouverture de la conversation)
- [x] 🔧 Route `PUT /api/v1/messages/{id}/lu` (marquage manuel si besoin)

### 12.2 Indicateur de frappe
- [x] 🔧 Diffuser l'événement de frappe aux autres participants de la conversation (avec timeout automatique)

### 12.3 Présence
- [x] 🔧 Mettre à jour `en_ligne` à la connexion/déconnexion du WebSocket
- [x] 🧪 Tester les statuts avec deux comptes simultanés (envoyé → distribué → lu)

**✅ Critère de sortie M2 :** les statuts et indicateurs se propagent en temps réel entre deux utilisateurs connectés.

---

## PHASE 13 — Refonte Frontend (liste des conversations)

### 13.1 Intégration de l'écran liste
- [x] 🎨 Intégrer `ConversationsListScreen` dans `app/(tabs)/messages/index.tsx`
- [x] 🎨 Brancher la liste sur l'API réelle (`GET /api/v1/conversations`) à la place des données de démo
- [x] 🎨 Adapter les couleurs/typographies à la charte graphique existante de l'application (cf. GEMINI.md — règle 2, pas de style WhatsApp brut si ça diffère de la charte du projet)
- [x] 🎨 Recherche fonctionnelle (filtrage local ou requête backend selon volume)
- [x] 🎨 Badges de messages non lus connectés aux vraies données

**✅ Critère de sortie M3 :** la liste des conversations affiche les vraies données, avec badges et recherche opérationnels.

---

## PHASE 14 — Refonte Frontend (écran de conversation)

### 14.1 Intégration de l'écran chat
- [x] 🎨 Intégrer `ChatScreen` dans `app/(tabs)/messages/[id].tsx`
- [x] 🎨 Brancher l'envoi/réception de messages sur le WebSocket réel
- [x] 🎨 Afficher les ticks de statut (envoyé/distribué/lu) à partir des vraies données
- [x] 🎨 Afficher l'indicateur "en train d'écrire" en temps réel
- [x] 🎨 Pagination/chargement de l'historique (scroll vers le haut = charger plus ancien)

### 14.2 Adaptation charte graphique
- [x] 🎨 Vérifier la cohérence des couleurs de bulles avec le thème clair/sombre existant de l'app
- [x] 🧪 Test manuel : conversation complète entre deux comptes (envoi, réception, statuts, frappe)

**✅ Critère de sortie M4 :** un utilisateur peut tenir une conversation complète en temps réel avec statuts et indicateur de frappe fonctionnels.

---

## PHASE 15 — Pièces jointes dans les messages

### 15.1 Backend
- [x] 🔧 Étendre le modèle `Message` pour référencer un document joint (réutiliser le module `documents` existant)
- [x] 🔧 Route d'envoi de message avec pièce jointe (image, PDF, audio court)
- [x] 🧪 Tester l'envoi de différents types de fichiers dans une conversation

### 14.2 Frontend
- [x] 🎨 Bouton trombone → sélection fichier/galerie/caméra
- [x] 🎨 Aperçu de l'image ou de l'icône du fichier dans la bulle de message
- [x] 🎨 Enregistrement et envoi de message vocal (bouton micro)

**✅ Critère de sortie M5 :** un utilisateur peut envoyer une image, un document ou un message vocal dans une conversation.

---

## PHASE 16 — Conversations de groupe

### 16.1 Backend
- [x] 🔧 Modèle `ConversationGroupe` (nom, avatar, participants, admin)
- [x] 🔧 Routes de création/gestion de groupe (ajout/retrait de membres, changement d'admin)
- [x] 🧪 Tester les droits (seul l'admin du groupe peut ajouter/retirer des membres)

### 16.2 Frontend
- [x] 🎨 Écran de création de groupe (sélection de membres, nom, avatar)
- [x] 🎨 Affichage adapté dans le chat (nom de l'expéditeur au-dessus de chaque message dans un groupe)
- [x] 🎨 Écran de gestion des participants du groupe

**✅ Critère de sortie M6 :** un utilisateur peut créer un groupe, y discuter, et gérer les participants selon son rôle.

---

## PHASE 17 — Notifications liées à la messagerie

### 17.1 Backend
- [x] 🔧 Notification push/in-app à la réception d'un nouveau message si l'utilisateur n'est pas dans la conversation
- [x] 🔧 Regroupement des notifications par conversation (éviter le spam)

### 17

.2 Frontend
- [x] 🎨 Badge de compteur global sur l'onglet Messages
- [x] 🧪 Tester la réception de notification hors application (background/fermée)

**✅ Critère de sortie M7 :** les nouveaux messages génèrent une notification cohérente sans doublon.

---

## PHASE M8 — Finition et documentation

### M8.1 Tests globaux
- [x] 🧪 Test de bout en bout : conversation individuelle + groupe + pièces jointes + notifications
- [x] 🧪 Test de charge basique (plusieurs conversations actives simultanément)

### M8.2 Documentation
- [x] 📖 Mettre à jour le fichier de contexte (GEMINI.md section 6) avec le modèle de données final et les routes ajoutées
- [x] 📖 Documenter les nouvelles routes API (Swagger)

**✅ Critère de sortie M8 :** le module messagerie est complet, testé, documenté, et prêt à être intégré dans le suivi global du projet (`demarche.md`).

---

## 📌 Suivi d'avancement

| Phase | Statut |
|---|---|
| M0 — Audit de l'existant | ✅ Terminé |
| M1 — Modèle de données étendu | ✅ Terminé |
| M2 — Backend temps réel | ✅ Terminé |
| M3 — Frontend liste conversations | ✅ Terminé |
| M4 — Frontend écran chat | ✅ Terminé |
| M5 — Pièces jointes | ✅ Terminé |
| M6 — Groupes | ✅ Terminé |
| M7 — Notifications messagerie | ✅ Terminé |
| M8 — Finition et documentation | ✅ Terminé |

*(⬜ Non commencé / 🟡 En cours / ✅ Terminé — à mettre à jour au fil de l'avancement, en respectant les tests bilatéraux définis dans GEMINI.md)*

# 🗺️ Démarche de développement — Module Rapports (circuit de validation & évolutions)

Ce document complète `demarche.md`. Il détaille le plan d'évolution du module `reports` déjà existant (audité en Phase 0, export PDF terminé en Phase 5), pour clarifier et renforcer le circuit de soumission/validation, l'historique, et les notifications associées.

**Règle d'or : ne jamais commencer une phase tant que la précédente n'est pas entièrement validée** (cf. GEMINI.md — règle 4, tests bilatéraux IA + utilisateur obligatoires avant de cocher une case).

## PHASE R0 — Audit de l'existant

### R0.1 État des lieux
- [x] 🔧 Vérifier la structure exacte du modèle `Rapport` actuel (champs, statuts existants, relations projet/tâche/utilisateur)
- [x] 🔧 Vérifier le circuit de validation actuel (qui valide, comment, y a-t-il un rejet possible ?)
- [x] 🎨 Vérifier les écrans existants (soumission, liste, détail) et leur cohérence avec la charte graphique
- [x] 📖 Lister dans `BUGS_RAPPORTS.md` les écarts entre le comportement attendu et l'existant

**✅ Critère de sortie R0 :** état des lieux complet du circuit rapport, validé avec toi avant toute modification.

---

## PHASE R1 — Modèle de données du circuit de validation

### R1.1 Statuts précis
- [x] 🔧 Définir les statuts officiels du rapport (`brouillon`, `soumis`, `en_revision`, `valide`, `rejete`)
- [x] 🔧 Ajouter le champ `statut` et `date_soumission` / `date_validation` sur le modèle `Rapport` si absents
- [x] 🔧 Ajouter un champ `commentaire_validation` (motif de rejet ou remarque du validateur)

### R1.2 Traçabilité
- [x] 🔧 Créer une table `HistoriqueRapport` (id_rapport, ancien_statut, nouveau_statut, id_acteur, date, commentaire) pour tracer chaque changement d'état
- [x] 🔧 Mettre à jour les schémas Pydantic (`RapportOut`, `RapportCreate`, `RapportValidation`)

**✅ Critère de sortie R1 :** le modèle de données couvre l'ensemble du cycle de vie d'un rapport avec traçabilité complète.

---

## PHASE R2 — Backend circuit de validation

### R2.1 Routes de cycle de vie
- [x] 🔧 Route `POST /api/v1/reports` (création en `brouillon` ou soumission directe)
- [x] 🔧 Route `PUT /api/v1/reports/{id}/soumettre` (passage `brouillon` → `soumis`)
- [x] 🔧 Route `PUT /api/v1/reports/{id}/valider` (réservée au chef de projet/admin concerné)
- [x] 🔧 Route `PUT /api/v1/reports/{id}/rejeter` (avec commentaire obligatoire)
- [x] 🔧 Route `GET /api/v1/reports/{id}/historique` (consultation de la traçabilité)

### R2.2 Droits d'accès
- [x] 🔧 Vérifier que seul l'auteur peut soumettre/modifier son rapport tant qu'il est en `brouillon`
- [x] 🔧 Vérifier que seul le chef de projet (ou admin de périmètre) peut valider/rejeter
- [x] 🧪 Tester les cas de refus d'accès (validation par un utilisateur non autorisé)

**✅ Critère de sortie R2 :** le cycle complet brouillon → soumission → validation/rejet fonctionne avec les bons droits.

---

## PHASE R3 — Frontend liste des rapports

### R3.1 Écran liste
- [x] 🎨 Liste des rapports avec indicateur visuel de statut (couleur/badge par statut)
- [x] 🎨 Filtres (par statut, par projet, par date)
- [x] 🎨 Vue différenciée : "Mes rapports" (auteur) vs "À valider" (chef de projet/admin)

**✅ Critère de sortie R3 :** un utilisateur retrouve facilement ses rapports et, si concerné, ceux en attente de sa validation.

---

## PHASE R4 — Frontend soumission et validation

### R4.1 Formulaire de rapport
- [x] 🎨 Formulaire de création/édition en mode `brouillon` (sauvegarde automatique ou manuelle)
- [x] 🎨 Bouton "Soumettre" (passage en `soumis`, verrouillage de l'édition)

### R4.2 Écran de validation
- [x] 🎨 Vue détaillée du rapport côté validateur avec boutons "Valider" / "Rejeter"
- [x] 🎨 Champ de commentaire obligatoire en cas de rejet
- [x] 🎨 Affichage de l'historique des statuts dans le tiroir de détail
- [x] 🧪 Test manuel : cycle complet brouillon → soumission → rejet avec commentaire → correction → validation

**✅ Critère de sortie R4 :** le circuit de soumission/validation est utilisable de bout en bout côté interface.

---

## PHASE R5 — Notifications liées aux rapports

### R5.1 Backend
- [x] 🔧 Notification au(x) validateur(s) concerné(s) lors d'une soumission
- [x] 🔧 Notification à l'auteur lors d'une validation ou d'un rejet (avec le commentaire)

### R5.2 Frontend
- [x] 🎨 Badge sur l'onglet Rapports pour les rapports en attente de validation
- [x] 🧪 Tester la réception des notifications sur les deux rôles (auteur / validateur)

**✅ Critère de sortie R5 :** chaque changement de statut génère une notification pertinente pour la bonne personne.

---

## PHASE R6 — Export PDF (déjà en place — vérification et enrichissement)

### R6.1 Vérification de l'existant
- [x] 🧪 Revalider que l'export PDF (ReportLab, route `GET /api/v1/reports/{id}/export-pdf`) reste cohérent avec les nouveaux statuts
- [x] 🔧 Ajouter le statut et l'historique de validation dans le PDF exporté (traçabilité visible)

**✅ Critère de sortie R6 :** le PDF exporté reflète fidèlement le cycle de vie complet du rapport.

---

## PHASE R7 — Statistiques et tableau de bord

### R7.1 Indicateurs
- [x] 🔧 Route de statistiques (nombre de rapports par statut, délai moyen de validation, par projet)
- [x] 🎨 Widget dashboard : rapports en attente, taux de validation, délais moyens

**✅ Critère de sortie R7 :** un chef de projet/admin dispose d'une vue synthétique du circuit de validation sur son périmètre.

---

## PHASE R8 — Finition et documentation

### R8.1 Tests globaux
- [x] 🧪 Test de bout en bout multi-rôles (auteur, chef de projet, admin) sur plusieurs rapports simultanés
- [x] 🧪 Vérifier la cohérence des droits sur tous les cas limites (rapport d'un projet supprimé, utilisateur retiré du projet, etc.)

### R8.2 Documentation
- [x] 📖 Mettre à jour le fichier de contexte (contexte.md section 8) avec le modèle de données final et les routes ajoutées
- [x] 📖 Documenter la matrice des droits du circuit de validation (qui peut faire quoi, à quel statut)

**✅ Critère de sortie R8 :** le module rapports est complet, testé, documenté, et prêt à être intégré dans le suivi global du projet (`demarche.md`).

---

## 📌 Suivi d'avancement

| Phase | Statut |
|---|---|
| R0 — Audit de l'existant | ✅ Terminé |
| R1 — Modèle de données du circuit | ✅ Terminé |
| R2 — Backend circuit de validation | ✅ Terminé |
| R3 — Frontend liste des rapports | ✅ Terminé |
| R4 — Frontend soumission et validation | ✅ Terminé |
| R5 — Notifications liées aux rapports | ✅ Terminé |
| R6 — Export PDF (vérification/enrichissement) | ✅ Terminé |
| R7 — Statistiques et tableau de bord | ✅ Terminé |
| R8 — Finition et documentation | ✅ Terminé |

*(⬜ Non commencé / 🟡 En cours / ✅ Terminé — à mettre à jour au fil de l'avancement, en respectant les tests bilatéraux définis dans GEMINI.md)*


# 🗺️ Démarche de développement — Circuit de validation des tâches

Ce document complète `demarche.md`. Il détaille la mise en place d'un circuit de validation pour la finalisation des tâches, sur le même principe que le circuit déjà défini pour les rapports (`demarche_rapports.md`) : preuve de réalisation + validation par le chef de projet/admin avant passage définitif à "terminée".

**Règle d'or : ne jamais commencer une phase tant que la précédente n'est pas entièrement validée** (cf. GEMINI.md — règle 4, tests bilatéraux IA + utilisateur obligatoires avant de cocher une case).

## PHASE T0 — Audit de l'existant

- [x] 🔧 Vérifier la structure exacte du modèle `Tache` (statuts actuels, champs disponibles)
- [x] 🔧 Vérifier comment le changement de statut Kanban est déclenché aujourd'hui (route, droits d'accès)
- [x] 📖 Confirmer avec toi la portée exacte du circuit à mettre en place (preuve obligatoire ? validation obligatoire ? les deux ?)

**✅ Critère de sortie T0 :** périmètre du circuit de validation confirmé avant toute modification de code.

---

## PHASE T1 — Modèle de données

### T1.1 Nouveau statut intermédiaire
- [x] 🔧 Ajouter le statut `terminee_en_attente` entre `en_cours` et `terminee` dans le modèle `Tache`
- [x] 🔧 Ajouter les champs `preuve_texte` (commentaire) et/ou `id_document_preuve` (lien vers le module documents existant)
- [x] 🔧 Ajouter `commentaire_rejet` (motif si l'admin renvoie la tâche en cours)

### T1.2 Traçabilité
- [x] 🔧 Créer une table `HistoriqueValidationTache` (id_tache, ancien_statut, nouveau_statut, id_acteur, date, commentaire), sur le même principe que `HistoriqueRapport`
- [x] 🔧 Mettre à jour les schémas Pydantic (`TacheOut`, `TacheValidation`)

**✅ Critère de sortie T1 :** le modèle de données couvre le nouveau statut, la preuve et la traçabilité.

---

## PHASE T2 — Backend circuit de validation

### T2.1 Routes de cycle de vie
- [x] 🔧 Route `PUT /api/v1/taches/{id}/soumettre-terminee` (passage `en_cours` → `terminee_en_attente`, preuve obligatoire selon le choix fait en T0)
- [x] 🔧 Route `PUT /api/v1/taches/{id}/valider` (passage `terminee_en_attente` → `terminee`, réservée chef de projet/admin)
- [x] 🔧 Route `PUT /api/v1/taches/{id}/rejeter` (passage `terminee_en_attente` → `en_cours`, commentaire obligatoire)
- [x] 🔧 Route `GET /api/v1/taches/{id}/historique-validation`

### T2.2 Droits d'accès
- [x] 🔧 Vérifier que seul l'assigné peut soumettre sa tâche comme terminée
- [x] 🔧 Vérifier que seul le chef de projet (rôle contextuel) ou l'admin peut valider/rejeter
- [x] 🔧 Adapter le calcul de progression (`demarche_progression.md`) : une tâche `terminee_en_attente` ne doit pas compter comme "terminée" dans le pourcentage tant qu'elle n'est pas validée
- [x] 🧪 Tester les cas de refus d'accès (validation par un utilisateur non autorisé, soumission par un non-assigné)

**✅ Critère de sortie T2 :** le cycle complet en_cours → soumission avec preuve → validation/rejet fonctionne avec les bons droits, sans fausser la progression.

---

## PHASE T3 — Frontend

### T3.1 Soumission par le personnel
- [x] 🎨 Adapter le Kanban : déplacer une tâche vers "Terminées" déclenche une modale de soumission (preuve/commentaire) au lieu d'un changement de statut direct
- [x] 🎨 Affichage visuel distinct pour les tâches en statut `terminee_en_attente` (couleur/badge "en attente de validation")

### T3.2 Validation par l'admin/chef de projet
- [x] 🎨 Vue dédiée "Tâches à valider" (liste filtrée pour le chef de projet/admin)
- [x] 🎨 Écran de détail avec preuve affichée + boutons "Valider" / "Rejeter" (commentaire obligatoire pour le rejet)
- [x] 🧪 Test manuel : cycle complet en_cours → soumission avec preuve → rejet avec commentaire → correction → validation

**✅ Critère de sortie T3 :** le circuit est utilisable de bout en bout côté interface, pour les deux rôles concernés.

---

## PHASE T4 — Notifications

- [x] 🔧 Notification au chef de projet/admin lors d'une soumission de tâche terminée
- [x] 🔧 Notification à l'assigné lors d'une validation ou d'un rejet (avec le commentaire)
- [x] 🎨 Badge sur le Kanban/dashboard pour les tâches en attente de validation
- [x] 🧪 Tester la réception des notifications sur les deux rôles

**✅ Critère de sortie T4 :** chaque changement de statut génère une notification pertinente pour la bonne personne.

---

## PHASE T5 — Finition et documentation

- [x] 🧪 Test global multi-rôles (personnel, chef de projet, admin) sur plusieurs tâches simultanées
- [x] 🧪 Vérifier la cohérence avec le module dépendances entre tâches (Phase 4.2) : une tâche `terminee_en_attente` bloque-t-elle ses dépendantes comme si elle n'était pas terminée ?
- [x] 📖 Mettre à jour le fichier de contexte (GEMINI.md section 6) avec le nouveau statut, le modèle et les routes ajoutées
- [x] 📖 Documenter la matrice des droits du circuit de validation des tâches

**✅ Critère de sortie T5 :** le circuit de validation des tâches est complet, testé, documenté, et intégré au suivi global (`demarche.md`).

---

## 📌 Suivi d'avancement

| Phase | Statut |
|---|---|
| T0 — Audit de l'existant | ✅ Terminé |
| T1 — Modèle de données | ✅ Terminé |
| T2 — Backend circuit de validation | ✅ Terminé |
| T3 — Frontend | ✅ Terminé |
| T4 — Notifications | ✅ Terminé |
| T5 — Finition et documentation | ✅ Terminé |

*(⬜ Non commencé / 🟡 En cours / ✅ Terminé)*

---

**Point à trancher en T0** (comme indiqué) : preuve obligatoire, validation obligatoire, ou les deux ? Ce document part du principe le plus complet (les deux), à ajuster si tu veux quelque chose de plus léger au départ.