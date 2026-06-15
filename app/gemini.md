Act en tant qu'ingénieur backend Python Senior et architecte de base de données. Je développe le "Module 2 : Cœur de Métier – Projets, Équipes & Tâches" pour l'application de l'OIC. 

Mon interface Frontend est déjà entièrement finalisée et prête à consommer des API Rest. Tu dois générer exclusivement le code Backend complet, propre, modulaire et hautement performant (temps de réponse < 2s).

Voici la structure exacte de ma base de données relationnelle à implémenter :
1. Projet (id_projet INT PRIMARY KEY, titre VARCHAR(150), description TEXT, dateDebut DATE, dateFin DATE, statut VARCHAR(50), etat VARCHAR(50), id_administrateur INT)
2. Tache (id_tache INT PRIMARY KEY, titre VARCHAR(150), description TEXT, priorite VARCHAR(50), statut VARCHAR(50), echeance DATE, progression INT, etat VARCHAR(50), id_projet INT)
3. Commentaire (id_commentaire INT PRIMARY KEY, contenu TEXT, date INT, id_tache INT)
4. Equipe (id_equipe INT PRIMARY KEY, nom VARCHAR(100), description TEXT, id_projet INT UNIQUE)
5. Appartient_Equipe (id_utilisateur INT, id_equipe INT, PRIMARY KEY (id_utilisateur, id_equipe))

Génère un code de niveau production structuré en 3 parties claires :

---

### PARTIE 1 : MODÈLES ORM SQLALCHEMY (Syntaxe Moderne 2.0 avec Mapped/mapped_column)
- Crée les fichiers de modèles pour les tables 'Projet', 'Tache', 'Commentaire', 'Equipe' et la table d'association 'Appartient_Equipe'.
- Configure strictement les contraintes de clés étrangères et de relations bidirectionnelles (`relationship`).
- Ajoute la gestion des cascades de suppression (`cascade="all, delete-orphan"`) de 'Projet' vers 'Tache' et de 'Tache' vers 'Commentaire'.

---

### PARTIE 2 : SCHÉMAS DE VALIDATION PYDANTIC (v2)
- Crée les schémas de création (In) et de lecture (Out) pour chaque entité.
- Ajoute des validations personnalisées (par exemple, vérifier que 'dateFin' est supérieure à 'dateDebut' et que la 'progression' d'une tâche reste comprise entre 0 et 100).
- Définis un schéma spécifique `DashboardResponse` pour le retour du tableau de bord d'un projet.

---

### PARTIE 3 : ROUTEURS ET ENDPOINTS FASTAPI (APIRouter)
Génère les routes asynchrones (`async def`) suivantes en injectant la session de base de données (`db: AsyncSession = Depends(get_db)`) :

1. `GET /projets` et `POST /projets` : Gestion et persistance des projets.
2. `POST /taches` : Ajout d'une tâche au sein d'un projet.
3. `PUT /taches/{id_tache}` : Mise à jour flexible d'une tâche (permettant au Kanban du frontend de modifier dynamiquement le 'statut', l''etat' ou la 'progression').
4. `POST /taches/{id_tache}/commentaires` : Insertion d'un commentaire sur une tâche avec enregistrement automatique du timestamp actuel.
5. `GET /projets/{id_projet}/dashboard` : Point d'accès critique pour alimenter les indicateurs visuels du frontend. Ce endpoint doit exécuter des requêtes d'agrégation optimisées pour renvoyer :
   - `total_taches` : Nombre total de tâches liées au projet.
   - `taches_terminees` : Nombre de tâches ayant le statut 'Terminé'.
   - `taches_en_cours` : Nombre de tâches actives (ex: 'En cours', 'En attente').
   - `taches_en_retard` : Nombre de tâches non terminées dont la date d'échéance est inférieure à la date du jour.
   - `progression_globale` : Moyenne mathématique de la progression de toutes les tâches associées à ce projet (valeur entre 0 et 100).

---

### EXIGENCES DE PRODUCTION :
- Inclut la configuration d'un Middleware CORS complet dans le point d'entrée de l'application pour autoriser mon frontend à communiquer sans blocage de sécurité navigateur.
- Utilise une gestion propre des exceptions (`HTTPException` avec les codes de statut appropriés comme 404 ou 400).
- Écris un code modulaire, prêt à être copié-coller dans des fichiers séparés (`models.py`, `schemas.py`, `router.py`).

