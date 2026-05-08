from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from ..Schemas import UserLogin, Token

from ..database import get_db, pwd_context
from .. import models

router = APIRouter()

# ─── Config JWT ───────────────────────────────────────────────────────────────
SECRET_KEY                  = "changez_cette_cle_en_production_!!!"   # ⚠️ à externaliser via .env
ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
MAX_TENTATIVES              = 5

# Helpers
def create_access_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


#Route POST /login 
@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    email = str(credentials.email).strip().lower()

    # 1. Rechercher l'utilisateur par email
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    # 2. Vérifier si le compte est bloqué
    if user.tentatives >= MAX_TENTATIVES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Compte bloqué après {MAX_TENTATIVES} tentatives échouées. "
                   "Réinitialisez votre mot de passe.",
        )

    # 3. Vérifier si le compte est actif
    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez l'administrateur.",
        )

    # 4. Vérifier le mot de passe
    if not pwd_context.verify(credentials.motdepasse, user.motdepasse):
        user.tentatives += 1
        db.commit()
        remaining = MAX_TENTATIVES - user.tentatives
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Email ou mot de passe incorrect. "
                   f"{'Compte bloqué.' if remaining <= 0 else f'{remaining} tentative(s) restante(s).'}",
        )

    # 5. Connexion réussie → réinitialiser le compteur
    user.tentatives = 0
    db.commit()

    token = create_access_token(user.email)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "message":      "Connecté avec succès",
    }
