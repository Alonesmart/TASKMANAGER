import os
import sys
import asyncio

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import text, select
from Backend.database import SessionLocal
from Backend.modules.messages.routes import (
    creer_conversation, lister_mes_conversations, envoyer_message,
    recuperer_messages_conversation, modifier_groupe, ajouter_membres_groupe,
    retirer_membre_groupe, modifier_admin_groupe
)
from Backend.Schemas import (
    ConversationCreate, MessageCreate, ConversationUpdate,
    GroupParticipantsUpdate, GroupAdminUpdate
)
from Backend import models

TEST_GROUP_ADMIN = "test_g_admin@taskmanager.com"
TEST_GROUP_MEMBER1 = "test_g_mem1@taskmanager.com"
TEST_GROUP_MEMBER2 = "test_g_mem2@taskmanager.com"

async def clean_db(db):
    emails = [TEST_GROUP_ADMIN, TEST_GROUP_MEMBER1, TEST_GROUP_MEMBER2]
    
    # Cascade delete messages
    await db.execute(text("""
        DELETE FROM messages 
        WHERE id_expediteur IN (SELECT id FROM users WHERE email IN (:e1, :e2, :e3))
    """), {"e1": TEST_GROUP_ADMIN, "e2": TEST_GROUP_MEMBER1, "e3": TEST_GROUP_MEMBER2})
    
    # Delete participants
    await db.execute(text("""
        DELETE FROM conversation_participants 
        WHERE id_utilisateur IN (SELECT id FROM users WHERE email IN (:e1, :e2, :e3))
    """), {"e1": TEST_GROUP_ADMIN, "e2": TEST_GROUP_MEMBER1, "e3": TEST_GROUP_MEMBER2})

    # Delete conversations
    await db.execute(text("""
        DELETE FROM conversations 
        WHERE id_conversation NOT IN (SELECT id_conversation FROM conversation_participants)
    """))

    # Delete test users
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.commit()

async def test_group_flow():
    # 1. Clean DB
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    # 2. Create users
    print("2. Création des utilisateurs...")
    async with SessionLocal() as db:
        admin_user = models.Personnel(nom="Group Admin", email=TEST_GROUP_ADMIN, motdepasse="pwd", role="personnel", actif=True)
        mem1 = models.Personnel(nom="Member 1", email=TEST_GROUP_MEMBER1, motdepasse="pwd", role="personnel", actif=True)
        mem2 = models.Personnel(nom="Member 2", email=TEST_GROUP_MEMBER2, motdepasse="pwd", role="personnel", actif=True)
        db.add_all([admin_user, mem1, mem2])
        await db.commit()
        await db.refresh(admin_user)
        await db.refresh(mem1)
        await db.refresh(mem2)
        admin_id = admin_user.id
        mem1_id = mem1.id
        mem2_id = mem2.id

    # 3. Create Group Conversation
    print("3. Test de création de groupe...")
    async with SessionLocal() as db:
        admin_obj = await db.get(models.User, admin_id)
        conv_schema = ConversationCreate(
            nom="Groupe Projet Alpha",
            type="groupe",
            avatar="avatar_url",
            participant_ids=[admin_id, mem1_id]
        )
        conv = await creer_conversation(conv_in=conv_schema, db=db, current_user=admin_obj)
        assert conv.type == "groupe"
        assert conv.nom == "Groupe Projet Alpha"
        assert conv.id_admin == admin_id
        assert conv.avatar == "avatar_url"
        assert len(conv.participants) == 2
        conv_id = conv.id_conversation
        print("   [OK] Groupe créé avec succès.")

    # 4. Modify Group Details
    print("4. Test de modification de groupe (Nom/Avatar)...")
    async with SessionLocal() as db:
        admin_obj = await db.get(models.User, admin_id)
        mem1_obj = await db.get(models.User, mem1_id)
        
        # Unauthorized check
        try:
            await modifier_groupe(id_conversation=conv_id, conv_update=ConversationUpdate(nom="Groupe Hacké"), db=db, current_user=mem1_obj)
            assert False, "Non-admin user should not be able to modify group details"
        except HTTPException as e:
            assert e.status_code == 403
            
        # Authorized update
        updated_conv = await modifier_groupe(id_conversation=conv_id, conv_update=ConversationUpdate(nom="Nouveau Nom", avatar="nouveau_avatar"), db=db, current_user=admin_obj)
        assert updated_conv.nom == "Nouveau Nom"
        assert updated_conv.avatar == "nouveau_avatar"
        print("   [OK] Droits et modifications validés.")

    # 5. Add Members
    print("5. Test d'ajout de membres...")
    async with SessionLocal() as db:
        admin_obj = await db.get(models.User, admin_id)
        mem1_obj = await db.get(models.User, mem1_id)
        
        # Unauthorized check
        try:
            await ajouter_membres_groupe(id_conversation=conv_id, data=GroupParticipantsUpdate(participant_ids=[mem2_id]), db=db, current_user=mem1_obj)
            assert False, "Non-admin user should not be able to add members"
        except HTTPException as e:
            assert e.status_code == 403
            
        # Authorized add
        updated_conv = await ajouter_membres_groupe(id_conversation=conv_id, data=GroupParticipantsUpdate(participant_ids=[mem2_id]), db=db, current_user=admin_obj)
        assert len(updated_conv.participants) == 3
        print("   [OK] Droits et ajout de membres validés.")

    # 6. Change Admin
    print("6. Test de changement d'administrateur...")
    async with SessionLocal() as db:
        admin_obj = await db.get(models.User, admin_id)
        mem1_obj = await db.get(models.User, mem1_id)
        
        # Unauthorized check
        try:
            await modifier_admin_groupe(id_conversation=conv_id, data=GroupAdminUpdate(id_admin=mem1_id), db=db, current_user=mem1_obj)
            assert False, "Non-admin user should not be able to change admin"
        except HTTPException as e:
            assert e.status_code == 403
            
        # Authorized change
        updated_conv = await modifier_admin_groupe(id_conversation=conv_id, data=GroupAdminUpdate(id_admin=mem1_id), db=db, current_user=admin_obj)
        assert updated_conv.id_admin == mem1_id
        print("   [OK] Changement d'administrateur validé.")

    # 7. Remove Member
    print("7. Test de retrait de membre...")
    async with SessionLocal() as db:
        admin_obj = await db.get(models.User, admin_id) # admin is now mem1!
        mem1_obj = await db.get(models.User, mem1_id) # current admin
        mem2_obj = await db.get(models.User, mem2_id)
        
        # Unauthorized check: admin_id (User 1) tries to remove User 2, but admin_id is no longer admin!
        try:
            await retirer_membre_groupe(id_conversation=conv_id, id_utilisateur=mem2_id, db=db, current_user=admin_obj)
            assert False, "Former admin user should not be able to remove members"
        except HTTPException as e:
            assert e.status_code == 403
            
        # Authorized remove: mem1 (current admin) removes mem2
        updated_conv = await retirer_membre_groupe(id_conversation=conv_id, id_utilisateur=mem2_id, db=db, current_user=mem1_obj)
        assert len(updated_conv.participants) == 2
        
        # Self remove (leave group): admin_id (former admin, current member) leaves the group
        updated_conv2 = await retirer_membre_groupe(id_conversation=conv_id, id_utilisateur=admin_id, db=db, current_user=admin_obj)
        assert len(updated_conv2.participants) == 1
        print("   [OK] Droits de retrait et retrait volontaire validés.")

    # 8. Clean DB
    print("8. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
    print("Tous les tests du module de messagerie de groupe ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_group_flow())
