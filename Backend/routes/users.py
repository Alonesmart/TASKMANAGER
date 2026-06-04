from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..Schemas import UserResponse, UserUpdate
from .login import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: models.User = Depends(get_current_user)):
    """Récupère les informations de l'utilisateur connecté"""
    return current_user

@router.put("/me")
def update_user_me(
    data: UserUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Met à jour le profil (nom, téléphone) de l'utilisateur connecté"""
    try:
        current_user.nom = data.nom
        current_user.phone = data.phone
        db.commit()
        return {"message": "Profil mis à jour avec succès"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")