import os
import sys
import asyncio
import re

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from datetime import datetime
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models, Schemas
from Backend.modules.messages.routes import (
    creer_conversation, envoyer_message, marquer_conversation_lue, manager
)

TEST_USER_A = "test_notif_a@taskmanager.com"
TEST_USER_B = "test_notif_b@taskmanager.com"

async def test_chat_notifications_flow():
    print("Starting M7 Chat Notifications Integration Tests...")
    
    async with SessionLocal() as db:
        # 1. Nettoyage de sécurité
        await db.execute(text("DELETE FROM notifications WHERE id_utilisateur IN (SELECT id FROM users WHERE email IN (:u1, :u2))"), {"u1": TEST_USER_A, "u2": TEST_USER_B})
        await db.execute(text("DELETE FROM messages WHERE id_expediteur IN (SELECT id FROM users WHERE email IN (:u1, :u2))"), {"u1": TEST_USER_A, "u2": TEST_USER_B})
        await db.execute(text("DELETE FROM conversation_participants WHERE id_utilisateur IN (SELECT id FROM users WHERE email IN (:u1, :u2))"), {"u1": TEST_USER_A, "u2": TEST_USER_B})
        await db.execute(text("DELETE FROM users WHERE email IN (:u1, :u2)"), {"u1": TEST_USER_A, "u2": TEST_USER_B})
        await db.commit()

        # 2. Création des utilisateurs
        user_a = models.User(nom="User A", email=TEST_USER_A, motdepasse="pass123", role="personnel", actif=True)
        user_b = models.User(nom="User B", email=TEST_USER_B, motdepasse="pass123", role="personnel", actif=True)
        db.add(user_a)
        db.add(user_b)
        await db.commit()
        await db.refresh(user_a)
        await db.refresh(user_b)

        print(f"Created users: {user_a.nom} (ID={user_a.id}), {user_b.nom} (ID={user_b.id})")

        # 3. Création d'une conversation directe
        conv_create = Schemas.ConversationCreate(
            nom="Direct Chat",
            type="direct",
            participant_ids=[user_a.id, user_b.id]
        )
        conv = await creer_conversation(conv_create, db, user_a)
        print(f"Created conversation (ID={conv.id_conversation})")

        # 4. Simulation : User A envoie un message alors que User B n'est pas dans la discussion
        # B est hors-ligne et n'a pas déclaré être dans la discussion.
        msg_in = Schemas.MessageCreate(
            contenu="Hello User B!",
            type_conversation="direct",
            id_conversation=conv.id_conversation,
            id_expediteur=user_a.id
        )
        print("User A sends first message...")
        msg1 = await envoyer_message(msg_in, db, user_a)

        # Vérification qu'une notification a été créée pour B
        notif_query = select(models.Notification).where(
            models.Notification.id_utilisateur == user_b.id,
            models.Notification.id_conversation == conv.id_conversation
        )
        notif_res = await db.execute(notif_query)
        notifs = notif_res.scalars().all()
        assert len(notifs) == 1, f"Expected 1 notification, found {len(notifs)}"
        assert notifs[0].message == f"Nouveau message de {user_a.nom}", f"Unexpected message: {notifs[0].message}"
        assert notifs[0].lu == False
        print("  [OK] First message triggered correct notification.")

        # 5. User A envoie un second message (Regroupement)
        msg_in2 = Schemas.MessageCreate(
            contenu="How are you?",
            type_conversation="direct",
            id_conversation=conv.id_conversation,
            id_expediteur=user_a.id
        )
        print("User A sends second message...")
        msg2 = await envoyer_message(msg_in2, db, user_a)

        # Vérification du regroupement (toujours 1 seule notification non lue, texte mis à jour)
        notif_res = await db.execute(notif_query)
        notifs = notif_res.scalars().all()
        assert len(notifs) == 1, f"Expected exactly 1 notification (regrouped), found {len(notifs)}"
        assert notifs[0].message == f"2 nouveaux messages de {user_a.nom}", f"Unexpected message: {notifs[0].message}"
        print("  [OK] Second message correctly regrouped under same notification.")

        # 6. User A envoie un troisième message
        msg_in3 = Schemas.MessageCreate(
            contenu="Are you there?",
            type_conversation="direct",
            id_conversation=conv.id_conversation,
            id_expediteur=user_a.id
        )
        print("User A sends third message...")
        msg3 = await envoyer_message(msg_in3, db, user_a)

        notif_res = await db.execute(notif_query)
        notifs = notif_res.scalars().all()
        assert notifs[0].message == f"3 nouveaux messages de {user_a.nom}", f"Unexpected message: {notifs[0].message}"
        print("  [OK] Third message correctly incremented the counter.")

        # 7. Simulation : User B entre dans la discussion (il consulte les messages)
        # Il appelle marquer_conversation_lue
        print("User B reads conversation (marks as read)...")
        await marquer_conversation_lue(conv.id_conversation, db, user_b)

        # Vérification que la notification est maintenant marquée comme lue
        notif_res = await db.execute(notif_query)
        notifs = notif_res.scalars().all()
        assert notifs[0].lu == True, "Expected notification to be marked as read"
        print("  [OK] Notifications successfully marked read when entering conversation.")

        # 8. Nettoyage final
        await db.execute(text("DELETE FROM notifications WHERE id_utilisateur IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.execute(text("DELETE FROM messages WHERE id_expediteur IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.execute(text("DELETE FROM conversation_participants WHERE id_utilisateur IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.execute(text("DELETE FROM conversations WHERE id_conversation = :cid"), {"cid": conv.id_conversation})
        await db.execute(text("DELETE FROM users WHERE id IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.commit()
        
    print("All Phase M7.1 Backend tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_chat_notifications_flow())
