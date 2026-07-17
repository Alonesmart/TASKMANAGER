from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, or_, select
from datetime import date, timedelta
from ...database import get_db
from ... import models, Schemas
from ..auth import get_current_user

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard Analytics"])

@router.get("/global", response_model=Schemas.GlobalDashboardOut)
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
        select(func.count(models.Projet.id_projet.distinct()))
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
