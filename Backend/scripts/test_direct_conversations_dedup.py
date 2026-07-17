import os
import sys
import asyncio

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import SessionLocal
from Backend import models, Schemas
from Backend.modules.messages.routes import creer_conversation
from sqlalchemy import text

TEST_USER_A = "test_dedup_a@taskmanager.com"
TEST_USER_B = "test_dedup_b@taskmanager.com"

async def test_deduplication():
    print("Testing direct conversation deduplication...")
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

        # Création de la première conversation
        conv_create1 = Schemas.ConversationCreate(
            nom="Discussion",
            type="direct",
            participant_ids=[user_a.id, user_b.id]
        )
        
        conv1 = await creer_conversation(conv_create1, db, user_a)
        print(f"Created first conversation ID: {conv1.id_conversation}")

        # Demande de création d'une deuxième conversation avec les mêmes participants
        conv_create2 = Schemas.ConversationCreate(
            nom="Autre discussion",
            type="direct",
            participant_ids=[user_a.id, user_b.id]
        )
        conv2 = await creer_conversation(conv_create2, db, user_a)
        print(f"Requested second conversation, returned ID: {conv2.id_conversation}")

        assert conv1.id_conversation == conv2.id_conversation, "Deduplication failed: created two conversations instead of returning the existing one!"
        print("  [OK] Deduplication successful. The existing conversation was returned.")

        # Nettoyage
        await db.execute(text("DELETE FROM conversation_participants WHERE id_utilisateur IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.execute(text("DELETE FROM conversations WHERE id_conversation = :cid"), {"cid": conv1.id_conversation})
        await db.execute(text("DELETE FROM users WHERE id IN (:u1, :u2)"), {"u1": user_a.id, "u2": user_b.id})
        await db.commit()
        
    print("Deduplication tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_deduplication())
