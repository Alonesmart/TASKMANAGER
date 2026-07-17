import os
import sys
import asyncio

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import SessionLocal
from Backend import models, Schemas
from Backend.modules.messages.routes import (
    creer_conversation, envoyer_message, supprimer_conversation, modifier_message
)
from sqlalchemy import text

TEST_USER_A = "test_edit_a@taskmanager.com"
TEST_USER_B = "test_edit_b@taskmanager.com"

async def test_flow():
    print("Testing delete conversation and edit message logic...")
    async with SessionLocal() as db:
        # Nettoyage
        await db.execute(text("DELETE FROM conversation_participants WHERE id_utilisateur IN (SELECT id FROM users WHERE email IN (:u1, :u2))"), {"u1": TEST_USER_A, "u2": TEST_USER_B})
        await db.execute(text("DELETE FROM users WHERE email IN (:u1, :u2)"), {"u1": TEST_USER_A, "u2": TEST_USER_B})
        await db.commit()

        # Création des utilisateurs
        user_a = models.User(nom="User A", email=TEST_USER_A, motdepasse="pass", role="personnel", actif=True)
        user_b = models.User(nom="User B", email=TEST_USER_B, motdepasse="pass", role="personnel", actif=True)
        db.add(user_a)
        db.add(user_b)
        await db.commit()
        await db.refresh(user_a)
        await db.refresh(user_b)

        # Création d'une conversation
        conv_create = Schemas.ConversationCreate(
            nom="Direct Chat",
            type="direct",
            participant_ids=[user_a.id, user_b.id]
        )
        conv = await creer_conversation(conv_create, db, user_a)
        print(f"Created conversation ID: {conv.id_conversation}")

        # Envoi d'un message par User A
        msg_in = Schemas.MessageCreate(
            contenu="Message initial",
            type_conversation="direct",
            id_conversation=conv.id_conversation,
            id_expediteur=user_a.id
        )
        msg = await envoyer_message(msg_in, db, user_a)
        print(f"User A sent message (ID={msg.id_message}): '{msg.contenu}'")

        # Modification du message par User A
        msg_update = Schemas.MessageUpdate(contenu="Message modifié par A")
        updated_msg = await modifier_message(msg.id_message, msg_update, db, user_a)
        print(f"User A updated message (ID={updated_msg.id_message}) to: '{updated_msg.contenu}'")
        assert updated_msg.contenu == "Message modifié par A"
        print("  [OK] Message content updated successfully.")

        # Tentative de modification du message par User B (doit échouer)
        try:
            await modifier_message(msg.id_message, msg_update, db, user_b)
            raise AssertionError("User B was able to modify User A's message!")
        except Exception as e:
            print(f"  [OK] Modification by other user rejected correctly: {e}")

        # Suppression de la conversation par User A
        res = await supprimer_conversation(conv.id_conversation, db, user_a)
        print(f"Deleted conversation, result: {res}")

        # Vérifier que la conversation et le message n'existent plus
        conv_check = await db.execute(text("SELECT * FROM conversations WHERE id_conversation = :cid"), {"cid": conv.id_conversation})
        assert conv_check.scalar_one_or_none() is None
        print("  [OK] Conversation removed from database.")

        msg_check = await db.execute(text("SELECT * FROM messages WHERE id_message = :mid"), {"mid": msg.id_message})
        assert msg_check.scalar_one_or_none() is None
        print("  [OK] Cascade deletion: message removed from database.")

        # Nettoyage final
        await db.execute(text("DELETE FROM users WHERE id IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.commit()
        
    print("Delete/Edit integration tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_flow())
