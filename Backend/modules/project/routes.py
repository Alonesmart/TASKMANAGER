from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List

from ...database import get_db
from ... import models, Schemas
from ...modules.auth import get_current_user, RequireProjectRole

router = APIRouter(prefix="/api/v1/core/projets", tags=["Projets"])

# --- HELPERS (À migrer plus tard ou centraliser) ---
async def get_admin_or_400(db: AsyncSession, user_id: int) -> models.User:
    result = await db.execute(select(models.User).filter(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Chef de projet introuvable")
    if user.role != "admin":
        raise HTTPException(status_code=400, detail="Le chef de projet doit être un administrateur")
    return user

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

# --- ROUTES ---

async def list_accessible_projects(
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
        .outerjoin(
            models.ProjetMembreRole,
            models.ProjetMembreRole.id_projet == models.Projet.id_projet
        )
        .where(
            or_(
                models.Projet.id_administrateur == current_user.id,
                models.Appartient_Equipe.id_personnel == current_user.id,
                models.ProjetMembreRole.id_utilisateur == current_user.id
            )
        )
        .distinct()
    )
    result = await db.execute(query)
    return result.scalars().all()

router.add_api_route("", list_accessible_projects, methods=["GET"], response_model=List[Schemas.ProjetOut])
router.add_api_route("/", list_accessible_projects, methods=["GET"], response_model=List[Schemas.ProjetOut])

async def create_project(
    project: Schemas.ProjetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Crée un nouveau projet."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent créer des projets")

    project_data = project.model_dump()
    admin_id = project_data.get("id_administrateur") or current_user.id
    await get_admin_or_400(db, admin_id)
    
    new_project = models.Projet(
        titre=project_data["titre"],
        description=project_data.get("description"),
        dateDebut=project_data["dateDebut"],
        dateFin=project_data["dateFin"],
        priorite=project_data.get("priorite", "moyenne"),
        statut=project_data.get("statut", "actif"),
        etat=project_data.get("etat", "en_cours"),
        id_administrateur=admin_id,
    )

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    return new_project

router.add_api_route("", create_project, methods=["POST"], response_model=Schemas.ProjetOut, status_code=status.HTTP_201_CREATED)
router.add_api_route("/", create_project, methods=["POST"], response_model=Schemas.ProjetOut, status_code=status.HTTP_201_CREATED)

@router.get("/{id_projet}", response_model=Schemas.ProjetOut, dependencies=[Depends(RequireProjectRole(["chef_projet", "collaborateur", "invite_externe"]))])
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
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
        
    return project


@router.put("/{id_projet}", response_model=Schemas.ProjetOut, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def update_project(
    id_projet: int,
    project_update: Schemas.ProjetBase,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Met à jour un projet existant."""
    result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == id_projet))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    update_data = project_update.model_dump(exclude_unset=True)
    if "id_administrateur" in update_data and update_data["id_administrateur"] is not None:
        await get_admin_or_400(db, update_data["id_administrateur"])

    for key, value in update_data.items():
        setattr(project, key, value)
    
    await db.commit()
    await db.refresh(project)

    return project


@router.delete("/{id_projet}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
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
    
    await db.delete(db_project)
    await db.commit()
    return {"message": "Projet supprimé avec succès"}
