import asyncio
from datetime import date, timedelta
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.tasks.routes import list_tasks
from Backend import Schemas

TEST_ADMIN_EMAIL = "test_filter_admin@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL]

    for email in emails:
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
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.commit()

async def test_task_filters():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création de l'administrateur...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Filter Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        db.add(admin)
        await db.commit()
        admin_id = admin.id

    print("3. Création des projets et des tâches...")
    async with SessionLocal() as db:
        # Project 1
        p1 = models.Projet(
            titre="Projet Filtre 1",
            description="Test project 1",
            dateDebut=date.today(),
            dateFin=date.today() + timedelta(days=10),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        # Project 2
        p2 = models.Projet(
            titre="Projet Filtre 2",
            description="Test project 2",
            dateDebut=date.today(),
            dateFin=date.today() + timedelta(days=10),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        db.add_all([p1, p2])
        await db.flush()
        p1_id = p1.id_projet
        p2_id = p2.id_projet

        # Tasks
        # Task 1: Project 1, Status 'a_faire', Priority 'haute', Due Tomorrow
        t1 = models.Tache(
            titre="Tâche 1",
            description="T1 desc",
            priorite="haute",
            statut="a_faire",
            status="a_faire",
            echeance=date.today() + timedelta(days=1),
            id_projet=p1_id
        )
        # Task 2: Project 1, Status 'en_cours', Priority 'moyenne', Due Today
        t2 = models.Tache(
            titre="Tâche 2",
            description="T2 desc",
            priorite="moyenne",
            statut="en_cours",
            status="en_cours",
            echeance=date.today(),
            id_projet=p1_id
        )
        # Task 3: Project 2, Status 'a_faire', Priority 'faible', Due Today
        t3 = models.Tache(
            titre="Tâche 3",
            description="T3 desc",
            priorite="faible",
            statut="a_faire",
            status="a_faire",
            echeance=date.today(),
            id_projet=p2_id
        )

        db.add_all([t1, t2, t3])
        await db.commit()

        # Admin user object for list_tasks Depends
        admin_user_res = await db.execute(select(models.User).where(models.User.id == admin_id))
        admin_user = admin_user_res.scalar_one()

    print("4. Test des filtres de list_tasks...")
    async with SessionLocal() as db:
        # A. Filter by Project 1
        res_p1 = await list_tasks(id_projet=p1_id, db=db, current_user=admin_user)
        assert len(res_p1) == 2, f"Attendu 2 tâches pour Projet 1, obtenu {len(res_p1)}"
        assert {t["titre"] for t in res_p1} == {"Tâche 1", "Tâche 2"}
        print("   [OK] Filtrage par projet réussi.")

        # B. Filter by Status 'a_faire'
        res_stat = await list_tasks(statut="a_faire", db=db, current_user=admin_user)
        assert len(res_stat) == 2, f"Attendu 2 tâches 'a_faire', obtenu {len(res_stat)}"
        assert {t["titre"] for t in res_stat} == {"Tâche 1", "Tâche 3"}
        print("   [OK] Filtrage par statut réussi.")

        # C. Filter by Project 1 AND Status 'a_faire'
        res_p1_stat = await list_tasks(id_projet=p1_id, statut="a_faire", db=db, current_user=admin_user)
        assert len(res_p1_stat) == 1, f"Attendu 1 tâche 'a_faire' dans Projet 1, obtenu {len(res_p1_stat)}"
        assert res_p1_stat[0]["titre"] == "Tâche 1"
        print("   [OK] Filtrage composé Projet + Statut réussi.")

        # D. Filter by Date (Today)
        res_date = await list_tasks(date_echeance=date.today(), db=db, current_user=admin_user)
        assert len(res_date) == 2, f"Attendu 2 tâches pour aujourd'hui, obtenu {len(res_date)}"
        assert {t["titre"] for t in res_date} == {"Tâche 2", "Tâche 3"}
        print("   [OK] Filtrage par date d'échéance réussi.")

        # E. Filter by Priority 'haute'
        res_prio = await list_tasks(priorite="haute", db=db, current_user=admin_user)
        assert len(res_prio) == 1, f"Attendu 1 tâche de priorité haute, obtenu {len(res_prio)}"
        assert res_prio[0]["titre"] == "Tâche 1"
        print("   [OK] Filtrage par priorité réussi.")

    print("5. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests de filtres de tâches ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_task_filters())
