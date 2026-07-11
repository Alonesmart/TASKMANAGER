from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Dict, Optional
from ...database import get_db, SECRET_KEY, ALGORITHM
from ... import models, Schemas
from datetime import datetime
from ..auth import get_current_user
from jose import JWTError, jwt

router = APIRouter(prefix="/api/v1/comm", tags=["Module Messagerie & Alertes"])

# --- WEBSOCKET CONNECTION MANAGER ---

class ConnectionManager:
    def __init__(self):
        # Maps user_id to their active WebSocket connection
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

# --- HELPERS ---

def ensure_same_user_or_admin(requested_user_id: int, current_user: models.User):
    if requested_user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ces données")

# --- WEBSOCKET ENDPOINT ---

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    user = None
    
    # 1. Tenter de récupérer le token depuis le paramètre de requête
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                result = await db.execute(select(models.User).filter(models.User.email == email))
                user = result.scalar_one_or_none()
        except JWTError:
            pass

    # 2. Tenter de récupérer depuis l'en-tête Authorization (si disponible)
    if not user:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(bearer_token, SECRET_KEY, algorithms=[ALGORITHM])
                email = payload.get("sub")
                if email:
                    result = await db.execute(select(models.User).filter(models.User.email == email))
                    user = result.scalar_one_or_none()
            except JWTError:
                pass

    # Validation d'identité et de statut
    if not user or (user.id != user_id and user.role != "admin") or not user.actif:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# --- SECTION MESSAGERIE ---
@router.post("/conversations", response_model=Schemas.ConversationOut, status_code=status.HTTP_201_CREATED)
async def creer_conversation(
    conv_in: Schemas.ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Créer la conversation
    new_conv = models.Conversation(
        nom=conv_in.nom,
        type=conv_in.type,
        date_creation=datetime.utcnow()
    )
    db.add(new_conv)
    await db.flush()  # Pour obtenir l'id_conversation

    # Ajouter les participants
    for p_id in conv_in.participant_ids:
        participant = models.ConversationParticipant(
            id_conversation=new_conv.id_conversation,
            id_utilisateur=p_id
        )
        db.add(participant)
    
    await db.commit()
    await db.refresh(new_conv)
    return new_conv

@router.get("/conversations/me", response_model=List[Schemas.ConversationOut])
async def lister_mes_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Récupérer les conversations dont l'utilisateur est participant
    query = (
        select(models.Conversation)
        .join(models.ConversationParticipant)
        .where(models.ConversationParticipant.id_utilisateur == current_user.id)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/conversations/{id_conversation}/messages", response_model=List[Schemas.MessageRead])
async def recuperer_messages_conversation(
    id_conversation: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Vérifier que l'utilisateur appartient à la conversation
    check_query = (
        select(models.ConversationParticipant)
        .where(
            models.ConversationParticipant.id_conversation == id_conversation,
            models.ConversationParticipant.id_utilisateur == current_user.id
        )
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none() and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé à cette conversation")

    # Récupérer les messages
    query = (
        select(models.Message)
        .where(models.Message.id_conversation == id_conversation)
        .order_by(models.Message.date_envoi.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/messages", response_model=Schemas.MessageRead, status_code=status.HTTP_201_CREATED)
async def envoyer_message(
    msg_in: Schemas.MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_msg = models.Message(
        contenu=msg_in.contenu,
        type_conversation=msg_in.type_conversation,
        id_expediteur=msg_in.id_expediteur or current_user.id,
        id_ia=msg_in.id_assistant,
        id_conversation=msg_in.id_conversation,
        date_envoi=datetime.utcnow()
    )
    db.add(db_msg) # type: ignore
    await db.commit()
    await db.refresh(db_msg)

    message_payload = {
        "type": "NEW_MESSAGE",
        "id_message": db_msg.id_message,
        "contenu": db_msg.contenu,
        "type_conversation": db_msg.type_conversation,
        "id_expediteur": db_msg.id_expediteur,
        "id_ia": db_msg.id_ia,
        "id_conversation": db_msg.id_conversation,
        "date_envoi": db_msg.date_envoi.isoformat(),
        "lu": db_msg.lu
    }
    await manager.broadcast(message_payload)
    return db_msg

@router.get("/messages/conversations", response_model=List[Schemas.MessageRead])
async def recuperer_historique(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Message).order_by(desc(models.Message.date_envoi)))
    return result.scalars().all()

@router.put("/messages/{id_message}/lire", response_model=Schemas.MessageRead)
async def marquer_message_lu(
    id_message: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Message).filter(models.Message.id_message == id_message))
    db_msg = result.scalar_one_or_none()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    ensure_same_user_or_admin(db_msg.id_expediteur, current_user)
    
    db_msg.lu = True # type: ignore
    await db.commit()
    await db.refresh(db_msg)

    await manager.broadcast({
        "type": "MESSAGE_READ",
        "id_message": id_message
    })
    return db_msg

# --- SECTION NOTIFICATIONS ---

@router.get("/notifications/utilisateur/{id_utilisateur}", response_model=List[Schemas.NotificationRead])
async def lister_notifications(
    id_utilisateur: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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
    result = await db.execute(select(models.Notification).filter(models.Notification.id_notification == id_notification))
    db_notif = result.scalar_one_or_none()
    if not db_notif:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    ensure_same_user_or_admin(db_notif.id_utilisateur, current_user)
    
    db_notif.lu = True # type: ignore
    await db.commit()
    await db.refresh(db_notif)

    await manager.broadcast({
        "type": "NOTIFICATION_READ",
        "id_notification": id_notification
    })
    return db_notif


async def create_and_send_notification(
    db: AsyncSession,
    message: str,
    id_utilisateur: int,
    id_tache: Optional[int] = None
) -> models.Notification:
    db_notif = models.Notification(
        message=message,
        id_utilisateur=id_utilisateur,
        id_tache=id_tache,
        date_envoi=datetime.utcnow(),
        lu=False
    )
    db.add(db_notif)
    await db.flush()

    notif_payload = {
        "type": "NEW_NOTIFICATION",
        "id_notification": db_notif.id_notification,
        "message": db_notif.message,
        "lu": db_notif.lu,
        "date_envoi": db_notif.date_envoi.isoformat(),
        "id_utilisateur": db_notif.id_utilisateur,
        "id_tache": db_notif.id_tache
    }
    await manager.send_personal_message(notif_payload, id_utilisateur)
    return db_notif

