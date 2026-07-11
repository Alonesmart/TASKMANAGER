# TaskManager — Guide Utilisateur & Administrateur

Bienvenue dans la documentation officielle de **TaskManager**, la plateforme premium de gestion de projets collaborative assistée par Intelligence Artificielle.

---

## 📖 1. Guide Utilisateur (Collaborateurs)

### 📌 Gérer vos tâches quotidiennes
* Accédez à l'onglet **Tâches** pour voir toutes les tâches qui vous sont assignées.
* Utilisez les trois modes de visualisation :
  * **Liste** : Pour voir rapidement vos échéances.
  * **Kanban** : Pour changer le statut d'une tâche de manière intuitive en un clic.
  * **Calendrier** : Pour planifier et anticiper vos livrables.

### 📄 Joindre des documents
* Dans les détails d'un projet, utilisez la section **Documents** pour téléverser ou télécharger des fichiers (PDF, Images, etc.) liés à vos activités.

### 📅 Participer aux réunions
* Accédez à l'onglet **Réunions**.
* Tentez de répondre aux invitations reçues ("Accepter" ou "Décliner") pour informer le chef de projet.
* Cliquez sur **Rejoindre** pour ouvrir instantanément la visioconférence (Zoom, Jitsi, Google Meet).

---

## 👑 2. Guide Chef de Projet

### ⚙️ Création et Structuration
* Pour créer un projet, appuyez sur le bouton **+** de l'onglet **Projets**.
* **Aide à la Rédaction (IA)** : Si vous manquez d'inspiration, saisissez le titre et cliquez sur **Suggérer la description (IA)** pour obtenir une structure complète automatiquement.

### 🧠 Affectation & Charge d'Équipe (IA)
* Ouvrez la fiche détaillée d'un projet.
* Cliquez sur **Calculer la répartition (IA)** dans le volet IA.
* TaskManager analyse instantanément la charge de travail actuelle de chaque collaborateur (nombre de tâches actives) et propose une affectation équilibrée.
* Cliquez sur **Appliquer la répartition** pour enregistrer et assigner les tâches automatiquement en base de données.

### 📅 Planification de Réunion
* Dans l'onglet **Réunions**, cliquez sur **+** pour planifier un point de synchronisation.
* Choisissez le projet, saisissez la date/heure, fournissez le lien de visioconférence et cochez les membres de l'équipe à convoquer. Ils recevront instantanément une notification.

---

## ⚡ 3. Guide Administrateur

### 👥 Invitations & Rôles
* Pour inviter un nouveau collaborateur externe sur un projet, accédez à la fiche détaillée du projet et utilisez la section **Invitations**.
* Spécifiez son adresse email et le rôle proposé (`chef_projet`, `collaborateur` ou `invite_externe`).
* TaskManager génère un lien sécurisé valable 7 jours. À l'acceptation, le compte est créé.

### 📈 Supervision Globale (Dashboard)
* Suivez les performances globales sur le dashboard d'accueil : progression moyenne, tâches urgentes et répartition de l'activité.

---

## ❓ 4. FAQ (Foire Aux Questions)

#### Comment fonctionne l'Intelligence Artificielle de TaskManager ?
L'IA utilise des algorithmes d'analyse locale avancés (moteur d'heuristiques, NLP et analyse de charge de travail). Tout s'exécute localement sur le serveur.

#### Mes données de projet sont-elles envoyées à des tiers ?
**Non**. Contrairement aux solutions cloud classiques, TaskManager n'envoie aucune donnée à l'extérieur. Toutes vos informations, descriptions de tâches et calendriers restent 100% locaux, confidentiels et sécurisés.

#### Que faire si un collaborateur décline une réunion ?
Vous recevez instantanément une notification en temps réel. Vous pouvez ainsi ajuster l'ordre du jour ou modifier la date de la réunion si nécessaire.
