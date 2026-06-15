import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from ..Schemas import ForgotPasswordRequest, ResetPasswordRequest
from ..database import get_db, pwd_context
from .. import models

router = APIRouter()

TOKEN_EXPIRE_MINUTES = 30

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "votre_email@gmail.com"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "votre_mot_de_passe_app"),
    MAIL_FROM = os.getenv("MAIL_FROM", "votre_email@gmail.com"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME = "TaskManager Support",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

# Route POST /forgot-password 

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):

#  Demande de réinitialisation du mot de passe.

    result = await db.execute(select(models.User).filter(models.User.email == request.email))
    user = result.scalar_one_or_none()

    # Réponse identique même si l'email n'existe pas (sécurité anti-énumération)
    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}

    # Supprimer les anciens tokens inutilisés de cet utilisateur
    await db.execute(models.ResetToken.__table__.delete().where(
        models.ResetToken.user_id == user.id,
        models.ResetToken.used == False,
    ))
    await db.commit()

    # Créer un nouveau token
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)

    reset_entry = models.ResetToken(
        token=raw_token,
        user_id=user.id,
        expires_at=expires_at,
        used=False,
    )
    db.add(reset_entry) # type: ignore
    await db.commit()

    # Envoi de l'email via FastAPI-Mail (en arrière-plan)
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
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)

    return {
        "message": "Si cet email existe, un lien a été envoyé.",
        # Uniquement en dev, idéalement via une variable d'environnement
        "reset_token": raw_token if os.getenv("DEBUG", "true").lower() == "true" else None,
    }


# ─── Route POST /reset-password ───────────────────────────────────────────────
@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):

    # 1. Trouver le token en base
    result = await db.execute(select(models.ResetToken).filter(
        models.ResetToken.token == request.token,
        models.ResetToken.used == False,
    ))
    token_entry = result.scalar_one_or_none()

    if not token_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide ou déjà utilisé",
        )

    # 2. Vérifier l'expiration
    if datetime.utcnow() > token_entry.expires_at:
        await db.delete(token_entry)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expiré — refaites la demande",
        )

    # 3. Valider les mots de passe
    if request.new_motdepasse != request.confirm_motdepasse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les mots de passe ne correspondent pas",
        )

    if len(request.new_motdepasse) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caractères",
        )

    # 4. Mettre à jour le mot de passe
    user = token_entry.user
    user.motdepasse = pwd_context.hash(request.new_motdepasse)
    user.tentatives = 0          # débloquer le compte si bloqué

    # 5. Invalider le token
    token_entry.used = True # type: ignore
    await db.commit()

    return {"message": "Mot de passe réinitialisé avec succès"}