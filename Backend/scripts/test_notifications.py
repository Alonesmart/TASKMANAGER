import asyncio
from datetime import date
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.tasks.routes import create_task, update_task, add_commentaire
from Backend.modules.auth import routes as auth_routes
from Backend import Schemas

TEST_ADMIN_EMAIL = "test_notif_admin@taskmanager.com"
TEST_USER_EMAIL = "test_notif_user@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_USER_EMAIL]

    for email in emails:
        # Clean notifications
        await db.execute(text("""
            DELETE FROM notifications 
            WHERE id_utilisateur IN (SELECT id FROM users WHERE email = :email)
        """), {"email": email})

        # Clean comments
        await db.execute(text("""
            DELETE FROM commentaires 
            WHERE id_personnel IN (SELECT id FROM users WHERE email = :email)
        """), {"email": email})

        # Clean assignations
        await db.execute(text("""
            DELETE FROM tache_assignations 
            WHERE id_utilisateur IN (SELECT id FROM users WHERE email = :email)
        """), {"email": email})

        # Clean tasks
        await db.execute(text("""
            DELETE FROM taches 
            WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email = :email
                )
            )
        """), {"email": email})

        # Clean projects
        await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email)"), {"email": email})

        # Clean users
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.commit()

async def test_notifications():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création des utilisateurs...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Notif Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        user = models.Personnel(nom="Notif User", email=TEST_USER_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        db.add_all([admin, user])
        await db.commit()
        admin_id = admin.id
        user_id = user.id

    print("3. Création du projet...")
    async with SessionLocal() as db:
        project = models.Projet(
            titre="Notif Project",
            description="Notifications test project",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        db.add(project)
        await db.flush()
        project_id = project.id_projet
        await db.commit()

    print("4. Création d'une tâche avec assignation...")
    async with SessionLocal() as db:
        # Load admin user object
        admin_user_res = await db.execute(select(models.User).where(models.User.id == admin_id))
        admin_user = admin_user_res.scalar_one()
        
        task_in = Schemas.TacheCreate(
            titre="Tâche test notif",
            description="Test notifications",
            priorite="moyenne",
            statut="a_faire",
            id_projet=project_id,
            assigned_user_ids=[user_id]
        )
        
        created_task = await create_task(task_in, db, admin_user)
        task_id = created_task["id_tache"]

    print("5. Vérification de la notification d'assignation...")
    async with SessionLocal() as db:
        notif_res = await db.execute(
            select(models.Notification).where(
                models.Notification.id_utilisateur == user_id,
                models.Notification.id_tache == task_id
            )
        )
        notifs = notif_res.scalars().all()
        assert len(notifs) == 1, f"Attendu 1 notification, obtenu {len(notifs)}"
        assert "assigné à la tâche" in notifs[0].message
        print("   [OK] Notification d'assignation reçue.")

    print("6. Mise à jour du statut de la tâche...")
    async with SessionLocal() as db:
        admin_user_res = await db.execute(select(models.User).where(models.User.id == admin_id))
        admin_user = admin_user_res.scalar_one()

        task_update = Schemas.TacheUpdate(
            statut="en_cours"
        )
        await update_task(task_id, task_update, db, admin_user)

    print("7. Vérification des notifications de changement de statut...")
    async with SessionLocal() as db:
        # User notification
        notif_user_res = await db.execute(
            select(models.Notification).where(
                models.Notification.id_utilisateur == user_id,
                models.Notification.id_tache == task_id,
                models.Notification.message.like("%statut%")
            )
        )
        user_notifs = notif_user_res.scalars().all()
        assert len(user_notifs) == 1, "User n'a pas reçu la notification de changement de statut"
        assert "En cours" in user_notifs[0].message

        # Admin notification
        notif_admin_res = await db.execute(
            select(models.Notification).where(
                models.Notification.id_utilisateur == admin_id,
                models.Notification.id_tache == task_id,
                models.Notification.message.like("%statut%")
            )
        )
        admin_notifs = notif_admin_res.scalars().all()
        assert len(admin_notifs) == 1, "Admin n'a pas reçu la notification de changement de statut"
        print("   [OK] Notifications de changement de statut reçues par l'assigné et l'admin.")

    print("8. Ajout d'un commentaire par l'utilisateur...")
    async with SessionLocal() as db:
        user_res = await db.execute(select(models.User).where(models.User.id == user_id))
        user_obj = user_res.scalar_one()

        comm_in = Schemas.CommentaireCreate(
            contenu="Ceci est un commentaire de test.",
            id_utilisateur=user_id
        )
        await add_commentaire(task_id, comm_in, db, user_obj)

    print("9. Vérification des notifications de commentaire...")
    async with SessionLocal() as db:
        # Admin notification
        notif_admin_comm = await db.execute(
            select(models.Notification).where(
                models.Notification.id_utilisateur == admin_id,
                models.Notification.id_tache == task_id,
                models.Notification.message.like("%commenté%")
            )
        )
        admin_comm_notifs = notif_admin_comm.scalars().all()
        assert len(admin_comm_notifs) == 1, "Admin n'a pas reçu la notification de commentaire"
        assert "Notif User a commenté" in admin_comm_notifs[0].message

        # User notification (should be empty because user wrote the comment)
        notif_user_comm = await db.execute(
            select(models.Notification).where(
                models.Notification.id_utilisateur == user_id,
                models.Notification.id_tache == task_id,
                models.Notification.message.like("%commenté%")
            )
        )
        user_comm_notifs = notif_user_comm.scalars().all()
        assert len(user_comm_notifs) == 0, "L'auteur du commentaire a reçu une notification !"
        print("   [OK] Notification de commentaire reçue par l'admin uniquement.")

    print("10. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests d'événements de notification ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_notifications())
