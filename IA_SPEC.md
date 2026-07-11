# Cahier des Charges Interne — Module IA (Phase 7)

Ce document décrit les spécifications fonctionnelles, l'architecture et les choix technologiques pour l'intégration des 4 fonctionnalités d'intelligence artificielle au sein du TaskManager.

---

## 1. Description des 4 Fonctionnalités IA

### 1.1 Aide à la rédaction des descriptions (Étape 7.2)
* **Entrée** : Le titre d'une tâche ou d'un projet.
* **Comportement** : Suggérer automatiquement un texte de description structuré et professionnel adapté au titre fourni.
* **Périmètre** : Intégration via un bouton "Suggérer avec l'IA" dans les formulaires de création de tâches et projets sur le frontend.

### 1.2 Suggestion intelligente de priorités (Étape 7.3)
* **Entrée** : Une tâche (titre, description, date d'échéance) et le contexte du projet.
* **Comportement** : Analyser l'urgence de la tâche et proposer une priorité suggérée (`faible`, `moyenne` ou `haute`).
* **Critères pris en compte** :
  * Proximité de la date d'échéance.
  * Mots-clés d'urgence dans le titre ou la description (ex: "bloquant", "urgent", "client", "bug").
* **Périmètre** : Affichage d'un badge de recommandation IA lors de la saisie/édition d'une tâche.

### 1.3 Répartition optimale des tâches (Étape 7.4)
* **Entrée** : Une ou plusieurs tâches à assigner, liste des membres disponibles de l'équipe et leur charge actuelle.
* **Comportement** : Calculer et suggérer l'assignation la plus équilibrée pour éviter la surcharge de travail de certains collaborateurs.
* **Critères de calcul** :
  * Nombre de tâches actives déjà assignées à chaque collaborateur.
  * Respect de la charge maximale (répartition en priorité vers les membres ayant le moins de tâches en cours).
* **Périmètre** : Suggestion d'assignation en masse sur le tableau de bord du projet.

### 1.4 Anticipation des risques de retard (Étape 7.5)
* **Entrée** : Un projet ou une liste de tâches avec leur progression (%) et leur date d'échéance.
* **Comportement** : Identifier les tâches présentant un risque de dépassement de délai (calcul de vélocité théorique requise).
* **Algorithme de calcul** :
  * Calcul de la durée restante jusqu'à l'échéance.
  * Comparaison avec le retard de progression : si la progression est faible (ex: < 20%) et que l'échéance est très proche (ex: < 48h), le niveau de risque est "Élevé" (High).
* **Périmètre** : Affichage d'indicateurs visuels de risque (Vert = Faible, Orange = Moyen, Rouge = Élevé) sur le tableau de bord du projet.

---

## 2. Choix de l'Approche Technique et Justification

### Approche retenue : Moteur heuristique hybride & Générateur algorithmique local
Pour implémenter ces fonctionnalités dans l'environnement de développement actuel de manière performante, fiable et sans dépendance externe payante ou lourde, nous choisissons une approche hybride :

1. **Heuristique locale déterministe** :
   Les suggestions de priorités, la répartition de la charge et le calcul des risques de retard reposent sur des algorithmes mathématiques et logiques clairs exécutés directement par le backend en Python.
2. **Générateur de texte par modèle de template contextualisé** :
   Pour l'aide à la rédaction, le backend analyse les mots-clés du titre et génère un plan de travail structuré et détaillé.

### Justifications :
* **Performance et Zéro Latence** : Les calculs et suggestions s'exécutent en moins de 5ms, évitant les latences de réseau inhérentes aux API distantes (parfois > 2s).
* **Indépendance totale (Hors-ligne / Économique)** : Aucun coût d'infrastructure ou clé API de tiers (OpenAI/Anthropic) n'est nécessaire. L'application reste autonome et robuste.
* **Fiabilité des tests** : Les comportements sont déterministes et entièrement reproductibles, ce qui facilite la couverture par les tests unitaires et d'intégration.
* **Sécurité des données** : Aucune donnée de projet ou de tâche n'est envoyée à des serveurs tiers, respectant pleinement la confidentialité.
