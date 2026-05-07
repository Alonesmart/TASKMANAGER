import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..Schemas import ForgotPasswordRequest, ResetPasswordRequest
from ..database import get_db, pwd_context
from .. import models

router = APIRouter()

TOKEN_EXPIRE_MINUTES = 1

# Route POST /forgot-password 

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):

#  Demande de réinitialisation du mot de passe.

    user = db.query(models.User).filter(models.User.email == request.email).first()

    # Réponse identique même si l'email n'existe pas (sécurité anti-énumération)
    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}

    # Supprimer les anciens tokens inutilisés de cet utilisateur
    db.query(models.ResetToken).filter(
        models.ResetToken.user_id == user.id,
        models.ResetToken.used == False,
    ).delete()
    db.commit()

    # Créer un nouveau token
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)

    reset_entry = models.ResetToken(
        token=raw_token,
        user_id=user.id,
        expires_at=expires_at,
        used=False,
    )
    db.add(reset_entry)
    db.commit()

    # TODO : envoyer l'email avec le lien de réinitialisation
    # send_reset_email(user.email, raw_token)

    return {
        "message": "Si cet email existe, un lien a été envoyé.",
        # ⚠️ À retirer en production — uniquement pour les tests
        "reset_token": raw_token,
    }


# ─── Route POST /reset-password ───────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):

    # 1. Trouver le token en base
    token_entry = db.query(models.ResetToken).filter(
        models.ResetToken.token == request.token,
        models.ResetToken.used == False,
    ).first()

    if not token_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide ou déjà utilisé",
        )

    # 2. Vérifier l'expiration
    if datetime.utcnow() > token_entry.expires_at:
        db.delete(token_entry)
        db.commit()
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
    token_entry.used = True
    db.commit()

    return {"message": "Mot de passe réinitialisé avec succès"}