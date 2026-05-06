from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from database import fake_users_db, pwd_context, reset_tokens_db  # ✅ sans le point
import secrets

router = APIRouter()

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):

    if request.email not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email introuvable"
        )

    reset_token = secrets.token_urlsafe(32)

    reset_tokens_db[reset_token] = {
        "email": request.email,
        "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    }

    return {
        "message": "Lien de réinitialisation envoyé",
        "reset_token": reset_token  # ⚠️ À retirer en production
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):

    token_data = reset_tokens_db.get(request.token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide"
        )

    expires_at = datetime.fromisoformat(token_data["expires_at"])
    if datetime.utcnow() > expires_at:
        del reset_tokens_db[request.token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expiré — refaites la demande"
        )

    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les mots de passe ne correspondent pas"
        )

    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caractères"
        )

    email = token_data["email"]
    fake_users_db[email]["hashed_password"] = pwd_context.hash(request.new_password)
    del reset_tokens_db[request.token]

    return {"message": "Mot de passe réinitialisé avec succès"}