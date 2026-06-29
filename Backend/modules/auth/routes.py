import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ... import models
from ...Schemas import ForgotPasswordRequest, ResetPasswordRequest, Token, TokenData, UserLogin, UserRegister
from ...database import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    MAX_TENTATIVES,
    SECRET_KEY,
    get_db,
    pwd_context,
)

router = APIRouter(tags=["Authentification"])
security = HTTPBearer()

TOKEN_EXPIRE_MINUTES = 30

mail_conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "votre_email@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "votre_mot_de_passe_app"),
    MAIL_FROM=os.getenv("MAIL_FROM", "votre_email@gmail.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME="TaskManager Support",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_access_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": normalize_email(email), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expirée ou invalide",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=normalize_email(email))
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(models.User).filter(models.User.email == token_data.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if not user.actif:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte désactivé")
    return user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    email = normalize_email(str(credentials.email))

    result = await db.execute(select(models.User).filter(models.User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")

    if user.tentatives >= MAX_TENTATIVES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Compte bloqué après {MAX_TENTATIVES} tentatives échouées. Réinitialisez votre mot de passe.",
        )

    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez l'administrateur.",
        )

    if not pwd_context.verify(credentials.motdepasse, user.motdepasse):
        user.tentatives += 1
        await db.commit()
        remaining = MAX_TENTATIVES - user.tentatives
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Email ou mot de passe incorrect. "
                f"{'Compte bloqué.' if remaining <= 0 else f'{remaining} tentative(s) restante(s).'}"
            ),
        )

    user.tentatives = 0
    await db.commit()
    await db.refresh(user)

    return {
        "access_token": create_access_token(email),
        "token_type": "bearer",
        "message": "Connecté avec succès",
    }


@router.post("/register", response_model=Token, status_code=status.HTTP_200_OK)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    email = normalize_email(str(user_data.email))

    if user_data.motdepasse != user_data.confirm_motdepasse:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Les mots de passe ne correspondent pas")

    result = await db.execute(select(models.User).where(models.User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cet email est déjà utilisé")

    new_user = models.Personnel(
        nom=user_data.nom,
        email=email,
        phone=user_data.phone,
        motdepasse=pwd_context.hash(user_data.motdepasse),
        role="personnel",
        actif=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "access_token": create_access_token(new_user.email),
        "token_type": "bearer",
        "message": "Compte créé avec succès",
    }


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    email = normalize_email(str(request.email))
    result = await db.execute(select(models.User).filter(models.User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}

    await db.execute(
        models.ResetToken.__table__.delete().where(
            models.ResetToken.user_id == user.id,
            models.ResetToken.used == False,
        )
    )
    await db.commit()

    raw_token = secrets.token_urlsafe(32)
    reset_entry = models.ResetToken(
        token=raw_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
        used=False,
    )
    db.add(reset_entry)
    await db.commit()

    html = f"""
    <h3>Réinitialisation de mot de passe</h3>
    <p>Bonjour,</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe TaskManager.</p>
    <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (valable {TOKEN_EXPIRE_MINUTES} minutes) :</p>
    <p><a href="http://localhost:19006/reset-password?token={raw_token}">Réinitialiser mon mot de passe</a></p>
    <p>Si vous n'avez pas demandé cela, ignorez cet e-mail.</p>
    """

    message = MessageSchema(
        subject="TaskManager - Réinitialisation de mot de passe",
        recipients=[user.email],
        body=html,
        subtype=MessageType.html,
    )
    background_tasks.add_task(FastMail(mail_conf).send_message, message)

    return {
        "message": "Si cet email existe, un lien a été envoyé.",
        "reset_token": raw_token if os.getenv("DEBUG", "true").lower() == "true" else None,
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.ResetToken).filter(
            models.ResetToken.token == request.token,
            models.ResetToken.used == False,
        )
    )
    token_entry = result.scalar_one_or_none()
    if not token_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalide ou déjà utilisé")

    if datetime.utcnow() > token_entry.expires_at:
        await db.delete(token_entry)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expiré — refaites la demande")

    if request.new_motdepasse != request.confirm_motdepasse:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Les mots de passe ne correspondent pas")

    if len(request.new_motdepasse) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le mot de passe doit contenir au moins 8 caractères")

    user = token_entry.user
    user.motdepasse = pwd_context.hash(request.new_motdepasse)
    user.tentatives = 0
    token_entry.used = True
    await db.commit()

    return {"message": "Mot de passe réinitialisé avec succès"}
