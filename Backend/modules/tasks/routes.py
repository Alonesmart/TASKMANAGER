from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user

router = APIRouter(prefix="/api/v1/core/taches", tags=["Tâches"])


def serialize_task(task: models.Tache) -> dict:
    return {
        "id_tache": task.id_tache,
        "titre": task.titre,
        "description": task.description,
        "priorite": task.priorite,
        "statut": task.statut,
        "echeance": task.echeance,
        "progression": task.progression,
        "etat": task.etat,
        "id_projet": task.id_projet,
        "projet": task.projet,
        "assigned_users": [assignation.utilisateur for assignation in task.assignations],
    }


async def user_can_access_project(db: AsyncSession, project: models.Projet, user: models.User) -> bool:
    if project.id_administrateur == user.id:
        return True

    team_result = await db.execute(select(models.Equipe).filter(models.Equipe.id_projet == project.id_projet))
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


async def ensure_task_admin(db: AsyncSession, task: models.Tache, user: models.User):
    project_result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == task.id_projet))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    if user.role != "admin" or project.id_administrateur != user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer cette tâche")


async def sync_task_assignations(db: AsyncSession, task_id: int, user_ids: List[int]):
    await db.execute(delete(models.TacheAssignation).where(models.TacheAssignation.id_tache == task_id))

    if not user_ids:
        return

    result = await db.execute(
        select(models.User.id).where(
            models.User.id.in_(user_ids),
            models.User.role == "personnel",
        )
    )
    valid_user_ids = result.scalars().all()
    db.add_all(
        [models.TacheAssignation(id_tache=task_id, id_utilisateur=user_id) for user_id in valid_user_ids]
    )


async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        select(models.Tache)
        .options(
            selectinload(models.Tache.projet).selectinload(models.Projet.equipe),
            selectinload(models.Tache.assignations).selectinload(models.TacheAssignation.utilisateur),
        )
        .join(models.Projet, models.Tache.id_projet == models.Projet.id_projet)
        .outerjoin(models.Equipe, models.Equipe.id_projet == models.Projet.id_projet)
        .outerjoin(models.Appartient_Equipe, models.Appartient_Equipe.id_equipe == models.Equipe.id_equipe)
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id,
            )
        )
        .distinct()
    )
    result = await db.execute(query)
    return [serialize_task(task) for task in result.scalars().all()]


router.add_api_route("", list_tasks, methods=["GET"], response_model=List[Schemas.TacheOut])
router.add_api_route("/", list_tasks, methods=["GET"], response_model=List[Schemas.TacheOut])


async def create_task(
    task: Schemas.TacheCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent créer des tâches")

    project_result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == task.id_projet))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    if project.id_administrateur != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer ce projet")

    task_data = task.model_dump()
    assigned_user_ids = task_data.pop("assigned_user_ids", [])
    db_task = models.Tache(**task_data, status=task_data["statut"])
    db.add(db_task)
    await db.flush()
    await sync_task_assignations(db, db_task.id_tache, assigned_user_ids)
    await db.commit()

    result = await db.execute(
        select(models.Tache)
        .options(
            selectinload(models.Tache.projet).selectinload(models.Projet.equipe),
            selectinload(models.Tache.assignations).selectinload(models.TacheAssignation.utilisateur),
        )
        .filter(models.Tache.id_tache == db_task.id_tache)
    )
    return serialize_task(result.scalar_one())


router.add_api_route("", create_task, methods=["POST"], response_model=Schemas.TacheOut, status_code=status.HTTP_201_CREATED)
router.add_api_route("/", create_task, methods=["POST"], response_model=Schemas.TacheOut, status_code=status.HTTP_201_CREATED)


@router.put("/{id_tache}", response_model=Schemas.TacheOut)
async def update_task(
    id_tache: int,
    task_update: Schemas.TacheUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    await ensure_task_admin(db, db_task, current_user)

    update_data = task_update.model_dump(exclude_unset=True)
    assigned_user_ids = update_data.pop("assigned_user_ids", None)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    if "statut" in update_data:
        db_task.status = update_data["statut"]
    if assigned_user_ids is not None:
        await sync_task_assignations(db, db_task.id_tache, assigned_user_ids)
    await db.commit()

    result = await db.execute(
        select(models.Tache)
        .options(
            selectinload(models.Tache.projet).selectinload(models.Projet.equipe),
            selectinload(models.Tache.assignations).selectinload(models.TacheAssignation.utilisateur),
        )
        .filter(models.Tache.id_tache == id_tache)
    )
    return serialize_task(result.scalar_one())


@router.delete("/{id_tache}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    id_tache: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    await ensure_task_admin(db, db_task, current_user)

    await db.delete(db_task)
    await db.commit()


@router.post("/{id_tache}/commentaires", response_model=Schemas.CommentaireOut)
async def add_commentaire(
    id_tache: int,
    comm: Schemas.CommentaireCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
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
    db.add(db_comm)
    await db.commit()
    await db.refresh(db_comm)
    return {
        "id_commentaire": db_comm.id_commentaire,
        "contenu": db_comm.contenu,
        "date_creation": db_comm.date_creation,
        "id_tache": db_comm.id_tache,
        "id_utilisateur": db_comm.id_personnel,
    }
