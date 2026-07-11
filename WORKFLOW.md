# ⚙️ Workflow de Travail — TaskManager

Ce document définit les règles de développement, les conventions de code et la stratégie Git à respecter sur le projet **TaskManager**.

---

## 🌿 1. Stratégie Git & Gestion des Branches

Pour assurer la stabilité de l'application et faciliter le travail collaboratif, la gestion des branches suit un modèle simplifié inspiré de Git Flow.

### 📌 Les Branches Principales
* **`main`** : Contient uniquement du code stable et prêt pour la production. Chaque déploiement ou version majeure y est tagué.
* **`develop`** : Branche d'intégration où toutes les nouvelles fonctionnalités et corrections de bugs sont fusionnées avant d'être poussées sur `main`.

### 📌 Les Branches Secondaires (Temporaires)
* **`feature/nom-fonctionnalite`** : Pour le développement de nouvelles fonctionnalités (ex: `feature/ia-anticipation-retards`).
* **`bugfix/nom-bug`** : Pour la correction de bugs ou d'anomalies (ex: `bugfix/websocket-403-error`).
* **`hotfix/nom-secu`** : Pour les corrections urgentes directement en production.

### ✍️ Format des Messages de Commit (Conventional Commits)
Chaque commit doit être structuré de la manière suivante pour générer un historique propre :
`type(périmètre): description claire et concise en français ou anglais`

* **Types autorisés** :
  * `feat` : Nouvelle fonctionnalité.
  * `fix` : Correction de bug.
  * `docs` : Modification de la documentation uniquement.
  * `style` : Changements esthétiques (formatage, espaces, etc.) sans impact sur le code.
  * `refactor` : Réécriture de code sans modification fonctionnelle.
  * `test` : Ajout ou correction de tests.
  * `chore` : Tâche diverse (mise à jour des dépendances, configuration de build, etc.).
* **Exemples** :
  * `feat(backend): ajouter la route d'upload de documents`
  * `fix(frontend): corriger l'affichage du calendrier mobile`
  * `docs(root): mettre à jour le document de workflow`

---

## 💻 2. Conventions de Code

### 🐍 Backend (FastAPI / Python)
* **Formatage** : Suivre scrupuleusement la norme **PEP 8**.
* **Asynchronisme** : Utiliser `async` et `await` de manière cohérente pour les requêtes à la base de données et les appels réseau.
* **Typage & Validation** : 
  * Déclarer les schémas de requête et réponse à l'aide de **Pydantic v2** dans [Schemas.py](file:///home/alone/Documents/TaskManager%20licence/Backend/Schemas.py).
  * Typer explicitement toutes les signatures de fonctions.
* **Base de données** : 
  * Utiliser l'ORM asynchrone **SQLAlchemy 2.0**.
  * Éviter les requêtes SQL brutes en dehors des migrations si possible.
  * Toujours gérer proprement les sessions de base de données à travers le cycle de vie de la requête (`Depends(get_db)`).

### ⚛️ Frontend (React Native / Expo / TypeScript)
* **Typage** : Bannir l'utilisation de `any`. Déclarer des interfaces TypeScript pour tous les objets de données et props de composants.
* **Structure & UI** :
  * Suivre la charte graphique globale de l'application (couleurs thématiques, espacements standardisés, polices).
  * **Interdiction stricte des émojis** dans toutes les interfaces visibles par l'utilisateur final (boutons, titres, placeholders, messages), conformément aux consignes du projet.
* **Services** : Passer systématiquement par les services d'API centralisés (ex: `apiClient.ts`) pour les appels HTTP et ne pas effectuer d'appels `fetch` directs dans les composants.

---

## 🔄 3. Organisation Quotidienne & Cycle de Validation

### 🛡️ Processus de validation en 3 étapes
1. **Développement local & Autotests** : Le développeur ou l'IA code la fonctionnalité et valide localement son fonctionnement (tests unitaires ou d'intégration).
2. **Test bilatéral obligatoire** : L'IA et l'utilisateur testent chacun de leur côté le comportement de la fonctionnalité sur leurs environnements respectifs.
3. **Mise à jour documentaire & Clôture** :
   * Si la modification impacte l'architecture, la structure ou les routes, mettre à jour [contexte.md](file:///home/alone/Documents/TaskManager%20licence/contexte.md) (obligation : toutes les 2 étapes).
   * Cocher la case correspondante dans [demarche.md](file:///home/alone/Documents/TaskManager%20licence/demarche.md) uniquement après validation bilatérale réussie.
