from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from .database import fake_users_db, pwd_context, login_logs  

router = APIRouter()

SECRET_KEY = "votre_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
MAX_TENTATIVES = 5

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": email, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def log_connexion(email: str, succes: bool, tentatives: int = 0):
    login_logs.append({
        "email": email,
        "succes": succes,
        "tentatives": tentatives,
        "date": datetime.utcnow().isoformat()
    })

@router.post("/login", response_model=Token)
def login(user: UserLogin):

    db_user = fake_users_db.get(user.email)

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    if db_user.get("tentatives", 0) >= MAX_TENTATIVES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Compte bloqué — trop de tentatives"
        )

    if not pwd_context.verify(user.password, db_user["hashed_password"]):
        fake_users_db[user.email]["tentatives"] = db_user.get("tentatives", 0) + 1
        log_connexion(user.email, succes=False, tentatives=fake_users_db[user.email]["tentatives"])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    fake_users_db[user.email]["tentatives"] = 0
    log_connexion(user.email, succes=True)
    token = create_token(user.email)
    return {
        "access_token": token, 
        "token_type": "bearer",
        "message": "Connecté avec succès"
        }
