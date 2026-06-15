from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
import time
from ..database import get_db
from .. import models, Schemas
from datetime import datetime

router = APIRouter(prefix="/api/v1/comm", tags=["Module Messagerie & Alertes"])

# --- SECTION MESSAGERIE ---
# Note: All database operations now use `await` with AsyncSession
@router.post("/messages", response_model=Schemas.MessageRead, status_code=status.HTTP_201_CREATED)
async def envoyer_message(msg_in: Schemas.MessageCreate, db: AsyncSession = Depends(get_db)):
    """Envoie un nouveau message et génère le timestamp automatiquement."""
    db_msg = models.Message(
        contenu=msg_in.contenu,
        type_conversation=msg_in.type_conversation,
        id_expediteur=msg_in.id_expediteur,
        id_ia=msg_in.id_assistant,
        date_envoi=datetime.utcnow()
    )
    db.add(db_msg) # type: ignore
    await db.commit()
    await db.refresh(db_msg)
    return db_msg

@router.get("/messages/conversations", response_model=List[Schemas.MessageRead])
async def recuperer_historique(db: AsyncSession = Depends(get_db)):
    """Récupère l'historique complet trié par date décroissante."""
    result = await db.execute(select(models.Message).order_by(desc(models.Message.date_envoi)))
    return result.scalars().all()

@router.put("/messages/{id_message}/lire", response_model=Schemas.MessageRead)
async def marquer_message_lu(id_message: int, db: AsyncSession = Depends(get_db)):
    """Marque un message spécifique comme lu."""
    result = await db.execute(select(models.Message).filter(models.Message.id_message == id_message))
    db_msg = result.scalar_one_or_none()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    db_msg.lu = True # type: ignore
    await db.commit()
    await db.refresh(db_msg)
    return db_msg

# --- SECTION NOTIFICATIONS ---

@router.get("/notifications/utilisateur/{id_utilisateur}", response_model=List[Schemas.NotificationRead])
async def lister_notifications(id_utilisateur: int, db: AsyncSession = Depends(get_db)):
    """Récupère toutes les notifications d'un utilisateur."""
    result = await db.execute(select(models.Notification).filter(
        models.Notification.id_utilisateur == id_utilisateur
    ).order_by(desc(models.Notification.date_envoi)))
    return result.scalars().all()

@router.get("/notifications/utilisateur/{id_utilisateur}/non-lues/count", response_model=Schemas.NotificationCount)
async def compter_notifications_non_lues(id_utilisateur: int, db: AsyncSession = Depends(get_db)):
    """Endpoint ultra-rapide pour le badge de notification (pastille rouge)."""
    count_result = await db.execute(select(func.count(models.Notification.id_notification)).filter(
        models.Notification.id_utilisateur == id_utilisateur,
        models.Notification.lu == False
    ))
    count = count_result.scalar_one_or_none()
    return {"count": count if count is not None else 0}

@router.put("/notifications/{id_notification}/lire", response_model=Schemas.NotificationRead)
async def marquer_notification_lu(id_notification: int, db: AsyncSession = Depends(get_db)):
    """Marque une notification comme lue."""
    result = await db.execute(select(models.Notification).filter(models.Notification.id_notification == id_notification))
    db_notif = result.scalar_one_or_none()
    if not db_notif:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    db_notif.lu = True # type: ignore
    await db.commit()
    await db.refresh(db_notif)
    return db_notif
