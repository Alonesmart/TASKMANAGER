from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user

router = APIRouter(prefix="/api/v1/core/equipes", tags=["Équipes"])


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


async def ensure_project_admin(project: models.Projet, user: models.User):
    if project.id_administrateur != user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer ce projet")


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


async def create_team(
    team: Schemas.EquipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_admin(project, current_user)

    if project.equipe:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Une équipe existe déjà pour ce projet")

    try:
        new_team = models.Equipe(
            nom=team.nom,
            description=team.description,
            id_projet=team.id_projet,
            id_personnel_createur=current_user.id,
        )
        db.add(new_team)
        await db.commit()
        await db.refresh(new_team)
        return new_team
    except Exception as e:
        await db.rollback()
        if "UNIQUE constraint failed: equipes.nom" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Le nom d'équipe '{team.nom}' est déjà utilisé.",
            )
        raise e


router.add_api_route("", create_team, methods=["POST"], response_model=Schemas.EquipeOut, status_code=status.HTTP_201_CREATED)
router.add_api_route("/", create_team, methods=["POST"], response_model=Schemas.EquipeOut, status_code=status.HTTP_201_CREATED)


@router.post("/{id_equipe}/membres", response_model=Schemas.AppartientEquipeOut, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    id_equipe: int,
    member_data: Schemas.AppartientEquipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if id_equipe != member_data.id_equipe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'ID de l'équipe dans l'URL ne correspond pas à celui du corps de la requête.",
        )

    team = await get_team_or_404(db, id_equipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_admin(project, current_user)

    result = await db.execute(select(models.User).filter(models.User.id == member_data.id_utilisateur))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.role != "personnel":
        raise HTTPException(status_code=400, detail="Seuls les membres du personnel peuvent être ajoutés à une équipe")

    result = await db.execute(
        select(models.Appartient_Equipe).filter(
            models.Appartient_Equipe.id_equipe == id_equipe,
            models.Appartient_Equipe.id_personnel == member_data.id_utilisateur,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="L'utilisateur est déjà membre de cette équipe.")

    db.add(models.Appartient_Equipe(id_equipe=id_equipe, id_personnel=member_data.id_utilisateur))
    await db.commit()
    return {"id_equipe": id_equipe, "id_utilisateur": member_data.id_utilisateur}


@router.delete("/{id_equipe}/membres/{id_utilisateur}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    id_equipe: int,
    id_utilisateur: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    team = await get_team_or_404(db, id_equipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_admin(project, current_user)

    member_result = await db.execute(
        select(models.Appartient_Equipe).filter(
            models.Appartient_Equipe.id_equipe == id_equipe,
            models.Appartient_Equipe.id_personnel == id_utilisateur,
        )
    )
    db_member = member_result.scalar_one_or_none()
    if not db_member:
        raise HTTPException(status_code=404, detail="Membre non trouvé dans cette équipe")

    await db.delete(db_member)
    await db.commit()


@router.get("/{id_equipe}/membres", response_model=List[Schemas.UserResponse])
async def get_team_members(
    id_equipe: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    team = await get_team_or_404(db, id_equipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_access(db, project, current_user)

    members_result = await db.execute(
        select(models.User)
        .join(models.Appartient_Equipe, models.User.id == models.Appartient_Equipe.id_personnel)
        .filter(models.Appartient_Equipe.id_equipe == id_equipe)
        .order_by(models.User.nom.asc())
    )
    return members_result.scalars().all()


@router.put("/{id_equipe}/membres", status_code=status.HTTP_200_OK)
async def sync_team_members(
    id_equipe: int,
    user_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    team = await get_team_or_404(db, id_equipe)
    project = await get_project_or_404(db, team.id_projet)
    await ensure_project_admin(project, current_user)

    await db.execute(delete(models.Appartient_Equipe).where(models.Appartient_Equipe.id_equipe == id_equipe))

    existing_ids: List[int] = []
    if user_ids:
        users_check = await db.execute(
            select(models.User.id).where(
                models.User.id.in_(user_ids),
                models.User.role == "personnel",
            )
        )
        existing_ids = users_check.scalars().all()
        db.add_all(
            [models.Appartient_Equipe(id_equipe=id_equipe, id_personnel=uid) for uid in existing_ids]
        )

    await db.commit()
    return {"message": "Membres synchronisés avec succès", "count": len(existing_ids)}
