# BUGS.md — Anomalies constatées et corrigées lors de la Phase 0

Ce document répertorie l'ensemble des bugs identifiés et résolus lors de l'audit initial (Phase 0) du projet **TaskManager**.

---

## 🔧 1. Backend — Problème réseau / baseURL incorrecte (Résolu)
* **Description** : L'application mobile (Expo) n'arrivait pas à se connecter au serveur backend à l'adresse dynamique `http://192.168.1.158:8000`.
* **Cause** : Le serveur backend tournait en tâche de fond mais écoutait uniquement en local (`127.0.0.1:8000`), rendant les appels API inaccessibles depuis les appareils ou émulateurs du réseau local.
* **Résolution** : Le serveur a été arrêté et relancé en écoutant sur toutes les interfaces réseau (`0.0.0.0`) :
  ```bash
  ./Backend/venv/bin/uvicorn Backend.main:app --reload --host 0.0.0.0 --port 8000
  ```

---

## 🔧 2. Backend — Stagnation du cache SQLAlchemy lors de la mise à jour des tâches (Résolu)
* **Description** : Lors de la mise à jour des assignations de collaborateurs sur une tâche via la route `PUT /api/v1/core/taches/{id_tache}`, les utilisateurs assignés retournés restaient obsolètes dans le test d'intégration.
* **Cause** : La base de données utilise `expire_on_commit=False` dans sa session. Les assignations modifiées directement en base via des requêtes SQL (`DELETE` puis `INSERT`) ne forçaient pas la mise à jour de la relation en cache mémoire de l'objet tâche.
* **Résolution** : Ajout de `db.expire(db_task)` immédiatement après le commit dans la route `update_task` de [routes.py](file:///home/alone/Documents/TaskManager%20licence/Backend/modules/tasks/routes.py).

---

## 🔧 3. Backend — Contrainte NOT NULL échouée sur `rapports.periode` (Résolu)
* **Description** : La soumission d'un rapport d'activité échouait systématiquement avec une erreur d'intégrité SQL : `IntegrityError: NOT NULL constraint failed: rapports.periode`.
* **Cause** : La table `rapports` de la base de données SQLite exige une valeur pour la colonne `periode`, mais celle-ci avait été omise dans le modèle SQLAlchemy `Rapport` dans [models.py](file:///home/alone/Documents/TaskManager%20licence/Backend/models.py).
* **Résolution** : Ajout de l'attribut `periode` dans le modèle `Rapport` de [models.py](file:///home/alone/Documents/TaskManager%20licence/Backend/models.py) avec une valeur par défaut :
  ```python
  periode: Mapped[str] = mapped_column(String(100), default="non_specifie")
  ```

---

## 🧪 4. Tests d'intégration — Faute de frappe dans le nom de la table (Résolu)
* **Description** : Le script de test du module projets (`test_project.py`) plantait lors de l'étape de nettoyage de la base de données.
* **Cause** : Le script de test tentait d'exécuter un `DELETE FROM appartenant_equipe` alors que la table s'appelle exactement `appartient_equipe` dans les modèles et la base de données.
* **Résolution** : Correction du nom de table à la ligne 38 dans [test_project.py](file:///home/alone/Documents/TaskManager%20licence/Backend/scripts/test_project.py).

---

## 🎨 5. Frontend — Présence d'émojis dans l'interface utilisateur (Résolu)
* **Description** : L'interface des projets affichait des émojis de cercles de couleur (`🔴`, `🟡`, `🟢`) dans les badges de priorité et de statut des projets.
* **Cause** : Violation de la règle de charte graphique interdisant la présence d'émojis dans toute interface visible par l'utilisateur final.
* **Résolution** : Modification des composants `PrioriteBadge` et `StatutBadge` pour supprimer complètement les émojis et icônes, s'appuyant uniquement sur les textes traduits et le style de bordure/fond coloré du badge (lignes 55-89 dans [index.tsx](file:///home/alone/Documents/TaskManager%20licence/frontend%20/app/modules/projects/index.tsx)).
