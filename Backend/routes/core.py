import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date, timedelta
from ..database import get_db
from .. import models, Schemas
from .login import get_current_user

router = APIRouter(prefix="/api/v1/core", tags=["Core Business - Projets & Tâches"])
SQLITE_DB_PATH = Path(__file__).resolve().parents[2] / "taskmanager.db"

async def user_can_access_project(db: AsyncSession, project: models.Projet, user: models.User) -> bool:
    if project.id_administrateur == user.id:
        return True

    team_result = await db.execute(
        select(models.Equipe).filter(models.Equipe.id_projet == project.id_projet)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        return False

    member_result = await db.execute(
        select(models.Appartient_Equipe).filter(
            models.Appartient_Equipe.id_equipe == team.id_equipe,
            models.Appartient_Equipe.id_personnel == user.id,
        )
    )
    return member_result.scalar_one_or_none() is not None

async def ensure_project_access(db: AsyncSession, project: models.Projet, user: models.User):
    if not await user_can_access_project(db, project, user):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce projet")

async def ensure_project_admin(project: models.Projet, user: models.User):
    if project.id_administrateur != user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer ce projet")

async def get_team_or_404(db: AsyncSession, id_equipe: int) -> models.Equipe:
    result = await db.execute(select(models.Equipe).filter(models.Equipe.id_equipe == id_equipe))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    return team

async def get_project_or_404(db: AsyncSession, id_projet: int) -> models.Projet:
    result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == id_projet))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return project

def serialize_project(project: models.Projet) -> dict:
    equipe = None
    if project.equipe:
        equipe = {
            "id_equipe": project.equipe.id_equipe,
            "nom": project.equipe.nom,
            "description": project.equipe.description,
            "id_projet": project.equipe.id_projet,
        }

    return {
        "id_projet": project.id_projet,
        "titre": project.titre,
        "description": project.description,
        "dateDebut": project.dateDebut,
        "dateFin": project.dateFin,
        "priorite": project.priorite,
        "statut": project.statut,
        "etat": project.etat,
        "id_administrateur": project.id_administrateur,
        "equipe": equipe,
    }

def get_project_dict_or_404(id_projet: int) -> dict:
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        project = conn.execute(
            """
            SELECT id_projet, titre, description, dateDebut, dateFin, priorite, statut, etat, id_administrateur
            FROM projets
            WHERE id_projet = ?
            """,
            (id_projet,),
        ).fetchone()

        if not project:
            raise HTTPException(status_code=404, detail="Projet non trouvé")

        equipe = conn.execute(
            """
            SELECT id_equipe, nom, description, id_projet
            FROM equipes
            WHERE id_projet = ?
            """,
            (id_projet,),
        ).fetchone()

    data = dict(project)
    data["equipe"] = dict(equipe) if equipe else None
    return data

def user_can_access_project_dict(project: dict, user: models.User) -> bool:
    if project["id_administrateur"] == user.id:
        return True

    if not project["equipe"]:
        return False

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        member = conn.execute(
            """
            SELECT 1
            FROM appartient_equipe
            WHERE id_equipe = ? AND id_personnel = ?
            """,
            (project["equipe"]["id_equipe"], user.id),
        ).fetchone()
    return member is not None

def get_team_dict_or_404(id_equipe: int) -> dict:
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        team = conn.execute(
            """
            SELECT id_equipe, nom, description, id_projet
            FROM equipes
            WHERE id_equipe = ?
            """,
            (id_equipe,),
        ).fetchone()

    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    return dict(team)

# --- GESTION DES PROJETS ---

