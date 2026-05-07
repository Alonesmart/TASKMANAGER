from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from ..Schemas import UserRegister, Token
from ..database import get_db, pwd_context
from .. import models

router = APIRouter()

SECRET_KEY                  = "changez_cette_cle_en_production_!!!"
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# Helpers 
def create_access_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


#  Route POST /register 
@router.post("/register", response_model=Token, status_code=status.HTTP_200_OK)
def register(user_data: UserRegister, db: Session = Depends(get_db)):

    # 1. Vérifier la correspondance des mots de passe
    if user_data.motdepasse != user_data.confirm_motdepasse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les mots de passe ne correspondent pas",
        )

    # 2. Vérifier si l'email est déjà utilisé
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet email est déjà utilisé",
        )

    # 3. Créer l'utilisateur en base
    hashed_pw = pwd_context.hash(user_data.motdepasse)
    new_user = models.User(
        nom=user_data.nom,
        email=user_data.email,
        phone=user_data.phone,
        motdepasse=hashed_pw,
        role="collaborateur",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Générer un token JWT et le retourner
    token = create_access_token(new_user.email)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "message":      "Compte créé avec succès",
    }