from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Dict, Optional
from ...database import get_db, SECRET_KEY, ALGORITHM
from ... import models, Schemas
from datetime import datetime
from ..auth import get_current_user
from jose import JWTError, jwt
import re

router = APIRouter(prefix="/api/v1/comm", tags=["Module Messagerie & Alertes"])

# --- WEBSOCKET CONNECTION MANAGER ---

class ConnectionManager:
    def __init__(self):
        # Maps user_id to their active WebSocket connection
        self.active_connections: Dict[int, WebSocket] = {}
        self.user_active_conversations: Dict[int, int] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_active_conversations:
            del self.user_active_conversations[user_id]

    def set_user_active_conversation(self, user_id: int, conv_id: Optional[int]):
        if conv_id is not None:
            self.user_active_conversations[user_id] = conv_id
        elif user_id in self.user_active_conversations:
            del self.user_active_conversations[user_id]

    def is_user_in_conversation(self, user_id: int, conv_id: int) -> bool:
        return self.user_active_conversations.get(user_id) == conv_id

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
    print(f"[DEBUG] WebSocket connection attempt for user_id: {user_id}")
    user = None
    
    # 1. Tenter de récupérer le token depuis le paramètre de requête
    if token:
        print(f"[DEBUG] Token found in query params: {token[:10]}...")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                result = await db.execute(select(models.User).filter(models.User.email == email))
                user = result.scalar_one_or_none()
        except JWTError as e:
            print(f"[DEBUG] JWT decode error from query param: {e}")
            pass

    # 2. Tenter de récupérer depuis l'en-tête Authorization (si disponible)
    if not user:
        auth_header = websocket.headers.get("authorization")
        print(f"[DEBUG] Authorization header: {auth_header}")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(bearer_token, SECRET_KEY, algorithms=[ALGORITHM])
                email = payload.get("sub")
                if email:
                    result = await db.execute(select(models.User).filter(models.User.email == email))
                    user = result.scalar_one_or_none()
            except JWTError as e:
                print(f"[DEBUG] JWT decode error from auth header: {e}")
                pass

    # Validation d'identité et de statut
    print(f"[DEBUG] User authenticated: {user.email if user else 'None'}")
    if user:
        print(f"[DEBUG] User validation checks: user.id={user.id}, requested_user_id={user_id}, user.role={user.role}, user.actif={user.actif}")
    
    if not user or (user.id != user_id and user.role != "admin") or not user.actif:
        print(f"[DEBUG] WebSocket connection rejected. Closing with 1008.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    print(f"[DEBUG] WebSocket connection accepted for user: {user.email}")

    # Mettre à jour le statut "en ligne" dans la base de données
    try:
        user.en_ligne = True
        await db.commit()
        # Diffuser le statut en ligne aux autres utilisateurs connectés
        presence_payload = {
            "type": "PRESENCE_STATUS",
            "id_utilisateur": user_id,
            "en_ligne": True
        }
        for member_id, conn in list(manager.active_connections.items()):
            if member_id != user_id:
                try:
                    await conn.send_json(presence_payload)
                except Exception:
                    pass
    except Exception as e:
        print("Error setting user online:", e)

    await manager.connect(user_id, websocket)

    # Mettre à jour les messages non distribués destinés à cet utilisateur
    try:
        conv_ids_query = select(models.ConversationParticipant.id_conversation).where(
            models.ConversationParticipant.id_utilisateur == user_id
        )
        conv_ids_res = await db.execute(conv_ids_query)
        conv_ids = [r[0] for r in conv_ids_res.all()]
        
        if conv_ids:
            undelivered_query = select(models.Message).where(
                models.Message.id_conversation.in_(conv_ids),
                models.Message.id_expediteur != user_id,
                models.Message.statut == "envoye"
            )
            undelivered_res = await db.execute(undelivered_query)
            undelivered_messages = undelivered_res.scalars().all()
            
            for msg in undelivered_messages:
                msg.statut = "distribue"
                if msg.id_expediteur in manager.active_connections:
                    status_payload = {
                        "type": "MESSAGE_STATUS_UPDATE",
                        "id_message": msg.id_message,
                        "id_conversation": msg.id_conversation,
                        "statut": "distribue"
                    }
                    try:
                        await manager.active_connections[msg.id_expediteur].send_json(status_payload)
                    except Exception:
                        pass
            if undelivered_messages:
                await db.commit()
    except Exception as e:
        print("Error updating messages status to distribue on connect:", e)

    try:
        while True:
            # Recevoir et traiter les messages JSON du client (frappe, etc.)
            try:
                data = await websocket.receive_json()
                event_type = data.get("type")
                if event_type == "typing":
                    conv_id = data.get("id_conversation")
                    is_typing = data.get("is_typing", False)
                    payload = {
                        "type": "TYPING_STATUS",
                        "id_conversation": conv_id,
                        "id_utilisateur": user_id,
                        "is_typing": is_typing
                    }
                    for member_id, conn in list(manager.active_connections.items()):
                        if member_id != user_id:
                            try:
                                await conn.send_json(payload)
                            except Exception:
                                pass
                elif event_type == "enter_conversation":
                    conv_id = data.get("id_conversation")
                    if conv_id:
                        manager.set_user_active_conversation(user_id, int(conv_id))
                elif event_type == "leave_conversation":
                    manager.set_user_active_conversation(user_id, None)
            except ValueError:
                # Gérer le cas où le message n'est pas un JSON valide (receive_json lève une exception)
                await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        # Mettre à jour le statut "hors ligne" et la date de dernière connexion
        try:
            user.en_ligne = False
            user.derniere_connexion = datetime.utcnow()
            await db.commit()
            # Diffuser le statut hors ligne aux autres utilisateurs connectés
            presence_payload = {
                "type": "PRESENCE_STATUS",
                "id_utilisateur": user_id,
                "en_ligne": False,
                "derniere_connexion": user.derniere_connexion.isoformat() if user.derniere_connexion else None
            }
            for member_id, conn in list(manager.active_connections.items()):
                if member_id != user_id:
                    try:
                        await conn.send_json(presence_payload)
                    except Exception:
                        pass
        except Exception as e:
            print("Error setting user offline:", e)

# --- SECTION MESSAGERIE ---
@router.post("/conversations", response_model=Schemas.ConversationOut, status_code=status.HTTP_201_CREATED)
async def creer_conversation(
    conv_in: Schemas.ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Si la conversation est directe, vérifier si une existe déjà entre les deux participants
    if conv_in.type == "direct":
        # Extraire le destinataire (qui doit être différent de current_user, sauf s'il s'écrit à lui-même)
        other_user_ids = [pid for pid in conv_in.participant_ids if pid != current_user.id]
        other_user_id = other_user_ids[0] if other_user_ids else current_user.id
        target_ids = list(set([current_user.id, other_user_id]))
        
        # Chercher la conversation directe contenant exactement ces participants
        existing_query = (
            select(models.Conversation.id_conversation)
            .join(models.ConversationParticipant)
            .where(
                models.Conversation.type == "direct",
                models.ConversationParticipant.id_utilisateur.in_(target_ids)
            )
            .group_by(models.Conversation.id_conversation)
            .having(func.count(models.ConversationParticipant.id_utilisateur) == len(target_ids))
        )
        existing_res = await db.execute(existing_query)
        existing_id = existing_res.scalar_one_or_none()
        
        if existing_id:
            # Récupérer et retourner la conversation existante
            result = await db.execute(
                select(models.Conversation)
                .where(models.Conversation.id_conversation == existing_id)
                .options(
                    selectinload(models.Conversation.participants)
                    .selectinload(models.ConversationParticipant.utilisateur)
                )
            )
            return result.scalar_one()

    # Créer la conversation
    new_conv = models.Conversation(
        nom=conv_in.nom,
        type=conv_in.type,
        id_admin=current_user.id if conv_in.type == "groupe" else None,
        avatar=conv_in.avatar if conv_in.type == "groupe" else None,
        date_creation=datetime.utcnow()
    )
    db.add(new_conv)
    await db.flush()  # Pour obtenir l'id_conversation

    # Ajouter les participants (en s'assurant que le créateur est inclus)
    participants_set = set(conv_in.participant_ids)
    participants_set.add(current_user.id)

    for p_id in participants_set:
        participant = models.ConversationParticipant(
            id_conversation=new_conv.id_conversation,
            id_utilisateur=p_id
        )
        db.add(participant)
    
    await db.commit()
    result = await db.execute(
        select(models.Conversation)
        .where(models.Conversation.id_conversation == new_conv.id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    return result.scalar_one()

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
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    result = await db.execute(query)
    conversations = result.scalars().all()

    for conv in conversations:
        # Récupérer le dernier message
        last_msg_query = (
            select(models.Message)
            .where(models.Message.id_conversation == conv.id_conversation)
            .order_by(desc(models.Message.date_envoi))
            .limit(1)
        )
        last_msg_res = await db.execute(last_msg_query)
        conv.last_message = last_msg_res.scalar_one_or_none()

        # Compter les messages non lus
        unread_query = (
            select(func.count(models.Message.id_message))
            .where(
                models.Message.id_conversation == conv.id_conversation,
                models.Message.id_expediteur != current_user.id,
                models.Message.statut != "lu"
            )
        )
        unread_res = await db.execute(unread_query)
        conv.unread_count = unread_res.scalar_one() or 0

    return conversations

@router.get("/conversations/{id_conversation}", response_model=Schemas.ConversationOut)
async def recuperer_conversation(
    id_conversation: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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

    query = (
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    last_msg_query = (
        select(models.Message)
        .where(models.Message.id_conversation == id_conversation)
        .order_by(desc(models.Message.date_envoi))
        .limit(1)
    )
    last_msg_res = await db.execute(last_msg_query)
    conv.last_message = last_msg_res.scalar_one_or_none()

    unread_query = (
        select(func.count(models.Message.id_message))
        .where(
            models.Message.id_conversation == id_conversation,
            models.Message.id_expediteur != current_user.id,
            models.Message.statut != "lu"
        )
    )
    unread_res = await db.execute(unread_query)
    conv.unread_count = unread_res.scalar_one() or 0

    return conv

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
        .options(selectinload(models.Message.expediteur))
        .order_by(models.Message.date_envoi.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()

async def create_or_update_chat_notification(
    db: AsyncSession,
    id_conversation: int,
    id_utilisateur: int,
    sender_name: str,
    conv_name: str,
    is_group: bool
):
    # Check if there is an unread notification for this user & conversation
    query = select(models.Notification).where(
        models.Notification.id_utilisateur == id_utilisateur,
        models.Notification.id_conversation == id_conversation,
        models.Notification.lu == False
    )
    result = await db.execute(query)
    existing_notif = result.scalar_one_or_none()

    if existing_notif:
        # Regroup and update message
        msg_text = existing_notif.message
        if is_group:
            match = re.match(r"^(\d+) nouveaux messages dans (.+)$", msg_text)
            if match:
                count = int(match.group(1)) + 1
                existing_notif.message = f"{count} nouveaux messages dans {match.group(2)}"
            else:
                existing_notif.message = f"2 nouveaux messages dans {conv_name}"
        else:
            match = re.match(r"^(\d+) nouveaux messages de (.+)$", msg_text)
            if match:
                count = int(match.group(1)) + 1
                existing_notif.message = f"{count} nouveaux messages de {match.group(2)}"
            else:
                existing_notif.message = f"2 nouveaux messages de {sender_name}"
        existing_notif.date_envoi = datetime.utcnow()
        db_notif = existing_notif
    else:
        # Create a new notification
        if is_group:
            msg_text = f"Nouveau message de {sender_name} dans {conv_name}"
        else:
            msg_text = f"Nouveau message de {sender_name}"
        db_notif = models.Notification(
            message=msg_text,
            lu=False,
            date_envoi=datetime.utcnow(),
            id_utilisateur=id_utilisateur,
            id_conversation=id_conversation
        )
        db.add(db_notif)

    await db.commit()
    await db.refresh(db_notif)

    # Push notification to the user in real-time over WebSocket if online
    if id_utilisateur in manager.active_connections:
        notif_payload = {
            "type": "NEW_NOTIFICATION",
            "id_notification": db_notif.id_notification,
            "message": db_notif.message,
            "lu": db_notif.lu,
            "date_envoi": db_notif.date_envoi.isoformat(),
            "id_utilisateur": db_notif.id_utilisateur,
            "id_conversation": db_notif.id_conversation
        }
        try:
            await manager.active_connections[id_utilisateur].send_json(notif_payload)
        except Exception:
            pass

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
    await db.refresh(db_msg, ["expediteur"])

    # Vérifier si un autre participant est connecté (en ligne)
    participants_result = await db.execute(
        select(models.ConversationParticipant.id_utilisateur)
        .where(
            models.ConversationParticipant.id_conversation == db_msg.id_conversation,
            models.ConversationParticipant.id_utilisateur != db_msg.id_expediteur
        )
    )
    other_ids = [r[0] for r in participants_result.all()]
    any_connected = any(uid in manager.active_connections for uid in other_ids)
    if any_connected:
        db_msg.statut = "distribue"
        await db.commit()
        await db.refresh(db_msg, ["expediteur"])

    message_payload = {
        "type": "NEW_MESSAGE",
        "id_message": db_msg.id_message,
        "contenu": db_msg.contenu,
        "type_conversation": db_msg.type_conversation,
        "id_expediteur": db_msg.id_expediteur,
        "id_ia": db_msg.id_ia,
        "id_conversation": db_msg.id_conversation,
        "date_envoi": db_msg.date_envoi.isoformat(),
        "lu": db_msg.lu,
        "statut": db_msg.statut,
        "expediteur": {
            "id": db_msg.expediteur.id,
            "nom": db_msg.expediteur.nom,
            "email": db_msg.expediteur.email,
            "role": db_msg.expediteur.role,
            "en_ligne": getattr(db_msg.expediteur, "en_ligne", False),
            "derniere_connexion": db_msg.expediteur.derniere_connexion.isoformat() if getattr(db_msg.expediteur, "derniere_connexion", None) else None
        } if db_msg.expediteur else None
    }
    await manager.broadcast(message_payload)

    # --- GENERATION DE NOTIFICATIONS MESSAGERIE ---
    # 1. Récupérer les détails de la conversation
    conv_query = select(models.Conversation).where(models.Conversation.id_conversation == db_msg.id_conversation)
    conv_res = await db.execute(conv_query)
    conversation = conv_res.scalar_one_or_none()

    if conversation:
        # 2. Récupérer les participants
        part_query = select(models.ConversationParticipant).where(
            models.ConversationParticipant.id_conversation == db_msg.id_conversation,
            models.ConversationParticipant.id_utilisateur != db_msg.id_expediteur
        )
        part_res = await db.execute(part_query)
        participants = part_res.scalars().all()

        sender_name = db_msg.expediteur.nom if db_msg.expediteur else "Quelqu'un"
        is_group = conversation.type == "groupe"

        for participant in participants:
            p_id = participant.id_utilisateur
            # Si le participant n'est pas en train de consulter activement cette discussion
            if not manager.is_user_in_conversation(p_id, db_msg.id_conversation):
                conv_display_name = conversation.nom or "Groupe" if is_group else sender_name
                await create_or_update_chat_notification(
                    db=db,
                    id_conversation=db_msg.id_conversation,
                    id_utilisateur=p_id,
                    sender_name=sender_name,
                    conv_name=conv_display_name,
                    is_group=is_group
                )

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
        
    # Vérifier la participation
    check_query = (
        select(models.ConversationParticipant)
        .where(
            models.ConversationParticipant.id_conversation == db_msg.id_conversation,
            models.ConversationParticipant.id_utilisateur == current_user.id
        )
    )
    check_result = await db.execute(check_query)
    if not check_result.scalar_one_or_none() and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé à ce message")
    
    db_msg.lu = True # type: ignore
    db_msg.statut = "lu"
    await db.commit()
    await db.refresh(db_msg)

    # Notifier l'expéditeur via websocket
    if db_msg.id_expediteur in manager.active_connections:
        status_payload = {
            "type": "MESSAGE_STATUS_UPDATE",
            "id_message": db_msg.id_message,
            "id_conversation": db_msg.id_conversation,
            "statut": "lu"
        }
        try:
            await manager.active_connections[db_msg.id_expediteur].send_json(status_payload)
        except Exception:
            pass

    return db_msg

@router.put("/conversations/{id_conversation}/lire", status_code=status.HTTP_200_OK)
async def marquer_conversation_lue(
    id_conversation: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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

    query = select(models.Message).where(
        models.Message.id_conversation == id_conversation,
        models.Message.id_expediteur != current_user.id,
        models.Message.statut != "lu"
    )
    result = await db.execute(query)
    unread_messages = result.scalars().all()

    for msg in unread_messages:
        msg.lu = True
        msg.statut = "lu"
        if msg.id_expediteur in manager.active_connections:
            status_payload = {
                "type": "MESSAGE_STATUS_UPDATE",
                "id_message": msg.id_message,
                "id_conversation": id_conversation,
                "statut": "lu"
            }
            try:
                await manager.active_connections[msg.id_expediteur].send_json(status_payload)
            except Exception:
                pass
                
    # Mark related notifications as read
    notif_query = select(models.Notification).where(
        models.Notification.id_utilisateur == current_user.id,
        models.Notification.id_conversation == id_conversation,
        models.Notification.lu == False
    )
    notif_result = await db.execute(notif_query)
    unread_notifications = notif_result.scalars().all()
    for notif in unread_notifications:
        notif.lu = True

    if unread_messages or unread_notifications:
        await db.commit()
        
    return {"message": f"{len(unread_messages)} messages et {len(unread_notifications)} notifications marqués comme lus"}

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


# --- SECTION GESTION DES GROUPES ---

@router.put("/conversations/{id_conversation}", response_model=Schemas.ConversationOut)
async def modifier_groupe(
    id_conversation: int,
    conv_update: Schemas.ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = (
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conv.type != "groupe":
        raise HTTPException(status_code=400, detail="Seules les conversations de groupe peuvent être modifiées")
        
    if conv.id_admin != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul l'administrateur du groupe peut modifier ses informations")
        
    if conv_update.nom is not None:
        conv.nom = conv_update.nom
    if conv_update.avatar is not None:
        conv.avatar = conv_update.avatar
        
    await db.commit()
    await db.refresh(conv)
    return conv


@router.post("/conversations/{id_conversation}/participants", response_model=Schemas.ConversationOut)
async def ajouter_membres_groupe(
    id_conversation: int,
    data: Schemas.GroupParticipantsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = (
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
    if conv.type != "groupe":
        raise HTTPException(status_code=400, detail="Impossible d'ajouter des participants à une conversation directe")
        
    if conv.id_admin != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul l'administrateur du groupe peut ajouter des membres")
        
    existing_participant_ids = {p.id_utilisateur for p in conv.participants}
    
    new_ids = set(data.participant_ids) - existing_participant_ids
    if not new_ids:
        return conv
        
    users_result = await db.execute(select(models.User.id).where(models.User.id.in_(new_ids)))
    valid_new_ids = users_result.scalars().all()
    
    for u_id in valid_new_ids:
        participant = models.ConversationParticipant(
            id_conversation=id_conversation,
            id_utilisateur=u_id
        )
        db.add(participant)
        
    await db.commit()
    db.expire(conv)
    
    result = await db.execute(
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    return result.scalar_one()


@router.delete("/conversations/{id_conversation}/participants/{id_utilisateur}", response_model=Schemas.ConversationOut)
async def retirer_membre_groupe(
    id_conversation: int,
    id_utilisateur: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = (
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
    if conv.type != "groupe":
        raise HTTPException(status_code=400, detail="Impossible de retirer des participants d'une conversation directe")
        
    is_admin = conv.id_admin == current_user.id or current_user.role == "admin"
    is_self = current_user.id == id_utilisateur
    
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Vous n'avez pas l'autorisation de retirer ce membre")
        
    part_query = select(models.ConversationParticipant).where(
        models.ConversationParticipant.id_conversation == id_conversation,
        models.ConversationParticipant.id_utilisateur == id_utilisateur
    )
    part_res = await db.execute(part_query)
    participant = part_res.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Ce participant ne fait pas partie du groupe")
        
    if conv.id_admin == id_utilisateur and is_self:
        other_participants = [p for p in conv.participants if p.id_utilisateur != id_utilisateur]
        if other_participants:
            conv.id_admin = other_participants[0].id_utilisateur
        else:
            conv.id_admin = None
            
    await db.delete(participant)
    await db.commit()
    db.expire(conv)
    
    result = await db.execute(
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    return result.scalar_one()


@router.put("/conversations/{id_conversation}/admin", response_model=Schemas.ConversationOut)
async def modifier_admin_groupe(
    id_conversation: int,
    data: Schemas.GroupAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = (
        select(models.Conversation)
        .where(models.Conversation.id_conversation == id_conversation)
        .options(
            selectinload(models.Conversation.participants)
            .selectinload(models.ConversationParticipant.utilisateur)
        )
    )
    result = await db.execute(query)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
    if conv.type != "groupe":
        raise HTTPException(status_code=400, detail="Impossible de modifier l'admin d'une conversation directe")
        
    if conv.id_admin != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul l'administrateur du groupe peut désigner un nouvel admin")
        
    participant_ids = {p.id_utilisateur for p in conv.participants}
    if data.id_admin not in participant_ids:
        raise HTTPException(status_code=400, detail="Le nouvel administrateur doit être un membre actuel du groupe")
        
    conv.id_admin = data.id_admin
    await db.commit()
    await db.refresh(conv)
    return conv


# --- ROUTE SUPPRIMER CONVERSATION ---
@router.delete("/conversations/{id_conversation}", status_code=status.HTTP_200_OK)
async def supprimer_conversation(
    id_conversation: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Conversation).where(models.Conversation.id_conversation == id_conversation))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
    is_part_query = select(models.ConversationParticipant).where(
        models.ConversationParticipant.id_conversation == id_conversation,
        models.ConversationParticipant.id_utilisateur == current_user.id
    )
    is_part_res = await db.execute(is_part_query)
    is_participant = is_part_res.scalar_one_or_none() is not None
    
    if not is_participant and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
        
    if conv.type == "groupe" and conv.id_admin != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul l'administrateur du groupe peut le supprimer")
        
    await db.delete(conv)
    await db.commit()
    
    deletion_payload = {
        "type": "CONVERSATION_DELETED",
        "id_conversation": id_conversation
    }
    await manager.broadcast(deletion_payload)
    return {"message": "Conversation supprimée avec succès"}


# --- ROUTE MODIFIER MESSAGE ---
@router.put("/messages/{id_message}", response_model=Schemas.MessageRead)
async def modifier_message(
    id_message: int,
    msg_update: Schemas.MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(
        select(models.Message)
        .where(models.Message.id_message == id_message)
        .options(selectinload(models.Message.expediteur))
    )
    db_msg = result.scalar_one_or_none()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
        
    if db_msg.id_expediteur != current_user.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres messages")
        
    db_msg.contenu = msg_update.contenu
    await db.commit()
    await db.refresh(db_msg, ["expediteur"])
    
    update_payload = {
        "type": "MESSAGE_UPDATE",
        "id_message": db_msg.id_message,
        "id_conversation": db_msg.id_conversation,
        "contenu": db_msg.contenu
    }
    await manager.broadcast(update_payload)
    return db_msg