@router.get("/projets", response_model=List[Schemas.ProjetOut])
async def get_projects(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère les projets où l'utilisateur est admin ou membre de l'équipe."""
    query = (
        select(models.Projet)
        .options(selectinload(models.Projet.equipe))
        .outerjoin(models.Equipe, models.Equipe.id_projet == models.Projet.id_projet)
        .outerjoin(
            models.Appartient_Equipe,
            models.Appartient_Equipe.id_equipe == models.Equipe.id_equipe,
        )
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id
            )
        )
        .distinct()
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/projets", response_model=Schemas.ProjetOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: Schemas.ProjetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Crée un nouveau projet."""
    # Restriction : Seul un admin peut créer un projet
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent créer des projets")

    project_data = project.model_dump()
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        cursor = conn.execute(
            """
            INSERT INTO projets (
                titre, description, dateDebut, dateFin, priorite, statut, etat, id_administrateur
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_data["titre"],
                project_data.get("description"),
                project_data["dateDebut"].isoformat(),
                project_data["dateFin"].isoformat(),
                project_data.get("priorite", "moyenne"),
                project_data.get("statut", "actif"),
                project_data.get("etat", "en_cours"),
                current_user.id,
            ),
        )
        conn.commit()
        project_id = cursor.lastrowid

    return get_project_dict_or_404(project_id)

@router.get("/projets/{id_projet}", response_model=Schemas.ProjetOut)
async def get_project(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère un projet spécifique par son ID."""
    project = get_project_dict_or_404(id_projet)
    if not user_can_access_project_dict(project, current_user):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce projet")
    return project

@router.put("/projets/{id_projet}", response_model=Schemas.ProjetOut)
async def update_project(
    id_projet: int,
    project_update: Schemas.ProjetBase,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Met à jour un projet existant."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent modifier un projet")

    project = get_project_dict_or_404(id_projet)
    if project["id_administrateur"] != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de modifier ce projet")

    update_data = project_update.model_dump(exclude_unset=True)
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.execute(
            """
            UPDATE projets
            SET titre = ?,
                description = ?,
                dateDebut = ?,
                dateFin = ?,
                priorite = ?,
                statut = ?,
                etat = ?,
                id_administrateur = ?
            WHERE id_projet = ?
            """,
            (
                update_data["titre"],
                update_data.get("description"),
                update_data["dateDebut"].isoformat(),
                update_data["dateFin"].isoformat(),
                update_data.get("priorite", "moyenne"),
                update_data.get("statut", "actif"),
                update_data.get("etat", "en_cours"),
                current_user.id,
                id_projet,
            ),
        )
        conn.commit()

    return get_project_dict_or_404(id_projet)

@router.delete("/projets/{id_projet}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Supprime un projet existant."""
    result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == id_projet))
    db_project = result.scalar_one_or_none()
    if not db_project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    # Vérification des permissions : l'admin du projet ou un admin global
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent supprimer un projet")

    await db.delete(db_project)
    await db.commit()
    return {"message": "Projet supprimé avec succès"}

# --- GESTION DES TACHES ---

@router.get("/taches", response_model=List[Schemas.TacheOut])
async def get_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère les tâches des projets où l'utilisateur est admin ou membre de l'équipe."""
    query = (
        select(models.Tache)
        .options(selectinload(models.Tache.projet).selectinload(models.Projet.equipe))
        .join(models.Projet, models.Tache.id_projet == models.Projet.id_projet)
        .outerjoin(models.Equipe, models.Equipe.id_projet == models.Projet.id_projet)
        .outerjoin(
            models.Appartient_Equipe,
            models.Appartient_Equipe.id_equipe == models.Equipe.id_equipe,
        )
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id
            )
        )
        .distinct()
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/taches", response_model=Schemas.TacheOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: Schemas.TacheCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Ajoute une tâche à un projet existant."""
    # Vérifier si l'utilisateur est admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent créer des tâches")

    db_task = models.Tache(**task.model_dump())
    db.add(db_task) # type: ignore
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.put("/taches/{id_tache}", response_model=Schemas.TacheOut)
async def update_task(
    id_tache: int, 
    task_update: Schemas.TacheUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mise à jour flexible d'une tâche (Kanban, progression, statut)."""
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    # Vérifier les permissions
    # Seul un admin peut modifier la tâche
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent modifier les tâches")

    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    await db.commit()
    
    # Refetch with relations for serialization
    result = await db.execute(
        select(models.Tache)
        .options(selectinload(models.Tache.projet).selectinload(models.Projet.equipe))
        .filter(models.Tache.id_tache == id_tache)
    )
    return result.scalar_one()

@router.delete("/taches/{id_tache}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    id_tache: int, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Supprime une tâche existante."""
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    # Vérifier les permissions
    # Seul un admin peut supprimer la tâche
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent supprimer des tâches")

    await db.delete(db_task)
    await db.commit()
    return {"message": "Tâche supprimée avec succès"}

# --- COMMENTAIRES ---

@router.post("/taches/{id_tache}/commentaires", response_model=Schemas.CommentaireOut)
async def add_commentaire(
    id_tache: int,
    comm: Schemas.CommentaireCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Ajoute un commentaire à une tâche."""
    if current_user.role != "personnel":
        raise HTTPException(status_code=403, detail="Seul un membre du personnel peut commenter")

    task_result = await db.execute(
        select(models.Tache)
        .options(selectinload(models.Tache.projet))
        .filter(models.Tache.id_tache == id_tache)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    await ensure_project_access(db, task.projet, current_user)

    db_comm = models.Commentaire(
        contenu=comm.contenu,
        id_personnel=current_user.id,
        id_tache=id_tache,
    )
    db.add(db_comm) # type: ignore
    await db.commit()
    await db.refresh(db_comm)
    return {
        "id_commentaire": db_comm.id_commentaire,
        "contenu": db_comm.contenu,
        "date_creation": db_comm.date_creation,
        "id_tache": db_comm.id_tache,
        "id_utilisateur": db_comm.id_personnel,
    }

# --- DASHBOARD ANALYTICS ---

@router.get("/dashboard/global", response_model=Schemas.GlobalDashboardOut)
async def get_global_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Récupère les statistiques globales pour la page d'accueil.
    Filtre par utilisateur (projets dont il est admin ou membre).
    """
    # 1. Projets actifs
    projects_query = (
        select(func.count(models.Projet.id_projet))
        .outerjoin(models.Equipe)
        .outerjoin(models.Appartient_Equipe)
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id
            ),
            models.Projet.statut == "actif"
        )
    )
    active_projects_res = await db.execute(projects_query)
    active_projects = active_projects_res.scalar_one()

    # 2. Tâches de l'utilisateur
    tasks_query = (
        select(models.Tache)
        .join(models.Projet)
        .outerjoin(models.Equipe)
        .outerjoin(models.Appartient_Equipe)
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id
            )
        )
    )
    tasks_res = await db.execute(tasks_query)
    all_tasks = tasks_res.scalars().all()

    total_tasks = len(all_tasks)
    urgent_tasks = sum(1 for t in all_tasks if t.priorite == "haute" and t.statut != "terminees")
    
    today = date.today()
    next_week = today + timedelta(days=7)
    due_soon_tasks = sum(1 for t in all_tasks if t.echeance and t.statut != "terminees" and today <= t.echeance <= next_week)

    completed_tasks = sum(1 for t in all_tasks if t.statut == "terminees")
    in_progress_tasks = sum(1 for t in all_tasks if t.statut == "en_cours")
    todo_tasks = sum(1 for t in all_tasks if t.statut == "a_faire")
    
    progression = 0.0
    if total_tasks > 0:
        progression = sum(t.progression for t in all_tasks) / total_tasks

    return {
        "active_projects": active_projects,
        "my_tasks": total_tasks,
        "urgent_tasks": urgent_tasks,
        "due_soon_tasks": due_soon_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "progression": round(progression, 2)
    }

