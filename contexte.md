# Fiche Contexte & Cahier des Charges Technique : TaskManager

Ce document présente la structure globale, l'architecture de la base de données, la description des fichiers, ainsi que les fonctionnalités opérationnelles du projet **TaskManager**. Il énumère et décrit le projet de façon à permettre à tout modèle de langage (LLM) ou développeur de comprendre instantanément l'état du projet et de s'y repérer.

---

## 🎯 Contexte du Projet
**TaskManager** est une application collaborative de gestion de projet conçue pour deux rôles principaux d'utilisateurs (Administrateurs et Personnels). Elle intègre la gestion de projets, de tâches, d'équipes, de rapports de projets, un tableau de bord analytique en temps réel, et un système de messagerie instantanée (directe/groupe) avec notifications en temps réel par WebSockets.

---

## 🏗️ Architecture Technique
* **Backend** : FastAPI (Python 3.12+), SQLAlchemy 2.0 (ORM Asynchrone avec `aiosqlite`), Pydantic v2 (validation), Uvicorn (serveur ASGI).
* **Base de données** : SQLite (`taskmanager.db`) gérée de façon asynchrone.
* **Sécurité** : JWT (JSON Web Tokens), passlib (hachage de mots de passe via `bcrypt`), limiteur de tentatives de connexion (sécurité anti-brute force), contrôle d'accès basé sur les rôles par projet (`RequireProjectRole`).
* **Frontend** : Application mobile/web multiplateforme avec React Native, Expo, TypeScript, Expo-router et Axios.

---

## 📂 Structure Globale du Projet

Le projet est divisé en deux parties indépendantes mais fortement couplées par l'API :
```text
TaskManager licence/
├── Backend/                 # Partie API Backend (FastAPI + SQLite)
│   ├── modules/             # Sous-modules fonctionnels de l'API
│   │   ├── auth/            # Authentification & Réinitialisation de mot de passe
│   │   ├── dashboard/       # Métriques pour l'accueil
│   │   ├── messages/        # Messagerie WebSocket et Notifications
│   │   ├── project/         # CRUD Projets
│   │   ├── reports/         # Gestion des Rapports d'activités
│   │   ├── tasks/           # CRUD Tâches et Commentaires
│   │   ├── teams/           # Gestion des Équipes
│   │   └── users/           # Profils Utilisateurs
│   ├── database.py          # Session SQLALchemy asynchrone, Hachage & Config JWT
│   ├── models.py            # Modèles de tables SQLAlchemy (Base SQL)
│   ├── Schemas.py           # Schémas de validation Pydantic (Entrée / Sortie)
│   ├── main.py              # Point d'entrée FastAPI & routeur central
│   ├── requirements.txt     # Dépendances Python du backend
│   └── venv/                # Environnement virtuel Python
│
├── frontend /               # Application mobile et web React Native (Expo)
│   ├── app/                 # Écrans et routage Expo-router
│   │   ├── (tabs)/          # Onglets de navigation principale
│   │   ├── locales/         # Traductions (Multilingue)
│   │   └── modules/         # Composants UI (Authentification, projets, tâches...)
│   ├── services/            # Client HTTP Axios de communication avec l'API
│   │   ├── apiClient.ts     # Configuration Axios et intercepteur de Tokens JWT
│   │   └── *Service.ts      # Services API spécifiques (auth, task, project, etc.)
│   ├── package.json         # Dépendances Node.js / Expo
│   └── app.json             # Configuration de l'application Expo
└── WORKFLOW.md              # Conventions de code, stratégie Git et organisation

```

---

## 🗄️ Structure de la Base de Données (`Backend/models.py`)

Les tables sont définies en utilisant l'ORM asynchrone moderne de SQLAlchemy :
1. **Utilisateurs (`users` / Polymorphisme joint)** :
   * `User` (Table parente : id, nom, email, phone, motdepasse, actif, tentatives, role).
   * `Administrateur` (Hérite de `User` : supervise les projets).
   * `Personnel` (Hérite de `User` : réalise les tâches, rédige des rapports, rejoint des équipes).
