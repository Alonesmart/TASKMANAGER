import asyncio
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.messages.routes import (
    creer_conversation, lister_mes_conversations, envoyer_message,
    recuperer_messages_conversation, marquer_message_lu, lister_notifications,
    compter_notifications_non_lues, marquer_notification_lu
)
from Backend.Schemas import ConversationCreate, MessageCreate
from Backend import models

TEST_USER_EMAIL_1 = "test_msg_user1@taskmanager.com"
TEST_USER_EMAIL_2 = "test_msg_user2@taskmanager.com"

async def clean_db(db):
    emails = [TEST_USER_EMAIL_1, TEST_USER_EMAIL_2]
    
    # Suppression en cascade des messages
    await db.execute(text("""
        DELETE FROM messages 
        WHERE id_expediteur IN (SELECT id FROM users WHERE email IN (:e1, :e2))
    """), {"e1": TEST_USER_EMAIL_1, "e2": TEST_USER_EMAIL_2})
    
    # Suppression des participants
    await db.execute(text("""
        DELETE FROM conversation_participants 
        WHERE id_utilisateur IN (SELECT id FROM users WHERE email IN (:e1, :e2))
    """), {"e1": TEST_USER_EMAIL_1, "e2": TEST_USER_EMAIL_2})

    # Suppression des notifications
    await db.execute(text("""
        DELETE FROM notifications 
        WHERE id_utilisateur IN (SELECT id FROM users WHERE email IN (:e1, :e2))
    """), {"e1": TEST_USER_EMAIL_1, "e2": TEST_USER_EMAIL_2})

    # Suppression des conversations orphelines
    await db.execute(text("""
        DELETE FROM conversations 
        WHERE id_conversation NOT IN (SELECT id_conversation FROM conversation_participants)
    """))

    # Suppression des utilisateurs de test
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.execute(text("DELETE FROM personnels WHERE id NOT IN (SELECT id FROM users)"))
    await db.commit()

async def test_messages_flow():
    # --- ETAPE 1: NETTOYAGE ---
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    # --- ETAPE 2: UTILISATEURS ---
    print("2. Création des utilisateurs de test...")
    async with SessionLocal() as db:
        user1 = models.Personnel(nom="User 1", email=TEST_USER_EMAIL_1, motdepasse="hash", role="personnel", actif=True)
        user2 = models.Personnel(nom="User 2", email=TEST_USER_EMAIL_2, motdepasse="hash", role="personnel", actif=True)
        
        db.add_all([user1, user2])
        await db.commit()
        
        user1_id = user1.id
        user2_id = user2.id

    # --- TEST 1: Création de conversation ---
    print("3. Test de création de conversation...")
    async with SessionLocal() as db:
        user1 = await db.get(models.User, user1_id)
        conv_schema = ConversationCreate(
            nom="Salon de test",
            type="direct",
            participant_ids=[user1_id, user2_id]
        )
        conv = await creer_conversation(conv_in=conv_schema, db=db, current_user=user1)
        assert conv.nom == "Salon de test"
        conv_id = conv.id_conversation
        print("   [OK] Conversation créée avec succès.")

    # --- TEST 2: Mes Conversations ---
    print("4. Test de récupération des conversations de l'utilisateur...")
    async with SessionLocal() as db:
        user1 = await db.get(models.User, user1_id)
        mes_convs = await lister_mes_conversations(db=db, current_user=user1)
        assert len(mes_convs) == 1
        assert mes_convs[0].id_conversation == conv_id
        print("   [OK] Conversations récupérées avec succès.")

    # --- TEST 3: Envoi de message ---
    print("5. Test d'envoi de message...")
    async with SessionLocal() as db:
        user1 = await db.get(models.User, user1_id)
        msg_schema = MessageCreate(
            contenu="Hello User 2 !",
            type_conversation="direct",
            id_expediteur=user1_id,
            id_conversation=conv_id
        )
        msg = await envoyer_message(msg_in=msg_schema, db=db, current_user=user1)
        assert msg.contenu == "Hello User 2 !"
        assert msg.lu == False
        msg_id = msg.id_message
        print("   [OK] Message envoyé avec succès.")

    # --- TEST 4: Récupération des messages ---
    print("6. Test de lecture des messages...")
    async with SessionLocal() as db:
        user2 = await db.get(models.User, user2_id)
        messages = await recuperer_messages_conversation(id_conversation=conv_id, db=db, current_user=user2)
        assert len(messages) == 1
        assert messages[0].id_message == msg_id
        print("   [OK] Messages récupérés avec succès.")

    # --- TEST 5: Message lu ---
    print("7. Test de marquage du message comme lu...")
    async with SessionLocal() as db:
        user1 = await db.get(models.User, user1_id) # expediteur
        updated_msg = await marquer_message_lu(id_message=msg_id, db=db, current_user=user1)
        assert updated_msg.lu == True
        print("   [OK] Message marqué comme lu.")

    # --- TEST 6: Notifications ---
    print("8. Test de création et gestion de notification...")
    async with SessionLocal() as db:
        # Création manuelle d'une notification pour tester les routes
        notif = models.Notification(
            message="Nouvelle tâche assignée",
            lu=False,
            id_utilisateur=user1_id
        )
        db.add(notif)
        await db.commit()
        notif_id = notif.id_notification

    async with SessionLocal() as db:
        user1 = await db.get(models.User, user1_id)
        
        # Compter non lues
        count_res = await compter_notifications_non_lues(id_utilisateur=user1_id, db=db, current_user=user1)
        assert count_res["count"] == 1
        
        # Lister
        notifications = await lister_notifications(id_utilisateur=user1_id, db=db, current_user=user1)
        assert len(notifications) == 1
        assert notifications[0].id_notification == notif_id
        print("   [OK] Notification comptée et listée avec succès.")

    # Marquage lu
    async with SessionLocal() as db:
        user1 = await db.get(models.User, user1_id)
        updated_notif = await marquer_notification_lu(id_notification=notif_id, db=db, current_user=user1)
        assert updated_notif.lu == True
        
        # Vérification compteur
        count_res_after = await compter_notifications_non_lues(id_utilisateur=user1_id, db=db, current_user=user1)
        assert count_res_after["count"] == 0
        print("   [OK] Notification marquée comme lue avec succès.")

    # --- NETTOYAGE ---
    print("9. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module messagerie ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_messages_flow())
