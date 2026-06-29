from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ... import models
from ...Schemas import UserResponse, UserUpdate
from ...database import get_db
from ...modules.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: models.User = Depends(get_current_user)):
    """Récupère les informations de l'utilisateur connecté."""
    return current_user


async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Récupère la liste de tous les utilisateurs."""
    result = await db.execute(select(models.User).order_by(models.User.nom.asc()))
    return result.scalars().all()


router.add_api_route("", list_users, methods=["GET"], response_model=List[UserResponse])
router.add_api_route("/", list_users, methods=["GET"], response_model=List[UserResponse])


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Met à jour le profil de l'utilisateur connecté."""
    update_data = data.model_dump(exclude_unset=True)

    if "nom" in update_data:
        current_user.nom = update_data["nom"]
    if "phone" in update_data:
        current_user.phone = update_data["phone"]

    try:
        await db.commit()
        await db.refresh(current_user)
        return current_user
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour",
        )