2. **Gestion de Projets (`projets`)** : titre, description, dateDebut, dateFin, priorite, statut, etat, id_administrateur (FK admin).
3. **Gestion de Tâches (`taches`)** : titre, description, priorite, statut, echeance, progression (0-100), etat (active/archivée), id_projet (FK).
4. **Assignations (`tache_assignations`)** : liaison table de jointure M:N entre tâche et utilisateurs (id_tache, id_utilisateur).
5. **Équipes (`equipes`)** : nom, description, id_projet (1:1), id_personnel_createur.
6. **Membres Équipe (`appartient_equipe`)** : table de jointure M:N (id_personnel, id_equipe).
7. **Rapports (`rapports`)** : titre, contenu, type, periode, statut (pending/valide/rejete), date_generation, id_projet, id_personnel.
8. **Commentaires (`commentaires`)** : contenu, date_creation, id_tache, id_personnel.
9. **Messagerie (`conversations` & `messages`)** :
   * `Conversation` (nom, type : direct/groupe, id_admin: FK admin, avatar).
   * `ConversationParticipant` (liaison conversation et utilisateurs).
   * `Message` (contenu, date_envoi, lu, statut : envoye/distribue/lu, id_expediteur, id_conversation).
10. **Notifications (`notifications`)** : message, lu, date_envoi, id_utilisateur, id_tache.
11. **Sécurité (`reset_tokens`)** : jetons temporaires de réinitialisation de mot de passe (token, user_id, expires_at, used).
12. **Gestion Documentaire (`documents`)** : nom_original, nom_stocke, type_mime, taille, chemin, id_projet (nullable, FK), id_tache (nullable, FK), id_uploader (FK), date_upload.
13. **Rôles Contextuels (`projet_membre_roles`)** : liaison table de jointure M:N (id_projet, id_utilisateur, role : chef_projet/collaborateur/invite_externe).
14. **Invitations (`invitations`)** : email_invite, id_projet, role_propose, token, expires_at, statut (pending/acceptee/refusee).

---

## 🟢 Fonctionnalités Opérationnelles & Routes API

Toutes les routes principales sont documentées et prêtes à l'emploi.

