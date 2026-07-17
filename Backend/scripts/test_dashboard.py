import asyncio
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.dashboard.routes import get_global_dashboard
from Backend.modules.project.routes import create_project
from Backend.modules.tasks.routes import create_task
from Backend.Schemas import ProjetCreate, TacheCreate
from Backend import models

TEST_ADMIN_EMAIL = "test_db_admin@taskmanager.com"
TEST_STAFF_EMAIL = "test_db_staff@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_STAFF_EMAIL]
    
    # Suppression en cascade des tâches
    await db.execute(text("""
        DELETE FROM taches 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL})

    # Suppression en cascade des appartements
    await db.execute(text("""
        DELETE FROM appartient_equipe 
        WHERE id_equipe IN (
            SELECT id_equipe FROM equipes WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email IN (:e1)
                )
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL})

    # Suppression en cascade des équipes
    await db.execute(text("""
        DELETE FROM equipes 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL})

    # Suppression en cascade des projets
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email IN (:e1))"), {"e1": TEST_ADMIN_EMAIL})
    
    # Suppression des utilisateurs de test
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
    
    await db.execute(text("DELETE FROM personnels WHERE id NOT IN (SELECT id FROM users)"))
    await db.execute(text("DELETE FROM administrateurs WHERE id NOT IN (SELECT id FROM users)"))
    await db.commit()

async def test_dashboard_flow():
    # --- ETAPE 1: NETTOYAGE ---
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    # --- ETAPE 2: UTILISATEURS ---
    print("2. Création des utilisateurs de test...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Admin 1", email=TEST_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        staff = models.Personnel(nom="Staff 1", email=TEST_STAFF_EMAIL, motdepasse="hash", role="personnel", actif=True)
        
        db.add_all([admin, staff])
        await db.commit()
        
        admin_id = admin.id
        staff_id = staff.id

    # --- ETAPE 3: PROJETS ---
    print("3. Création de projets...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        
        # Projet 1 actif
        proj1 = ProjetCreate(
            titre="Projet Actif 1",
            description="Actif",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        project1 = await create_project(project=proj1, db=db, current_user=admin)
        project1_id = project1.id_projet

        # Projet 2 inactif
        proj2 = ProjetCreate(
            titre="Projet Inactif 2",
            description="Inactif",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="faible",
            statut="inactif",
            etat="suspendu",
            id_administrateur=admin_id
        )
        project2 = await create_project(project=proj2, db=db, current_user=admin)
        project2_id = project2.id_projet

    # --- ETAPE 4: TACHES ---
    print("4. Création de tâches...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        
        # Tâche 1 : a_faire, priorite haute (urgente), echeance demain (bientôt)
        task1 = TacheCreate(
            titre="Tâche 1",
            description="Urgente",
            priorite="haute",
            statut="a_faire",
            echeance=date.today() + timedelta(days=1),
            progression=10,
            id_projet=project1_id,
            assigned_user_ids=[staff_id]
        )
        await create_task(task=task1, db=db, current_user=admin)

        # Tâche 2 : terminees, priorite moyenne, echeance loin, progression 100
        task2 = TacheCreate(
            titre="Tâche 2",
            description="Terminée",
            priorite="moyenne",
            statut="terminees",
            echeance=date.today() + timedelta(days=30),
            progression=100,
            id_projet=project1_id,
            assigned_user_ids=[staff_id]
        )
        await create_task(task=task2, db=db, current_user=admin)

    # --- TEST 1: Récupération du dashboard par l'admin ---
    print("5. Test de récupération des métriques du dashboard...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        metrics = await get_global_dashboard(db=db, current_user=admin)
        print(f"DEBUG: active_projects={metrics['active_projects']}")
        
        # 1 projet actif (le projet 2 est inactif)
        assert metrics["active_projects"] == 1
        
        # 2 tâches au total
        assert metrics["my_tasks"] == 2
        
        # 1 tâche urgente (Tâche 1, car Tâche 2 est terminée)
        assert metrics["urgent_tasks"] == 1
        
        # 1 tâche bientôt due (Tâche 1, dans 1 jour. Tâche 2 est dans 30 jours et terminée)
        assert metrics["due_soon_tasks"] == 1
        
        # Progression moyenne : (10 + 100) / 2 = 55.0%
        assert metrics["progression"] == 55.0
        
        assert metrics["completed_tasks"] == 1
        assert metrics["todo_tasks"] == 1
        assert metrics["in_progress_tasks"] == 0
        
        print("   [OK] Statistiques du dashboard correctes pour l'administrateur.")

    # --- NETTOYAGE ---
    print("6. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module dashboard ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_dashboard_flow())
