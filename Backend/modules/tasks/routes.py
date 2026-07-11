from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user, RequireProjectRole

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
        "dependencies": [
            {"id_tache": dep.id_tache, "titre": dep.titre, "statut": dep.statut}
            for dep in (task.dependencies if hasattr(task, 'dependencies') else [])
        ]
    }


async def user_can_access_project(db: AsyncSession, project: models.Projet, user: models.User) -> bool:
    if user.role == "admin" or project.id_administrateur == user.id:
        return True

    # Check project roles table
    role_result = await db.execute(
        select(models.ProjetMembreRole)
        .where(
            models.ProjetMembreRole.id_projet == project.id_projet,
            models.ProjetMembreRole.id_utilisateur == user.id
        )
    )
    if role_result.scalar_one_or_none() is not None:
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
    from ..invitations.routes import verify_project_role
    await verify_project_role(db, task.id_projet, user, ["chef_projet"])


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
    id_projet: Optional[int] = None,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    date_echeance: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        select(models.Tache)
        .options(
            selectinload(models.Tache.projet).selectinload(models.Projet.equipe),
            selectinload(models.Tache.assignations).selectinload(models.TacheAssignation.utilisateur),
            selectinload(models.Tache.dependencies),
        )
        .join(models.Projet, models.Tache.id_projet == models.Projet.id_projet)
        .outerjoin(models.Equipe, models.Equipe.id_projet == models.Projet.id_projet)
        .outerjoin(models.Appartient_Equipe, models.Appartient_Equipe.id_equipe == models.Equipe.id_equipe)
        .outerjoin(models.ProjetMembreRole, models.ProjetMembreRole.id_projet == models.Projet.id_projet)
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id,
                models.ProjetMembreRole.id_utilisateur == current_user.id
            )
        )
    )

    if id_projet is not None:
        query = query.where(models.Tache.id_projet == id_projet)
    if statut is not None:
        query = query.where(models.Tache.statut == statut)
    if priorite is not None:
        query = query.where(models.Tache.priorite == priorite)
    if date_echeance is not None:
        query = query.where(models.Tache.echeance == date_echeance)

    query = query.distinct()
    result = await db.execute(query)
    return [serialize_task(task) for task in result.scalars().all()]


router.add_api_route("", list_tasks, methods=["GET"], response_model=List[Schemas.TacheOut])
router.add_api_route("/", list_tasks, methods=["GET"], response_model=List[Schemas.TacheOut])


async def create_task(
    task: Schemas.TacheCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project_result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == task.id_projet))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    from ..invitations.routes import verify_project_role
    await verify_project_role(db, task.id_projet, current_user, ["chef_projet"])

    task_data = task.model_dump()
    assigned_user_ids = task_data.pop("assigned_user_ids", [])
    db_task = models.Tache(**task_data, status=task_data["statut"])
    db.add(db_task)
    await db.flush()
    await sync_task_assignations(db, db_task.id_tache, assigned_user_ids)
    await db.commit()

    from ..messages.routes import create_and_send_notification
    for u_id in assigned_user_ids:
        await create_and_send_notification(
            db=db,
            message=f"Vous avez été assigné à la tâche '{db_task.titre}'.",
            id_utilisateur=u_id,
            id_tache=db_task.id_tache
        )
    await db.commit()

    result = await db.execute(
        select(models.Tache)
        .options(
            selectinload(models.Tache.projet).selectinload(models.Projet.equipe),
            selectinload(models.Tache.assignations).selectinload(models.TacheAssignation.utilisateur),
            selectinload(models.Tache.dependencies),
        )
        .filter(models.Tache.id_tache == db_task.id_tache)
    )
    return serialize_task(result.scalar_one())


router.add_api_route("", create_task, methods=["POST"], response_model=Schemas.TacheOut, status_code=status.HTTP_201_CREATED)
router.add_api_route("/", create_task, methods=["POST"], response_model=Schemas.TacheOut, status_code=status.HTTP_201_CREATED)


@router.put("/{id_tache}", response_model=Schemas.TacheOut, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
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

    # Capture old values
    old_status = db_task.statut
    current_assigned_res = await db.execute(select(models.TacheAssignation.id_utilisateur).where(models.TacheAssignation.id_tache == id_tache))
    old_assigned_user_ids = current_assigned_res.scalars().all()

    update_data = task_update.model_dump(exclude_unset=True)
    if "statut" in update_data and update_data["statut"] == "terminees":
        unfinished_deps_res = await db.execute(
            select(models.Tache)
            .join(models.TacheDependance, models.Tache.id_tache == models.TacheDependance.id_dependance)
            .where(
                models.TacheDependance.id_tache == id_tache,
                models.Tache.statut != "terminees"
            )
        )
        unfinished_deps = unfinished_deps_res.scalars().all()
        if unfinished_deps:
            titles = ", ".join([f"'{t.titre}'" for t in unfinished_deps])
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de terminer cette tâche car elle dépend des tâches suivantes non terminées : {titles}"
            )

    assigned_user_ids = update_data.pop("assigned_user_ids", None)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    if "statut" in update_data:
        db_task.status = update_data["statut"]
    if assigned_user_ids is not None:
        await sync_task_assignations(db, db_task.id_tache, assigned_user_ids)
    await db.commit()
    db.expire(db_task)

    result = await db.execute(
        select(models.Tache)
        .options(
            selectinload(models.Tache.projet).selectinload(models.Projet.equipe),
            selectinload(models.Tache.assignations).selectinload(models.TacheAssignation.utilisateur),
            selectinload(models.Tache.dependencies),
        )
        .filter(models.Tache.id_tache == id_tache)
    )
    task = result.scalar_one()

    # Trigger notifications
    from ..messages.routes import create_and_send_notification
    
    # 1. Notify newly assigned users
    if assigned_user_ids is not None:
        new_assignments = set(assigned_user_ids) - set(old_assigned_user_ids)
        for u_id in new_assignments:
            await create_and_send_notification(
                db=db,
                message=f"Vous avez été assigné à la tâche '{task.titre}'.",
                id_utilisateur=u_id,
                id_tache=task.id_tache
            )
            
    # 2. Notify status change
    if "statut" in update_data and update_data["statut"] != old_status:
        labels = {"a_faire": "À faire", "en_cours": "En cours", "terminees": "Terminée"}
        status_label = labels.get(update_data["statut"], update_data["statut"])
        
        all_assigned = [assign.id_utilisateur for assign in task.assignations]
        notify_targets = set(all_assigned)
        if task.projet.id_administrateur:
            notify_targets.add(task.projet.id_administrateur)
            
        for u_id in notify_targets:
            await create_and_send_notification(
                db=db,
                message=f"Le statut de la tâche '{task.titre}' a été modifié en '{status_label}'.",
                id_utilisateur=u_id,
                id_tache=task.id_tache
            )
            
    await db.commit()
    return serialize_task(task)


