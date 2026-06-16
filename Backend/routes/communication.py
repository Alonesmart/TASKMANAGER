from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
from ..database import get_db
from .. import models, Schemas
from datetime import datetime
from .login import get_current_user

router = APIRouter(prefix="/api/v1/comm", tags=["Module Messagerie & Alertes"])

def ensure_same_user_or_admin(requested_user_id: int, current_user: models.User):
    if requested_user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ces données")

# --- SECTION MESSAGERIE ---
# Note: All database operations now use `await` with AsyncSession
@router.post("/messages", response_model=Schemas.MessageRead, status_code=status.HTTP_201_CREATED)
async def envoyer_message(
    msg_in: Schemas.MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Envoie un nouveau message et génère le timestamp automatiquement."""
    db_msg = models.Message(
        contenu=msg_in.contenu,
        type_conversation=msg_in.type_conversation,
        id_expediteur=current_user.id,
        id_ia=msg_in.id_assistant,
        date_envoi=datetime.utcnow()
    )
    db.add(db_msg) # type: ignore
    await db.commit()
    await db.refresh(db_msg)
    return db_msg

@router.get("/messages/conversations", response_model=List[Schemas.MessageRead])
async def recuperer_historique(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère l'historique complet trié par date décroissante."""
    result = await db.execute(select(models.Message).order_by(desc(models.Message.date_envoi)))
    return result.scalars().all()

@router.put("/messages/{id_message}/lire", response_model=Schemas.MessageRead)
async def marquer_message_lu(
    id_message: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Marque un message spécifique comme lu."""
    result = await db.execute(select(models.Message).filter(models.Message.id_message == id_message))
    db_msg = result.scalar_one_or_none()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    ensure_same_user_or_admin(db_msg.id_expediteur, current_user)
    
    db_msg.lu = True # type: ignore
    await db.commit()
    await db.refresh(db_msg)
    return db_msg

# --- SECTION NOTIFICATIONS ---

@router.get("/notifications/utilisateur/{id_utilisateur}", response_model=List[Schemas.NotificationRead])
async def lister_notifications(
    id_utilisateur: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère toutes les notifications d'un utilisateur."""
    ensure_same_user_or_admin(id_utilisateur, current_user)
    result = await db.execute(select(models.Notification).filter(
        models.Notification.id_utilisateur == id_utilisateur
    ).order_by(desc(models.Notification.date_envoi)))
    return result.scalars().all()

@router.get("/notifications/utilisateur/{id_utilisateur}/non-lues/count", response_model=Schemas.NotificationCount)
async def compter_notifications_non_lues(
    id_utilisateur: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Endpoint ultra-rapide pour le badge de notification (pastille rouge)."""
    ensure_same_user_or_admin(id_utilisateur, current_user)
    count_result = await db.execute(select(func.count(models.Notification.id_notification)).filter(
        models.Notification.id_utilisateur == id_utilisateur,
        models.Notification.lu == False
    ))
    count = count_result.scalar_one_or_none()
    return {"count": count if count is not None else 0}

@router.put("/notifications/{id_notification}/lire", response_model=Schemas.NotificationRead)
async def marquer_notification_lu(
    id_notification: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Marque une notification comme lue."""
    result = await db.execute(select(models.Notification).filter(models.Notification.id_notification == id_notification))
    db_notif = result.scalar_one_or_none()
    if not db_notif:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    ensure_same_user_or_admin(db_notif.id_utilisateur, current_user)
    
    db_notif.lu = True # type: ignore
    await db.commit()
    await db.refresh(db_notif)
    return db_notif
