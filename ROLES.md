# 🛡️ Matrice des Droits et Rôles — TaskManager

Ce document définit précisément les habilitations des différents types d'utilisateurs au sein de l'application **TaskManager**. Les droits sont divisés entre rôles globaux (applicatifs) et rôles contextuels (affectés projet par projet).

---

## 👥 1. Rôles Globaux (Niveau Application)

Ces rôles sont définis lors de la création du compte de l'utilisateur (table `users`, colonne `role`) :

1. **Administrateur** (`admin`) :
   * Rôle superviseur global.
   * Peut créer des projets, gérer les utilisateurs, et possède des droits de contournement (bypass) sur toutes les actions au sein de tous les projets.
   * Ne peut pas rédiger de rapports d'activité (cette action est réservée au personnel).

2. **Personnel** (`personnel`) :
   * Rôle de base pour tous les employés et collaborateurs externes.
   * Leurs actions précises au sein de l'application dépendent du projet auquel ils sont affectés et de leur rôle contextuel associé.

---

## 📁 2. Rôles Contextuels (Niveau Projet)

Ces rôles sont définis projet par projet (table `projet_membre_roles`, colonne `role`). Un utilisateur peut être Chef de projet sur un projet A, et simple Collaborateur sur un projet B.

Les trois rôles contextuels gérés sont :
* **Chef de Projet** (`chef_projet`) : Responsable de la gestion et de la supervision d'un projet spécifique.
* **Collaborateur** (`collaborateur`) : Membre actif de l'équipe affecté à la réalisation des tâches du projet. *Note : Tout membre de l'équipe associée à un projet hérite automatiquement de ce rôle par défaut.*
* **Invité Externe** (`invite_externe`) : Consultant ou observateur tiers ayant un accès restreint en lecture et en interaction minimale.

---

## 📊 3. Matrice des Droits d'Accès

Le tableau ci-dessous liste l'ensemble des permissions accordées selon le rôle de l'utilisateur :

| Action / Fonctionnalité | Admin Global | Chef de Projet (`chef_projet`) | Collaborateur (`collaborateur`) | Invité Externe (`invite_externe`) |
| :--- | :---: | :---: | :---: | :---: |
| **Consulter le Projet** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| **Modifier / Supprimer le Projet** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |
| **Gérer l'Équipe & les Rôles** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |
| **Envoyer / Annuler des Invitations** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |
| **Créer / Modifier / Supprimer des Tâches** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |
| **Commenter les Tâches** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| **Uploader des Documents** | ✅ Oui | ✅ Oui | ✅ Oui | ❌ Non |
| **Télécharger / Consulter des Documents** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| **Supprimer des Documents** | ✅ Oui | ✅ Oui | ⚠️ Propre upload uniquement | ⚠️ Propre upload uniquement |
| **Soumettre un Rapport** | ❌ Non (réservé Personnel) | ❌ Non (réservé Personnel) | ✅ Oui | ❌ Non |
| **Valider / Rejeter un Rapport** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |

---

## 🔒 4. Mécanisme Technique

Le contrôle d'accès est opéré dynamiquement sur le backend grâce à la dépendance FastAPI `RequireProjectRole(allowed_roles: List[str])`. Cette dépendance :
1. Extrait l'identifiant de la ressource cible à partir de la requête (projet, tâche, équipe, document, ou rapport).
2. Résout et récupère l'identifiant du projet associé en base de données.
3. Vérifie les habilitations en cascade via la fonction centralisée `verify_project_role`.
