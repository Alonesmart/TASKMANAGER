from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..database import get_db
from .. import models
from ..Schemas import UserResponse, UserUpdate
from .login import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])
# Note: All database operations now use `await` with AsyncSession

@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: models.User = Depends(get_current_user)):
    """Récupère les informations de l'utilisateur connecté"""
    return current_user

@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère la liste de tous les utilisateurs"""
    result = await db.execute(select(models.User))
    return result.scalars().all()

@router.put("/me")
async def update_user_me(
    data: UserUpdate, 
    db: AsyncSession = Depends(get_db), 
    current_user: models.User = Depends(get_current_user) # type: ignore
):
    """Met à jour le profil (nom, téléphone) de l'utilisateur connecté"""
    try:
        current_user.nom = data.nom # type: ignore
        current_user.phone = data.phone # type: ignore
        await db.commit()
        await db.refresh(current_user)
        return {"message": "Profil mis à jour avec succès"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")