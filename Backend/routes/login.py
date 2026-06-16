from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from jose import JWTError, jwt
from sqlalchemy import select
from ..Schemas import UserLogin, Token, TokenData

from ..database import get_db, pwd_context, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, MAX_TENTATIVES
from .. import models

router = APIRouter()

# ─── Config JWT ───────────────────────────────────────────────────────────────
# (Config moved to database.py)

security = HTTPBearer()

# Helpers
def create_access_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expirée ou invalide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = auth.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(models.User).filter(models.User.email == token_data.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if not user.actif:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    return user

#Route POST /login 
@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    email = str(credentials.email).strip().lower()

    # 1. Rechercher l'utilisateur par email
    result = await db.execute(select(models.User).filter(models.User.email == email))
    user = result.scalar_one_or_none()

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
        await db.commit()
        remaining = MAX_TENTATIVES - user.tentatives
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Email ou mot de passe incorrect. "
                   f"{'Compte bloqué.' if remaining <= 0 else f'{remaining} tentative(s) restante(s).'}",
        )
    # 5. Connexion réussie → réinitialiser le compteur
    user.tentatives = 0
    await db.commit()
    await db.refresh(user)

    token = create_access_token(email)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "message":      "Connecté avec succès",
    }
