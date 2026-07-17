import os
import sys
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.reunions.routes import creer_reunion, lister_reunions, repondre_invitation_reunion
from Backend import Schemas

TEST_ADMIN_EMAIL = "test_meet_admin@taskmanager.com"
TEST_USER_EMAIL = "test_meet_user@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_USER_EMAIL]

    for email in emails:
        # Clean participation_reunion
        await db.execute(text("""
            DELETE FROM participation_reunion 
            WHERE id_utilisateur IN (SELECT id FROM users WHERE email = :email)
        """), {"email": email})

        # Clean notifications
        await db.execute(text("DELETE FROM notifications WHERE id_utilisateur IN (SELECT id FROM users WHERE email = :email)"), {"email": email})

        # Clean meetings
        await db.execute(text("""
            DELETE FROM reunions 
            WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email = :email
                )
            )
        """), {"email": email})

        # Clean projects
        await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email)"), {"email": email})

        # Clean users
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.commit()

async def test_reunions():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création des utilisateurs...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Meet Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        user = models.Personnel(nom="Meet User", email=TEST_USER_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        db.add_all([admin, user])
        await db.commit()
        admin_id = admin.id
        user_id = user.id

    print("3. Création du projet...")
    async with SessionLocal() as db:
        p1 = models.Projet(
            titre="Projet Réunions",
            description="Test meetings",
            dateDebut=datetime.now().date(),
            dateFin=datetime.now().date() + timedelta(days=10),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        db.add(p1)
        await db.commit()
        p1_id = p1.id_projet

        # Admin user object for Depends
        admin_user_res = await db.execute(select(models.User).where(models.User.id == admin_id))
        admin_user = admin_user_res.scalar_one()

        # Regular user object for Depends
        regular_user_res = await db.execute(select(models.User).where(models.User.id == user_id))
        regular_user = regular_user_res.scalar_one()

    print("4. Création d'une réunion avec invitation...")
    async with SessionLocal() as db:
        reunion_data = Schemas.ReunionCreate(
            titre="Sync Hebdomadaire",
            date=datetime.now() + timedelta(days=1),
            lien_virtuel="https://meet.google.com/abc-defg-hij",
            ordre_jour="1. Status, 2. Next Steps",
            id_projet=p1_id,
            invited_user_ids=[user_id]
        )
        meet_out = await creer_reunion(reunion_in=reunion_data, db=db, current_user=admin_user)
        assert meet_out["titre"] == "Sync Hebdomadaire"
        assert meet_out["lien_virtuel"] == "https://meet.google.com/abc-defg-hij"
        assert len(meet_out["invitations"]) == 2  # Admin (confirme) + User (invite)
        
        # Verify specific invitations
        inv_admin = next(inv for inv in meet_out["invitations"] if inv["id_utilisateur"] == admin_id)
        inv_user = next(inv for inv in meet_out["invitations"] if inv["id_utilisateur"] == user_id)
        assert inv_admin["statut"] == "confirme"
        assert inv_user["statut"] == "invite"
        print("   [OK] Réunion créée et invitations configurées.")

    print("5. Test d'envoi de notification...")
    async with SessionLocal() as db:
        # Check that user received a notification
        notifs_res = await db.execute(select(models.Notification).where(models.Notification.id_utilisateur == user_id))
        notifs = notifs_res.scalars().all()
        # Filtrer pour ne garder que la notif de la réunion
        relevant_notifs = [n for n in notifs if "Sync Hebdomadaire" in n.message]
        assert len(relevant_notifs) == 1
        print("   [OK] Notification d'invitation reçue par l'invité.")

    print("6. Test de listage des réunions...")
    async with SessionLocal() as db:
        # A. Admin lists
        admin_meets = await lister_reunions(id_projet=p1_id, db=db, current_user=admin_user)
        assert len(admin_meets) == 1
        assert admin_meets[0]["titre"] == "Sync Hebdomadaire"

        # B. User lists
        user_meets = await lister_reunions(id_projet=p1_id, db=db, current_user=regular_user)
        assert len(user_meets) == 1
        assert user_meets[0]["titre"] == "Sync Hebdomadaire"
        print("   [OK] Listage des réunions réussi pour l'organisateur et l'invité.")

    print("7. Test de réponse à l'invitation (User confirme)...")
    async with SessionLocal() as db:
        meet_id = meet_out["id_reunion"]
        response = Schemas.ReunionResponseUpdate(statut="confirme")
        res = await repondre_invitation_reunion(id_reunion=meet_id, reponse=response, db=db, current_user=regular_user)
        assert res["message"] == "Réponse enregistrée avec succès"

        # Verify updated status
        check_res = await db.execute(
            select(models.ParticipationReunion.statut)
            .where(
                models.ParticipationReunion.id_reunion == meet_id,
                models.ParticipationReunion.id_utilisateur == user_id
            )
        )
        assert check_res.scalar() == "confirme"
        print("   [OK] Confirmation d'invitation enregistrée.")

    print("8. Test de notification à l'organisateur...")
    async with SessionLocal() as db:
        # Check that admin received notification about confirmation
        admin_notifs_res = await db.execute(select(models.Notification).where(models.Notification.id_utilisateur == admin_id))
        admin_notifs = admin_notifs_res.scalars().all()
        # Filtrer pour ne garder que la notif de confirmation
        relevant_notifs = [n for n in admin_notifs if "Sync Hebdomadaire" in n.message and "confirmé" in n.message]
        assert len(relevant_notifs) == 1
        print("   [OK] Notification de confirmation reçue par l'organisateur.")

    print("9. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module Réunions ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_reunions())