@router.delete("/{id_tache}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def delete_task(
    id_tache: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(select(models.Tache).filter(models.Tache.id_tache == id_tache))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")

    await db.delete(db_task)
    await db.commit()


@router.post("/{id_tache}/commentaires", response_model=Schemas.CommentaireOut, dependencies=[Depends(RequireProjectRole(["chef_projet", "collaborateur", "invite_externe"]))])
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

    db_comm = models.Commentaire(
        contenu=comm.contenu,
        id_personnel=current_user.id,
        id_tache=id_tache,
    )
    db.add(db_comm)
    await db.commit()
    await db.refresh(db_comm)

    # Trigger notifications: notify all assigned users and the project owner (excluding comment author)
    from ..messages.routes import create_and_send_notification
    assign_result = await db.execute(select(models.TacheAssignation.id_utilisateur).where(models.TacheAssignation.id_tache == id_tache))
    assigned_user_ids = assign_result.scalars().all()
    
    notify_targets = set(assigned_user_ids)
    if task.projet.id_administrateur:
        notify_targets.add(task.projet.id_administrateur)
        
    notify_targets.discard(current_user.id)
    
    for u_id in notify_targets:
        await create_and_send_notification(
            db=db,
            message=f"{current_user.nom} a commenté la tâche '{task.titre}'.",
            id_utilisateur=u_id,
            id_tache=id_tache
        )
    await db.commit()

    return {
        "id_commentaire": db_comm.id_commentaire,
        "contenu": db_comm.contenu,
        "date_creation": db_comm.date_creation,
        "id_tache": db_comm.id_tache,
        "id_utilisateur": db_comm.id_personnel,
    }


async def has_path(db: AsyncSession, start_id: int, target_id: int) -> bool:
    visited = set()
    queue = [start_id]
    while queue:
        current = queue.pop(0)
        if current == target_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        
        res = await db.execute(
            select(models.TacheDependance.id_dependance)
            .where(models.TacheDependance.id_tache == current)
        )
        for dep_id in res.scalars().all():
            if dep_id not in visited:
                queue.append(dep_id)
    return False


@router.post("/{id_tache}/dependances/{id_dependance}", status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def add_dependency(
    id_tache: int,
    id_dependance: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if id_tache == id_dependance:
        raise HTTPException(status_code=400, detail="Une tâche ne peut pas dépendre d'elle-même")

    t1_res = await db.execute(select(models.Tache).where(models.Tache.id_tache == id_tache))
    task = t1_res.scalar_one_or_none()
    t2_res = await db.execute(select(models.Tache).where(models.Tache.id_tache == id_dependance))
    dep_task = t2_res.scalar_one_or_none()

    if not task or not dep_task:
        raise HTTPException(status_code=404, detail="Une ou plusieurs tâches n'existent pas")

    if task.id_projet != dep_task.id_projet:
        raise HTTPException(status_code=400, detail="Les tâches doivent appartenir au même projet")

    exist_res = await db.execute(
        select(models.TacheDependance)
        .where(
            models.TacheDependance.id_tache == id_tache,
            models.TacheDependance.id_dependance == id_dependance
        )
    )
    if exist_res.scalar_one_or_none() is not None:
        return {"message": "La dépendance existe déjà"}

    if await has_path(db, id_dependance, id_tache):
        raise HTTPException(status_code=400, detail="Dépendance circulaire détectée")

    db_dep = models.TacheDependance(id_tache=id_tache, id_dependance=id_dependance)
    db.add(db_dep)
    await db.commit()
    return {"message": "Dépendance ajoutée avec succès"}


@router.delete("/{id_tache}/dependances/{id_dependance}", dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def remove_dependency(
    id_tache: int,
    id_dependance: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    res = await db.execute(
        select(models.TacheDependance)
        .where(
            models.TacheDependance.id_tache == id_tache,
            models.TacheDependance.id_dependance == id_dependance
        )
    )
    db_dep = res.scalar_one_or_none()
    if not db_dep:
        raise HTTPException(status_code=404, detail="Dépendance non trouvée")

    await db.delete(db_dep)
    await db.commit()
    return {"message": "Dépendance supprimée avec succès"}

