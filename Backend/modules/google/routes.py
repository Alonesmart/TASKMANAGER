import os
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...database import get_db
from ...modules.auth import get_current_user
from ... import models, Schemas

router = APIRouter(prefix="/api/v1/google", tags=["Google Agenda"])

# Configuration (à récupérer depuis .env)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:8000/api/v1/google/callback"

@router.get("/auth")
async def google_auth():
    """Redirection vers Google pour le consentement OAuth2."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth non configuré")
        
    # URL de consentement Google
    scope = "https://www.googleapis.com/auth/calendar.events"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return RedirectResponse(auth_url)

@router.get("/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Gestion du callback après consentement Google."""
    
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Erreur lors de l'échange du code contre le token")
        
    token_data = response.json()
    
    # Calculer l'expiration
    expires_in = token_data.get("expires_in", 3600)
    expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    
    # Sauvegarder dans la DB
    credential = models.GoogleCredential(
        user_id=current_user.id,
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token", ""),
        token_expiry=expiry
    )
    db.add(credential)
    await db.commit()
    
    return {"message": "Compte Google lié avec succès"}

@router.get("/status")
async def google_status(
    db: AsyncSession = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Vérifier si le compte est lié."""
    result = await db.execute(select(models.GoogleCredential).where(models.GoogleCredential.user_id == current_user.id))
    credential = result.scalar_one_or_none()
    return {"linked": credential is not None}
