import asyncio
from datetime import date
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.tasks.routes import create_task, list_tasks, update_task, delete_task, add_commentaire
from Backend.modules.project.routes import create_project
from Backend.Schemas import TacheCreate, TacheUpdate, CommentaireCreate, ProjetCreate
from Backend import models

TEST_ADMIN_EMAIL = "test_task_admin@taskmanager.com"
TEST_OTHER_ADMIN_EMAIL = "test_task_other_admin@taskmanager.com"
TEST_STAFF_EMAIL = "test_task_staff@taskmanager.com"
TEST_OTHER_STAFF_EMAIL = "test_task_other_staff@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_OTHER_ADMIN_EMAIL, TEST_STAFF_EMAIL, TEST_OTHER_STAFF_EMAIL]
    
    # Suppression en cascade des commentaires de test
    await db.execute(text("""
        DELETE FROM commentaires 
        WHERE id_tache IN (
            SELECT id_tache FROM taches WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email IN (:e1, :e2)
                )
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    # Suppression en cascade des assignations de test
    await db.execute(text("""
        DELETE FROM tache_assignations 
        WHERE id_tache IN (
            SELECT id_tache FROM taches WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email IN (:e1, :e2)
                )
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    # Suppression en cascade des tâches
    await db.execute(text("""
        DELETE FROM taches 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    # Suppression en cascade des appartements
    await db.execute(text("""
        DELETE FROM appartient_equipe 
        WHERE id_equipe IN (
            SELECT id_equipe FROM equipes WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email IN (:e1, :e2)
                )
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    # Suppression en cascade des équipes
    await db.execute(text("""
        DELETE FROM equipes 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    # Suppression en cascade des projets
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email IN (:e1, :e2))"), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})
    
    # Suppression des utilisateurs de test
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
    
    await db.execute(text("DELETE FROM personnels WHERE id NOT IN (SELECT id FROM users)"))
    await db.execute(text("DELETE FROM administrateurs WHERE id NOT IN (SELECT id FROM users)"))
    await db.commit()

async def test_tasks_flow():
    async with SessionLocal() as db:
        print("1. Nettoyage de la base de données...")
        await clean_db(db)

        print("2. Création des utilisateurs de test...")
        admin1 = models.Administrateur(nom="Admin 1", email=TEST_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        admin2 = models.Administrateur(nom="Admin 2", email=TEST_OTHER_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        staff1 = models.Personnel(nom="Staff 1", email=TEST_STAFF_EMAIL, motdepasse="hash", role="personnel", actif=True)
        staff2 = models.Personnel(nom="Staff 2", email=TEST_OTHER_STAFF_EMAIL, motdepasse="hash", role="personnel", actif=True)
        
        db.add_all([admin1, admin2, staff1, staff2])
        await db.commit()
        await db.refresh(admin1)
        await db.refresh(admin2)
        await db.refresh(staff1)
        await db.refresh(staff2)

        # Créer le projet
        proj_schema = ProjetCreate(
            titre="Projet pour Tâches Test",
            description="Description du projet",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin1.id
        )
        project = await create_project(project=proj_schema, db=db, current_user=admin1)

        # --- TEST 1: Création de tâche ---
        print("3. Test de création de tâche...")
        task_schema = TacheCreate(
            titre="Tâche Test Audit",
            description="Faire l'audit de l'API",
            priorite="haute",
            statut="a_faire",
            echeance=date.today(),
            progression=0,
            id_projet=project.id_projet,
            assigned_user_ids=[staff1.id]
        )

        task = await create_task(task=task_schema, db=db, current_user=admin1)
        assert task["titre"] == "Tâche Test Audit"
        assert len(task["assigned_users"]) == 1
        assert task["assigned_users"][0].id == staff1.id
        print("   [OK] Tâche créée et assignée avec succès.")

        try:
            await create_task(task=task_schema, db=db, current_user=staff1)
            raise AssertionError("Un membre du personnel a pu créer une tâche.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Interdiction aux non-administrateurs de créer une tâche (HTTP 403).")

        # --- TEST 2: Consultation ---
        print("4. Test de listage/consultation des tâches...")
        tasks_list_admin = await list_tasks(db=db, current_user=admin1)
        assert len(tasks_list_admin) >= 1
        print("   [OK] L'admin du projet liste les tâches.")

        tasks_list_staff_no_access = await list_tasks(db=db, current_user=staff2)
        assert len(tasks_list_staff_no_access) == 0
        print("   [OK] Un utilisateur sans accès au projet ne liste aucune tâche (0 tâche).")

        # Ajouter staff1 à l'équipe du projet
        team = models.Equipe(nom="Equipe Tâches Test", id_projet=project.id_projet, id_personnel_createur=staff1.id)
        db.add(team)
        await db.commit()
        await db.refresh(team)
        member = models.Appartient_Equipe(id_personnel=staff1.id, id_equipe=team.id_equipe)
        db.add(member)
        await db.commit()

        tasks_list_staff1 = await list_tasks(db=db, current_user=staff1)
        assert len(tasks_list_staff1) >= 1
        print("   [OK] Le personnel membre de l'équipe a bien accès aux tâches.")

        # --- TEST 3: Modification ---
        print("5. Test de modification de tâche...")
        task_update = TacheUpdate(
            titre="Tâche Test Modifiée",
            description="Nouvelle description",
            priorite="moyenne",
            statut="en_cours",
            progression=50,
            assigned_user_ids=[staff1.id, staff2.id]
        )

        updated_task = await update_task(id_tache=task["id_tache"], task_update=task_update, db=db, current_user=admin1)
        assert updated_task["titre"] == "Tâche Test Modifiée"
        assert updated_task["progression"] == 50
        assert len(updated_task["assigned_users"]) == 2
        print("   [OK] Tâche modifiée avec succès par le superviseur admin.")

        try:
            await update_task(id_tache=task["id_tache"], task_update=task_update, db=db, current_user=admin2)
            raise AssertionError("Un autre administrateur a pu modifier la tâche.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus de modification par un autre administrateur (HTTP 403).")

        # --- TEST 4: Commentaires ---
        print("6. Test d'ajout de commentaires...")
        comm_schema = CommentaireCreate(contenu="Bon début de travail !", id_utilisateur=staff1.id)
        comment = await add_commentaire(id_tache=task["id_tache"], comm=comm_schema, db=db, current_user=staff1)
        assert comment["contenu"] == "Bon début de travail !"
        assert comment["id_utilisateur"] == staff1.id
        print("   [OK] Commentaire ajouté par le personnel membre de l'équipe.")

        try:
            await add_commentaire(id_tache=task["id_tache"], comm=comm_schema, db=db, current_user=staff2)
            raise AssertionError("Un personnel hors équipe a pu commenter.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus d'ajout de commentaire pour un membre hors projet (HTTP 403).")

        # --- TEST 5: Suppression ---
        print("7. Test de suppression de tâche...")
        try:
            await delete_task(id_tache=task["id_tache"], db=db, current_user=admin2)
            raise AssertionError("Un autre administrateur a pu supprimer la tâche.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus de suppression par un autre administrateur (HTTP 403).")

        await delete_task(id_tache=task["id_tache"], db=db, current_user=admin1)
        print("   [OK] Tâche supprimée avec succès par le superviseur admin.")

        # --- NETTOYAGE ---
        print("8. Nettoyage final...")
        await clean_db(db)
        print("Tous les tests du module tâches ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_tasks_flow())