@router.get("/projets/{id_projet}/dashboard", response_model=Schemas.DashboardResponse)
async def get_project_dashboard(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Point d'accès critique pour les KPIs visuels du frontend."""
    project = await get_project_or_404(db, id_projet)
    await ensure_project_access(db, project, current_user)

    # Requêtes d'agrégation optimisées (using async session)
    total_tasks_result = await db.execute(select(func.count(models.Tache.id_tache)).filter(models.Tache.id_projet == id_projet))
    total_tasks = total_tasks_result.scalar_one()

    if total_tasks == 0:
        return {
            "total_taches": 0,
            "taches_terminees": 0,
            "taches_en_cours": 0,
            "taches_en_retard": 0,
            "progression_globale": 0.0
        }

    completed_tasks_result = await db.execute(select(func.count(models.Tache.id_tache)).filter(
        models.Tache.id_projet == id_projet,
        models.Tache.statut == "terminees"
    ))
    completed_tasks = completed_tasks_result.scalar_one()

    active_tasks_result = await db.execute(select(func.count(models.Tache.id_tache)).filter(
        models.Tache.id_projet == id_projet,
        models.Tache.statut.in_(["a_faire", "en_cours"])
    ))
    active_tasks = active_tasks_result.scalar_one()
    
    today = date.today()
    overdue_tasks_result = await db.execute(select(func.count(models.Tache.id_tache)).filter(
        models.Tache.id_projet == id_projet,
        models.Tache.statut != "terminees",
        models.Tache.echeance < today
    ))
    overdue_tasks = overdue_tasks_result.scalar_one()

    # Moyenne de progression
    avg_progression_result = await db.execute(select(func.avg(models.Tache.progression)).filter(
        models.Tache.id_projet == id_projet
    ))
    avg_progression = avg_progression_result.scalar_one_or_none() or 0.0

    return {
        "total_taches": total_tasks,
        "taches_terminees": completed_tasks,
        "taches_en_cours": active_tasks,
        "taches_en_retard": overdue_tasks,
        "progression_globale": round(float(avg_progression), 2) # type: ignore
    }

# --- GESTION DES ÉQUIPES ---

@router.post("/equipes", response_model=Schemas.EquipeOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    team: Schemas.EquipeCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Crée une nouvelle équipe pour un projet."""
    project = get_project_dict_or_404(team.id_projet)
    if project["id_administrateur"] != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer ce projet")

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        existing_team = conn.execute(
            "SELECT id_equipe FROM equipes WHERE id_projet = ?",
            (team.id_projet,),
        ).fetchone()
        if existing_team:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Une équipe existe déjà pour ce projet")

        cursor = conn.execute(
            """
            INSERT INTO equipes (nom, description, id_projet, id_personnel_createur)
            VALUES (?, ?, ?, ?)
            """,
            (team.nom, team.description, team.id_projet, current_user.id),
        )
        conn.commit()
        team_id = cursor.lastrowid

    return get_team_dict_or_404(team_id)

@router.post("/equipes/{id_equipe}/membres", response_model=Schemas.AppartientEquipeOut, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    id_equipe: int,
    member_data: Schemas.AppartientEquipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Ajoute un utilisateur à une équipe."""
    if id_equipe != member_data.id_equipe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'ID de l'équipe dans l'URL ne correspond pas à celui du corps de la requête.")

    team = get_team_dict_or_404(id_equipe)
    project = get_project_dict_or_404(team["id_projet"])
    if project["id_administrateur"] != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer ce projet")

    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        user = conn.execute(
            "SELECT id, role FROM users WHERE id = ?",
            (member_data.id_utilisateur,),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        if user[1] != "personnel":
            raise HTTPException(status_code=400, detail="Seuls les membres du personnel peuvent être ajoutés à une équipe")

        existing_member = conn.execute(
            """
            SELECT 1
            FROM appartient_equipe
            WHERE id_equipe = ? AND id_personnel = ?
            """,
            (id_equipe, member_data.id_utilisateur),
        ).fetchone()
        if existing_member:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="L'utilisateur est déjà membre de cette équipe.")

        conn.execute(
            "INSERT INTO appartient_equipe (id_equipe, id_personnel) VALUES (?, ?)",
            (id_equipe, member_data.id_utilisateur),
        )
        conn.commit()

    return {"id_equipe": id_equipe, "id_utilisateur": member_data.id_utilisateur}

@router.delete("/equipes/{id_equipe}/membres/{id_utilisateur}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    id_equipe: int,
    id_utilisateur: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Supprime un utilisateur d'une équipe."""
    team = await get_team_or_404(db, id_equipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_admin(project, current_user)

    member_result = await db.execute(select(models.Appartient_Equipe).filter(
        models.Appartient_Equipe.id_equipe == id_equipe,
        models.Appartient_Equipe.id_personnel == id_utilisateur
    ))
    db_member = member_result.scalar_one_or_none()

    if not db_member:
        raise HTTPException(status_code=404, detail="Membre non trouvé dans cette équipe")
    
    await db.delete(db_member)
    await db.commit()
    return {"message": "Membre supprimé de l'équipe avec succès"}

@router.get("/equipes/{id_equipe}/membres", response_model=List[Schemas.UserResponse])
async def get_team_members(
    id_equipe: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère la liste des membres d'une équipe."""
    team = await get_team_or_404(db, id_equipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_access(db, project, current_user)

    members_result = await db.execute(
        select(models.User)
        .join(
            models.Appartient_Equipe,
            models.User.id == models.Appartient_Equipe.id_personnel,
        )
        .filter(models.Appartient_Equipe.id_equipe == id_equipe)
    )
    members = members_result.scalars().all()
    return members

@router.put("/equipes/{id_equipe}/membres", status_code=status.HTTP_200_OK)
async def sync_team_members(
    id_equipe: int, 
    user_ids: List[int], 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Synchronise les membres d'une équipe (remplace les anciens par les nouveaux)."""
    # 1. Vérifier si l'équipe existe
    team = await get_team_or_404(db, id_equipe)
    
    # 2. Vérifier les permissions (admin du projet ou créateur de l'équipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_admin(project, current_user)

    # 3. Supprimer tous les membres actuels
    from sqlalchemy import delete
    await db.execute(
        delete(models.Appartient_Equipe).where(models.Appartient_Equipe.id_equipe == id_equipe)
    )

    # 4. Ajouter les nouveaux membres
    if user_ids:
        # Vérifier que les utilisateurs existent
        users_check = await db.execute(
            select(models.User.id).where(
                models.User.id.in_(user_ids),
                models.User.role == "personnel"
            )
        )
        existing_ids = [row for row in users_check.scalars().all()]
        
        new_members = [
            models.Appartient_Equipe(id_equipe=id_equipe, id_personnel=uid)
            for uid in existing_ids
        ]
        db.add_all(new_members)

    await db.commit()
    return {"message": "Membres synchronisés avec succès", "count": len(user_ids)}
