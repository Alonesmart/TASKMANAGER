import os
import sys
import asyncio

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from datetime import date
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.project.routes import create_project, update_project
from Backend.modules.tasks.routes import create_task, update_task
from Backend import Schemas

TEST_CHEF_EMAIL = "test_p9_chef@taskmanager.com"
TEST_MEMBER_EMAIL = "test_p9_member@taskmanager.com"
TEST_ADMIN_EMAIL = "test_p9_admin@taskmanager.com"

async def clean_db(db):
    emails = [TEST_CHEF_EMAIL, TEST_MEMBER_EMAIL, TEST_ADMIN_EMAIL]
    
    # 1. Clean notifications
    for email in emails:
        await db.execute(text("DELETE FROM notifications WHERE id_utilisateur IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
    
    # 2. Clean project role members
    await db.execute(text("""
        DELETE FROM projet_membre_roles 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2, :e3)
            )
        )
    """), {"e1": TEST_CHEF_EMAIL, "e2": TEST_MEMBER_EMAIL, "e3": TEST_ADMIN_EMAIL})

    # 3. Clean team members
    await db.execute(text("""
        DELETE FROM appartient_equipe 
        WHERE id_equipe IN (
            SELECT id_equipe FROM equipes WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email IN (:e1, :e2, :e3)
                )
            )
        )
    """), {"e1": TEST_CHEF_EMAIL, "e2": TEST_MEMBER_EMAIL, "e3": TEST_ADMIN_EMAIL})

    # 4. Clean teams
    await db.execute(text("""
        DELETE FROM equipes 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2, :e3)
            )
        )
    """), {"e1": TEST_CHEF_EMAIL, "e2": TEST_MEMBER_EMAIL, "e3": TEST_ADMIN_EMAIL})

    # 5. Clean task assignations
    await db.execute(text("""
        DELETE FROM tache_assignations 
        WHERE id_tache IN (
            SELECT id_tache FROM taches WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email IN (:e1, :e2, :e3)
                )
            )
        )
    """), {"e1": TEST_CHEF_EMAIL, "e2": TEST_MEMBER_EMAIL, "e3": TEST_ADMIN_EMAIL})

    # 6. Clean tasks
    await db.execute(text("""
        DELETE FROM taches 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2, :e3)
            )
        )
    """), {"e1": TEST_CHEF_EMAIL, "e2": TEST_MEMBER_EMAIL, "e3": TEST_ADMIN_EMAIL})

    # 7. Clean projects
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email IN (:e1, :e2, :e3))"), {"e1": TEST_CHEF_EMAIL, "e2": TEST_MEMBER_EMAIL, "e3": TEST_ADMIN_EMAIL})

    # 8. Clean users
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.commit()

async def test_flow():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création des utilisateurs...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="P9 Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        chef = models.Personnel(nom="P9 Chef (Personnel)", email=TEST_CHEF_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        member = models.Personnel(nom="P9 Member (Personnel)", email=TEST_MEMBER_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        db.add_all([admin, chef, member])
        await db.commit()
        await db.refresh(admin)
        await db.refresh(chef)
        await db.refresh(member)
        admin_id = admin.id
        chef_id = chef.id
        member_id = member.id

    print("3. Test 9.1: Création de projet avec un chef de projet qui est membre du 'personnel'...")
    async with SessionLocal() as db:
        # Load user objects
        admin_user = (await db.execute(select(models.User).where(models.User.id == admin_id))).scalar_one()
        chef_user = (await db.execute(select(models.User).where(models.User.id == chef_id))).scalar_one()
        
        proj_schema = Schemas.ProjetCreate(
            titre="Projet Phase 9",
            description="Test chef de projet universel",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="moyenne",
            statut="actif",
            id_administrateur=chef_id # Non-admin user as chef
        )
        
        project = await create_project(project=proj_schema, db=db, current_user=admin_user)
        assert project.id_administrateur == chef_id
        project_id = project.id_projet
        print("   [OK] Projet créé avec un chef de projet personnel.")

    print("4. Test 9.2: Notification lors de la modification d'un projet...")
    async with SessionLocal() as db:
        # Add member to the project via team
        team = models.Equipe(nom="Equipe Phase 9", id_projet=project_id, id_personnel_createur=chef_id)
        db.add(team)
        await db.commit()
        await db.refresh(team)
        
        team_member = models.Appartient_Equipe(id_personnel=member_id, id_equipe=team.id_equipe)
        db.add(team_member)
        await db.commit()

        # Update the project
        chef_user = (await db.execute(select(models.User).where(models.User.id == chef_id))).scalar_one()
        update_schema = Schemas.ProjetBase(
            titre="Projet Phase 9 Modifié",
            description="Test notifications",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="haute",
            statut="actif",
            id_administrateur=chef_id
        )
        await update_project(id_projet=project_id, project_update=update_schema, db=db, current_user=chef_user)
        
        # Verify member received a notification
        notifs_res = await db.execute(select(models.Notification).where(models.Notification.id_utilisateur == member_id))
        notifs = notifs_res.scalars().all()
        assert len(notifs) > 0
        assert "Le projet" in notifs[0].message and "modifié" in notifs[0].message
        print("   [OK] Notification de modification de projet bien reçue par le membre.")

    print("5. Test 9.2: Notification lors de la modification d'une tâche...")
    async with SessionLocal() as db:
        chef_user = (await db.execute(select(models.User).where(models.User.id == chef_id))).scalar_one()
        # Create a task assigned to member
        task_in = Schemas.TacheCreate(
            titre="Tâche Phase 9",
            description="Test notifications",
            priorite="moyenne",
            statut="a_faire",
            id_projet=project_id,
            assigned_user_ids=[member_id]
        )
        task = await create_task(task=task_in, db=db, current_user=chef_user)
        task_id = task["id_tache"]

        # Clear notifications for member to count only new ones
        await db.execute(text("DELETE FROM notifications WHERE id_utilisateur = :uid"), {"uid": member_id})
        await db.commit()

        # Update the task (change description, which triggers the 'other modifications' logic)
        task_update = Schemas.TacheUpdate(
            titre="Tâche Phase 9",
            description="Description modifiée",
            priorite="moyenne",
            statut="a_faire",
            assigned_user_ids=[member_id]
        )
        await update_task(id_tache=task_id, task_update=task_update, db=db, current_user=chef_user)

        # Verify member received a notification
        notifs_res = await db.execute(select(models.Notification).where(models.Notification.id_utilisateur == member_id))
        notifs = notifs_res.scalars().all()
        assert len(notifs) > 0
        assert "La tâche" in notifs[0].message and "modifiée" in notifs[0].message
        print("   [OK] Notification de modification de tâche bien reçue par le collaborateur.")

    print("6. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
    print("Tous les tests de la Phase 9 ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_flow())
