from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt
from .database import fake_users_db, pwd_context, login_logs  

router = APIRouter()

SECRET_KEY = "votre_secret_key"
ALGORITHM = "HS256"

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    message: str

@router.post("/register", response_model=Token)
def register(user: UserRegister):

    if not user.name or not user.email or not user.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tous les champs sont obligatoires"
        )

    if user.password != user.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les mots de passe ne correspondent pas"
        )

    if len(user.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caractères"
        )

    if user.email in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet email est déjà utilisé"
        )

    fake_users_db[user.email] = {
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "hashed_password": pwd_context.hash(user.password),
        "tentatives": 0,
        "created_at": datetime.utcnow().isoformat()
    }

    login_logs.append({
        "email": user.email,
        "action": "creation_compte",
        "date": datetime.utcnow().isoformat()
    })

    expire = datetime.utcnow() + timedelta(minutes=30)
    token = jwt.encode(
        {"sub": user.email, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    login_logs.append({
        "email": user.email,
        "action": "connexion_automatique",
        "date": datetime.utcnow().isoformat()
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Compte créé avec succès"
    }