import os
from datetime import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ... import models

async def get_google_service(user_id: int, db: AsyncSession):
    """Récupère un service Google Calendar authentifié pour l'utilisateur."""
    result = await db.execute(select(models.GoogleCredential).where(models.GoogleCredential.user_id == user_id))
    cred_model = result.scalar_one_or_none()
    
    if not cred_model:
        return None
        
    creds = Credentials(
        token=cred_model.access_token,
        refresh_token=cred_model.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )
    
    return build("calendar", "v3", credentials=creds)

async def sync_task_to_calendar(task: models.Tache, user_id: int, db: AsyncSession):
    """Synchronise une tâche avec Google Agenda."""
    service = await get_google_service(user_id, db)
    if not service:
        return # Pas de compte lié

    event = {
        "summary": task.titre,
        "description": task.description,
        "start": {"date": str(task.echeance)},
        "end": {"date": str(task.echeance)},
    }
    
    # Logique pour créer ou mettre à jour un événement si on stockait un id_event dans Tache
    service.events().insert(calendarId="primary", body=event).execute()
