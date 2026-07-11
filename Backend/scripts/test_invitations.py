import asyncio
from datetime import date
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.invitations.routes import (
    creer_invitation, lister_invitations_projet, annuler_invitation, accepter_invitation,
    AcceptInvitationPayload
)
from Backend.modules.project.routes import create_project
from Backend.Schemas import ProjetCreate, InvitationCreate
from Backend import models

TEST_ADMIN_EMAIL = "test_inv_admin@taskmanager.com"
TEST_GUEST_EMAIL = "test_inv_guest@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_GUEST_EMAIL]

    # Suppression en cascade des invitations
    await db.execute(text("DELETE FROM invitations WHERE id_projet IN (SELECT id_projet FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email))"), {"email": TEST_ADMIN_EMAIL})
    # Suppression en cascade des rôles
    await db.execute(text("DELETE FROM projet_membre_roles WHERE id_projet IN (SELECT id_projet FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email))"), {"email": TEST_ADMIN_EMAIL})
    # Suppression en cascade des projets
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_ADMIN_EMAIL})
    
    # Suppression des utilisateurs
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
        
    await db.commit()

async def test_invitations_flow():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création de l'administrateur de test...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Admin Inv", email=TEST_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        db.add(admin)
        await db.commit()
        admin_id = admin.id

    print("3. Création du projet...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        proj = ProjetCreate(
            titre="Projet Inv Test",
            description="Test invitations",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="faible",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        project = await create_project(project=proj, db=db, current_user=admin)
        project_id = project.id_projet

    # --- TEST 1: Création d'une invitation ---
    print("4. Test de création d'une invitation...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        inv_schema = InvitationCreate(
            email_invite=TEST_GUEST_EMAIL,
            id_projet=project_id,
            role_propose="collaborateur"
        )
        inv = await creer_invitation(id_projet=project_id, inv_in=inv_schema, db=db, current_user=admin)
        
        assert inv.email_invite == TEST_GUEST_EMAIL
        assert inv.role_propose == "collaborateur"
        assert inv.statut == "pending"
        token = inv.token
        inv_id = inv.id
        print("   [OK] Invitation créée avec token.")

    # --- TEST 2: Listage des invitations ---
    print("5. Test de listage des invitations...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        invs = await lister_invitations_projet(id_projet=project_id, db=db, current_user=admin)
        
        assert len(invs) == 1
        assert invs[0].id == inv_id
        print("   [OK] Invitation listée avec succès.")

    # --- TEST 3: Acceptation d'invitation (création compte) ---
    print("6. Test d'acceptation de l'invitation (nouveau compte)...")
    async with SessionLocal() as db:
        payload = AcceptInvitationPayload(
            nom="Collaborateur Invité",
            motdepasse="superpassword"
        )
        res = await accepter_invitation(token=token, payload=payload, db=db)
        assert res["role"] == "collaborateur"
        print("   [OK] Invitation acceptée et compte créé.")

    # --- Verification ---
    print("7. Vérification de la création de l'utilisateur et du lien de rôle...")
    async with SessionLocal() as db:
        # User should exist in personnels
        result = await db.execute(text("SELECT id, nom, role FROM users WHERE email = :email"), {"email": TEST_GUEST_EMAIL})
        user = result.fetchone()
        assert user is not None
        assert user[1] == "Collaborateur Invité"
        assert user[2] == "personnel"
        guest_id = user[0]

        # Role relation should exist
        role_res = await db.execute(text("SELECT role FROM projet_membre_roles WHERE id_projet = :p_id AND id_utilisateur = :u_id"), {"p_id": project_id, "u_id": guest_id})
        role_row = role_res.fetchone()
        assert role_row is not None
        assert role_row[0] == "collaborateur"
        print("   [OK] Enregistrement en base de données correct.")

    # --- TEST 4: Annuler une invitation ---
    print("8. Test d'annulation d'une invitation...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        
        # Créer une autre invitation temporaire pour l'annuler
        inv_schema_2 = InvitationCreate(
            email_invite="other_guest@taskmanager.com",
            id_projet=project_id,
            role_propose="invite_externe"
        )
        inv2 = await creer_invitation(id_projet=project_id, inv_in=inv_schema_2, db=db, current_user=admin)
        inv2_id = inv2.id
        
        # Annuler
        await annuler_invitation(id=inv2_id, db=db, current_user=admin)
        print("   [OK] Invitation annulée avec succès.")

    # --- NETTOYAGE ---
    print("9. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module invitations ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_invitations_flow())
