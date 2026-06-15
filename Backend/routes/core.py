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
        .outerjoin(models.Equipe)
        .outerjoin(models.Appartient_Equipe)
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
    project_data = project.model_dump()
    if project_data.get("id_administrateur") is None:
        project_data["id_administrateur"] = current_user.id
        
    db_project = models.Projet(**project_data)
    db.add(db_project) # type: ignore
    await db.commit()
    await db.refresh(db_project)
    
    # Refetch with relations for serialization
    result = await db.execute(
        select(models.Projet)
        .options(selectinload(models.Projet.equipe))
        .filter(models.Projet.id_projet == db_project.id_projet)
    )
    return result.scalar_one()

@router.get("/projets/{id_projet}", response_model=Schemas.ProjetOut)
async def get_project(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère un projet spécifique par son ID."""
    result = await db.execute(
        select(models.Projet)
        .options(selectinload(models.Projet.equipe))
        .filter(models.Projet.id_projet == id_projet)
    )
    db_project = result.scalar_one_or_none()
    if not db_project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    # Vérification des permissions
    # L'utilisateur doit être soit l'admin, soit membre de l'équipe
    is_admin = db_project.id_administrateur == current_user.id
    
    is_member = False
    if db_project.equipe:
        member_result = await db.execute(
            select(models.Appartient_Equipe)
            .filter(
                models.Appartient_Equipe.id_equipe == db_project.equipe.id_equipe,
                models.Appartient_Equipe.id_personnel == current_user.id
            )
        )
        if member_result.scalar_one_or_none():
            is_member = True

    if not is_admin and not is_member:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce projet")

    return db_project

@router.put("/projets/{id_projet}", response_model=Schemas.ProjetOut)
async def update_project(
    id_projet: int,
    project_update: Schemas.ProjetBase,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Met à jour un projet existant."""
    result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == id_projet))
    db_project = result.scalar_one_or_none()
    if not db_project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    # Vérification des permissions (seul l'admin peut modifier)
    if db_project.id_administrateur != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de modifier ce projet")

    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    await db.commit()
    
    # Refetch with relations for serialization
    result = await db.execute(
        select(models.Projet)
        .options(selectinload(models.Projet.equipe))
        .filter(models.Projet.id_projet == id_projet)
    )
    return result.scalar_one()

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
    
    # Vérification des permissions
    if db_project.id_administrateur != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de supprimer ce projet")

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
        .join(models.Projet)
        .outerjoin(models.Equipe)
        .outerjoin(models.Appartient_Equipe)
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
async def create_task(task: Schemas.TacheCreate, db: AsyncSession = Depends(get_db)):
    """Ajoute une tâche à un projet existant."""
    db_task = models.Tache(**task.model_dump())
    db.add(db_task) # type: ignore
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.put("/taches/{id_tache}", response_model=Schemas.TacheOut)
async def update_task(id_tache: int, task_update: Schemas.TacheUpdate, db: AsyncSession = Depends(get_db)):
    """Mise à jour flexible d'une tâche (Kanban, progression, statut)."""
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
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
async def delete_task(id_tache: int, db: AsyncSession = Depends(get_db)):
    """Supprime une tâche existante."""
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    await db.delete(db_task)
    await db.commit()
    return {"message": "Tâche supprimée avec succès"}

# --- COMMENTAIRES ---

@router.post("/taches/{id_tache}/commentaires", response_model=Schemas.CommentaireOut)
async def add_commentaire(id_tache: int, comm: Schemas.CommentaireCreate, db: AsyncSession = Depends(get_db)):
    """Ajoute un commentaire à une tâche."""
    comm_data = comm.model_dump()
    user_id = comm_data.pop("id_utilisateur")
    db_comm = models.Commentaire(**comm_data, id_personnel=user_id, id_tache=id_tache) # type: ignore
    db.add(db_comm) # type: ignore
    await db.commit()
    await db.refresh(db_comm)
    return db_comm

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
async def get_project_dashboard(id_projet: int, db: AsyncSession = Depends(get_db)):
    """Point d'accès critique pour les KPIs visuels du frontend."""
    result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == id_projet))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

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
    # Check if project exists
    project_result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == team.id_projet))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Check if a team already exists for this project (unique constraint)
    existing_team_result = await db.execute(select(models.Equipe).filter(models.Equipe.id_projet == team.id_projet))
    if existing_team_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Une équipe existe déjà pour ce projet")

    team_data = team.model_dump()
    # team_data["id_personnel_createur"] = current_user.id # Removed as per schema
    
    db_team = models.Equipe(**team_data)
    db.add(db_team) # type: ignore
    await db.commit()
    await db.refresh(db_team)
    return db_team

@router.post("/equipes/{id_equipe}/membres", response_model=Schemas.AppartientEquipeOut, status_code=status.HTTP_201_CREATED)
async def add_team_member(id_equipe: int, member_data: Schemas.AppartientEquipeCreate, db: AsyncSession = Depends(get_db)):
    """Ajoute un utilisateur à une équipe."""
    if id_equipe != member_data.id_equipe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'ID de l'équipe dans l'URL ne correspond pas à celui du corps de la requête.")

    # Check if team exists
    team_result = await db.execute(select(models.Equipe).filter(models.Equipe.id_equipe == id_equipe))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")

    # Check if user exists
    user_result = await db.execute(select(models.User).filter(models.User.id == member_data.id_utilisateur))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Check if user is already a member
    existing_member_result = await db.execute(select(models.Appartient_Equipe).filter(
        models.Appartient_Equipe.id_equipe == id_equipe,
        models.Appartient_Equipe.id_personnel == member_data.id_utilisateur
    ))
    if existing_member_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="L'utilisateur est déjà membre de cette équipe.")

    db_member = models.Appartient_Equipe(id_equipe=id_equipe, id_personnel=member_data.id_utilisateur)
    db.add(db_member) # type: ignore
    await db.commit()
    await db.refresh(db_member)
    return db_member

@router.delete("/equipes/{id_equipe}/membres/{id_utilisateur}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(id_equipe: int, id_utilisateur: int, db: AsyncSession = Depends(get_db)):
    """Supprime un utilisateur d'une équipe."""
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
async def get_team_members(id_equipe: int, db: AsyncSession = Depends(get_db)):
    """Récupère la liste des membres d'une équipe."""
    team_result = await db.execute(select(models.Equipe).filter(models.Equipe.id_equipe == id_equipe))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")

    members_result = await db.execute(
        select(models.User)
        .join(models.Appartient_Equipe)
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
    team_result = await db.execute(select(models.Equipe).filter(models.Equipe.id_equipe == id_equipe))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    
    # 2. Vérifier les permissions (admin du projet ou créateur de l'équipe)
    project_result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == team.id_projet))
    project = project_result.scalar_one_or_none()
    if not project or (project.id_administrateur != current_user.id):
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer les membres de cette équipe")

    # 3. Supprimer tous les membres actuels
    from sqlalchemy import delete
    await db.execute(
        delete(models.Appartient_Equipe).where(models.Appartient_Equipe.id_equipe == id_equipe)
    )

    # 4. Ajouter les nouveaux membres
    if user_ids:
        # Vérifier que les utilisateurs existent
        users_check = await db.execute(select(models.User.id).where(models.User.id.in_(user_ids)))
        existing_ids = [row for row in users_check.scalars().all()]
        
        new_members = [
            models.Appartient_Equipe(id_equipe=id_equipe, id_personnel=uid)
            for uid in existing_ids
        ]
        db.add_all(new_members)

    await db.commit()
    return {"message": "Membres synchronisés avec succès", "count": len(user_ids)}