### 🔑 1. Authentification & Sécurité (`/login`, `/register`...)
* **Inscription (`POST /register`)** : Crée un compte `Personnel` actif par défaut.
* **Connexion (`POST /login`)** : Génère un JWT. Bloque temporairement le compte après **10 tentatives infructueuses** (`MAX_TENTATIVES`).
* **Mot de passe oublié (`POST /forgot-password`)** : Génère un token unique valable 10 minutes et simule/envoie un e-mail HTML de réinitialisation.
* **Réinitialisation (`POST /reset-password`)** : Permet de définir un nouveau mot de passe avec le token de sécurité reçu. *(Note d'audit : correction d'un bug `MissingGreenlet` résolu par préchargement `selectinload` de l'utilisateur lié au token).*

### 👤 2. Gestion des Profils (`/users`)
* **Mon Profil (`GET /users/me` & `PUT /users/me`)** : Lecture et mise à jour des infos personnelles (nom, téléphone).
* **Liste des utilisateurs (`GET /users`)** : Récupère tous les collaborateurs du système pour l'assignation de tâches ou d'équipes.

### 📁 3. Cœur des Projets (`/api/v1/core/projets`)
* **Lister les projets (`GET /`)** : Récupère les projets visibles par l'utilisateur connecté (projets supervisés si admin, ou projets dont son équipe fait partie si personnel).
* **Créer (`POST /`)** : Création de projet réservée aux administrateurs. Le chef de projet désigné (`id_administrateur`) peut être n'importe quel utilisateur (admin ou personnel) du système.
* **Détails, Edition, Suppression (`GET`, `PUT`, `DELETE` sur `/{id_projet}`)** : Gestion complète du cycle de vie du projet.

### 📋 4. Gestion des Tâches (`/api/v1/core/taches`)
* **Lister (`GET /`)** : Filtre optionnel par projet, assignation, priorité et recherche textuelle.
* **Créer (`POST /`)** : Création d'une tâche avec assignation directe à plusieurs collaborateurs.
* **Mettre à jour (`PUT /{id_tache}`)** : Modification de la progression, du statut (`a_faire`, `en_cours`, `terminees`) et des personnes assignées.
* **Commenter (`POST /{id_tache}/commentaires`)** : Ajout de remarques de suivi sur la tâche.
* **Soumettre pour validation (`PUT /{id_tache}/soumettre-terminee`)** : Permet à un collaborateur assigné de soumettre une tâche comme terminée en fournissant une preuve textuelle et un document facultatif. Le statut devient `"terminee_en_attente"`.
* **Valider la tâche (`PUT /{id_tache}/valider`)** : Permet au chef de projet ou administrateur de valider la réalisation de la tâche. Met la progression à 100% et le statut à `"terminees"`.
* **Rejeter la tâche (`PUT /{id_tache}/rejeter`)** : Permet de rejeter la tâche avec un commentaire explicatif obligatoire. Le statut repasse à `"en_cours"`.
* **Historique de validation (`GET /{id_tache}/historique-validation`)** : Permet de consulter la traçabilité complète de validation de la tâche.
* **Planification visuelle (Kanban & Calendrier)** :
  * *Vue Liste* : Liste classique filtrable par projet ou priorité. Intègre un filtre de statut `"terminee_en_attente"` ("À valider").
  * *Vue Kanban* : Organisation en 4 colonnes de statut (`À faire`, `En cours`, `À valider`, `Terminée`) avec flèches de transfert rapide et déclenchement des fenêtres de validation/soumission correspondantes.
  * *Vue Calendrier* : Grille mensuelle avec pastilles de couleur selon la priorité des tâches prévues, et liste détaillée du jour sélectionné.
  * *Dépendances* : Règle métier bloquant la complétion ou la soumission d'une tâche si ses dépendances préalables ne sont pas validées/finalisées, et visualisation des dépendances dans la fiche de détails.

#### Matrice des Droits du Circuit de Validation des Tâches :
| Action | Rôles Autorisés | Statut Autorisé de la Tâche | Description |
|---|---|---|---|
| **Créer/Modifier une tâche** | Chef de Projet / Admin | Tous | Création ou modification globale de la tâche. |
| **Commenter / Mettre à jour progression** | Assigné / Chef de Projet / Admin | `a_faire`, `en_cours`, `terminee_en_attente` | Les collaborateurs assignés peuvent actualiser la progression et ajouter des commentaires. |
| **Soumettre pour validation** | Collaborateur Assigné / Chef / Admin | `a_faire`, `en_cours`, `terminee_en_attente` | Fait passer le statut à `"terminee_en_attente"` (preuve obligatoire). |
| **Valider la tâche** | Chef de Projet / Administrateur | `"terminee_en_attente"` | Clôture la tâche, statut `"terminees"`, progression à 100%. |
| **Rejeter la tâche** | Chef de Projet / Administrateur | `"terminee_en_attente"` | Renvoie la tâche en statut `"en_cours"` (motif/commentaire obligatoire). |
| **Consulter l'historique** | Membres du Projet / Admin | Tous | Visualisation du cycle de validation de la tâche. |

### 👥 5. Gestion des Équipes (`/api/v1/core/equipes`)
* **Créer une équipe (`POST /`)** : Associe une équipe à un projet spécifique.
* **Gestion des membres (`POST`, `DELETE`, `PUT`, `GET` sur `/{id_equipe}/membres`)** : Ajout, suppression et listage des membres d'une équipe.

### 💬 6. Messagerie, Alertes & Notifications (`/api/v1/comm`)
* **Websocket Temps Réel (`WS /ws/{user_id}`)** : Connexion temps réel pour pousser les messages et notifications instantanément (avec statuts des messages et de frappe).
* **Conversations (`POST /conversations` & `GET /conversations/me`)** : Création et récupération de salons de discussions directs ou de groupe.
* **Gestion des Groupes** :
  * *Edition* : `PUT /conversations/{id_conversation}` (modification du nom, avatar par l'admin).
  * *Ajout membres* : `POST /conversations/{id_conversation}/participants` (ajout par l'admin).
  * *Retrait / Départ* : `DELETE /conversations/{id_conversation}/participants/{id_utilisateur}` (retrait par l'admin ou départ du groupe).
  * *Changement Admin* : `PUT /conversations/{id_conversation}/admin` (désigner un nouvel admin).
* **Messages (`POST /messages` & `GET /conversations/{id_conversation}/messages`)** : Envoi de messages et consultation de l'historique d'un salon (avec statut envoyé/distribué/lu et détails de l'expéditeur).
* **Notifications (`GET /notifications/...`)** : Récupération des notifications, comptage des messages non-lus et marquage comme lus.
* **Notifications Automatiques & Temps Réel** : Système de génération automatique de notifications (enregistrées en base de données SQLite et poussées instantanément via WebSocket) sur événements :
  * *Attribution de tâche* : `"Vous avez été assigné à la tâche '{titre}'."`
  * *Changement de statut* : `"Le statut de la tâche '{titre}' a été modifié en '{nouveau_statut}'."`
  * *Nouveau commentaire* : `"{nom_auteur} a commenté la tâche '{titre}'."`
  * *Modification de projet* : `"Le projet '{titre}' a été modifié par l'administrateur."` (notifie tous les collaborateurs et membres de l'équipe du projet).
  * *Modification de tâche* : `"La tâche '{titre}' a été modifiée par l'administrateur."` (notifie tous les collaborateurs assignés).
* **Planificateur de Tâches (`APScheduler`)** : Démon d'arrière-plan intégré au cycle de vie (`lifespan`) de FastAPI. Il effectue une vérification horaire de toutes les tâches actives non-terminées et génère un rappel automatique aux assignés 48 heures puis 24 heures avant l'échéance (avec sécurité anti-doublon).
* **Interface Frontend (Écran `NotificationsScreen`)** : Affichage d'une liste premium des notifications triées par date de réception. Comprend des badges numériques d'inédits, des icônes spécifiques par type d'événement (Horloge pour échéance, Bulle pour commentaire, Profil pour attribution) et une option de marquage globale/individuel comme lu.

### 📈 7. Dashboard Analytics (`/api/v1/dashboard`)
* **Données globales (`GET /global`)** : Calcule le nombre de projets actifs, le volume de tâches, les tâches urgentes/en retard et le taux de progression moyen global de l'utilisateur.

### 📊 8. Rapports d'Activité (`/api/v1/reports`)
* **Créer / Modifier (`POST /` & `PUT /{id_rapport}`)** : Permet au personnel de créer et modifier ses rapports sous forme de `"brouillon"` tant qu'ils ne sont pas soumis.
* **Soumettre (`PUT /{id_rapport}/soumettre`)** : Fait passer le rapport du statut `"brouillon"` ou `"rejete"` à `"soumis"` (avec `date_soumission`).
* **Lister les miens (`GET /my-reports`)** : Historique personnel des rapports d'un utilisateur.
* **Rapports à valider (`GET /to-validate`)** : Récupère les rapports soumis en attente de validation pour les projets dont l'utilisateur connecté est responsable (chef de projet ou admin).
* **Validation & Rejet (`PUT /{id_rapport}/valider` & `PUT /{id_rapport}/rejeter`)** : Permet aux validateurs autorisés de valider (avec date et commentaire facultatif) ou rejeter (avec commentaire de motif obligatoire, remettant le rapport en statut `"rejete"`) un rapport soumis.
* **Historique des statuts (`GET /{id_rapport}/historique`)** : Renvoie le suivi chronologique complet de validation d'un rapport spécifique.
* **Export PDF (`GET /{id_rapport}/export-pdf`)** : Téléchargement de documents PDF structurés via ReportLab enrichis avec les nouvelles métadonnées de statut et l'historique complet de validation pour assurer la traçabilité.

#### Matrice des Droits du Circuit de Validation des Rapports :
| Action | Rôles Autorisés | Statut Autorisé du Rapport | Description |
|---|---|---|---|
| **Créer un rapport** | Personnel | N/A | Le rapport est initialement créé sous le statut `"brouillon"`. |
| **Modifier le rapport** | Auteur (Personnel) | `"brouillon"` ou `"rejete"` | Impossible si déjà soumis ou validé. |
| **Soumettre le rapport** | Auteur (Personnel) | `"brouillon"` ou `"rejete"` | Fait passer le statut à `"soumis"`. |
| **Valider le rapport** | Chef de Projet / Administrateur | `"soumis"` | Fait passer le statut à `"valide"`. |
| **Rejeter le rapport** | Chef de Projet / Administrateur | `"soumis"` | Fait passer le statut à `"rejete"` (commentaire obligatoire). |
| **Consulter l'historique** | Auteur / Chef de Projet / Admin | Tous | Visualisation du cycle de validation. |
| **Exporter en PDF** | Membres du Projet / Auteur / Admin | Tous | Exportation avec traçabilité. |


### 📁 9. Gestion Documentaire (`/api/v1/documents`)
* **Upload (`POST /upload`)** : Importation de fichiers (multipart) liés de manière optionnelle à un projet ou à une tâche, stockage physique dans `Backend/uploads` avec des noms uniques générés via UUID.
* **Download (`GET /{id}/download`)** : Récupération du fichier physique avec son type MIME et son nom d'origine.
* **Suppression (`DELETE /{id}`)** : Suppression de l'enregistrement de la base de données et du fichier physique correspondant du disque.
* **Listage par Projet (`GET /projet/{id_projet}`)** : Récupération de tous les documents liés à un projet.
* **Listage par Tâche (`GET /tache/{id_tache}`)** : Récupération de tous les documents liés à une tâche.

### 👥 10. Invitations & Rôles contextuels (`/api/v1/invitations` et `/api/v1/projets/{id_projet}`)
* **Inviter un collaborateur (`POST /api/v1/projets/{id_projet}/invitations`)** : Création d'une invitation avec un rôle proposé (`chef_projet`, `collaborateur`, `invite_externe`) générant un token sécurisé unique valable 7 jours.
* **Lister les invitations actives (`GET /api/v1/projets/{id_projet}/invitations`)** : Récupération des invitations en attente pour un projet.
* **Annuler une invitation (`DELETE /api/v1/invitations/{id}`)** : Annulation d'une invitation par le chef de projet ou l'administrateur.
* **Accepter une invitation (`POST /api/v1/invitations/{token}/accepter`)** : Permet à un utilisateur invité d'accepter l'invitation. Crée le compte personnel s'il n'existe pas déjà en base de données, et lie l'utilisateur au projet avec le rôle proposé.
* **Acceptation sur le Frontend (Écran `AcceptInvitation`)** : Interface dédiée de saisie du nom et du mot de passe (requis pour la création de compte) qui appelle la route d'acceptation par jeton.
* **Lister les membres et rôles d'un projet (`GET /api/v1/projets/{id_projet}/membres`)** : Récupère la liste de tous les membres assignés à un projet avec leur rôle contextuel.

### 📅 11. Module Réunions (`/api/v1/reunions`)
* **Créer (`POST /`)** : Planification de réunions avec titre, date, lien virtuel de visioconférence, ordre du jour, et envoi d'invitations (avec notification instantanée).
* **Lister (`GET /`)** : Récupération des réunions à venir pour les projets de l'utilisateur.
* **RSVP (`PUT /{id_reunion}/reponse`)** : Confirmation (`confirme`) ou refus (`decline`) de participation, notifiant l'organisateur.
* **Interface Frontend (Écran `video` / "Réunions")** : Tableau de bord des réunions futures, détails des RSVP, planification interactive de nouvelles réunions (pour les admins), et bouton d'action d'ouverture directe du lien de visioconférence.

### 🧠 12. Module d'Aide à la Décision & IA (`/api/v1/ia`)
* **Rédaction Assistée (`POST /rediger-description`)** : Suggère une description structurée et professionnelle selon le titre (pour une tâche ou un projet).
* **Priorisation IA (`POST /suggerer-priorite`)** : Calcule l'urgence d'une tâche (faible, moyenne, haute) selon son échéance et des mots-clés d'urgence.
* **Répartition Optimale (`POST /repartir-taches`)** : Répartition équilibrée de tâches en fonction de la charge actuelle des membres du projet.
* **Analyse des Risques (`GET /risques-retard`)** : Détection des risques de retard selon la progression et la date d'échéance.
* **Intégrations Frontend** :
  * Bouton "Suggérer la description" dans les formulaires de tâches (modules/tasks/new.tsx) et projets (modules/projects/new.tsx).
  * Bouton "Suggérer par l'IA" pour la priorisation de tâche (modules/tasks/new.tsx).
  * Analyseurs de risques et de répartition optimale des tâches dans la fiche détaillée du projet (modules/projects/index.tsx).

---

## 🚀 Commandes de Démarrage Rapide

### 💻 Démarrer le Backend FastAPI (de la racine)
```bash
./Backend/venv/bin/uvicorn Backend.main:app --reload
```

### 📱 Démarrer le Frontend Expo (du dossier `frontend `)
```bash
cd "frontend "
npm install
npx expo start
```
