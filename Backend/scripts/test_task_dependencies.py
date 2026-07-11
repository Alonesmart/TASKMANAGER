import asyncio
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.tasks.routes import add_dependency, remove_dependency, update_task
from Backend import Schemas

TEST_ADMIN_EMAIL = "test_dep_admin@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL]

    for email in emails:
        # Clean dependencies
        await db.execute(text("""
            DELETE FROM tache_dependances 
            WHERE id_tache IN (
                SELECT id_tache FROM taches WHERE id_projet IN (
                    SELECT id_projet FROM projets WHERE id_administrateur IN (
                        SELECT id FROM users WHERE email = :email
                    )
                )
            )
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
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})

    await db.commit()

async def test_task_dependencies():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création de l'administrateur...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Dep Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        db.add(admin)
        await db.commit()
        admin_id = admin.id

    print("3. Création du projet et des tâches...")
    async with SessionLocal() as db:
        p1 = models.Projet(
            titre="Projet Dépendances",
            description="Test dependencies",
            dateDebut=date.today(),
            dateFin=date.today() + timedelta(days=10),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        db.add(p1)
        await db.flush()
        p1_id = p1.id_projet

        # Task A
        tA = models.Tache(titre="Tâche A", priorite="moyenne", statut="a_faire", status="a_faire", id_projet=p1_id)
        # Task B
        tB = models.Tache(titre="Tâche B", priorite="moyenne", statut="a_faire", status="a_faire", id_projet=p1_id)
        # Task C
        tC = models.Tache(titre="Tâche C", priorite="moyenne", statut="a_faire", status="a_faire", id_projet=p1_id)

        db.add_all([tA, tB, tC])
        await db.commit()

        tA_id = tA.id_tache
        tB_id = tB.id_tache
        tC_id = tC.id_tache

        admin_user_res = await db.execute(select(models.User).where(models.User.id == admin_id))
        admin_user = admin_user_res.scalar_one()

    print("4. Test de création de dépendances (B dépend de A)...")
    async with SessionLocal() as db:
        res = await add_dependency(id_tache=tB_id, id_dependance=tA_id, db=db, current_user=admin_user)
        assert res["message"] == "Dépendance ajoutée avec succès"
        print("   [OK] Dépendance B -> A créée.")

    print("5. Test de prévention des dépendances circulaires (A ne peut pas dépendre de B)...")
    async with SessionLocal() as db:
        try:
            await add_dependency(id_tache=tA_id, id_dependance=tB_id, db=db, current_user=admin_user)
            assert False, "Devrait lever une exception de dépendance circulaire"
        except HTTPException as e:
            assert e.status_code == 400
            assert "circulaire" in e.detail
            print("   [OK] Dépendance circulaire A -> B rejetée.")

    print("6. Test de transitivité circulaire (C dépend de B, donc A ne peut pas dépendre de C)...")
    async with SessionLocal() as db:
        # C depends on B
        await add_dependency(id_tache=tC_id, id_dependance=tB_id, db=db, current_user=admin_user)
        # Now try to make A depend on C (Path: C -> B -> A. If A -> C, then cycle A -> C -> B -> A)
        try:
            await add_dependency(id_tache=tA_id, id_dependance=tC_id, db=db, current_user=admin_user)
            assert False, "Devrait lever une exception de dépendance circulaire transitive"
        except HTTPException as e:
            assert e.status_code == 400
            assert "circulaire" in e.detail
            print("   [OK] Dépendance circulaire transitive A -> C rejetée.")

    print("7. Test de blocage de complétion (B dépend de A non-terminée)...")
    async with SessionLocal() as db:
        # Try to mark B as terminees
        try:
            await update_task(id_tache=tB_id, task_update=Schemas.TacheUpdate(statut="terminees"), db=db, current_user=admin_user)
            assert False, "Devrait bloquer la complétion de B car A n'est pas terminée"
        except HTTPException as e:
            assert e.status_code == 400
            assert "dépend des tâches suivantes" in e.detail
            print("   [OK] Complétion de B bloquée correctement.")

    print("8. Test de complétion autorisée (A est terminée, puis B peut être terminée)...")
    async with SessionLocal() as db:
        # 1. Complete A
        await update_task(id_tache=tA_id, task_update=Schemas.TacheUpdate(statut="terminees"), db=db, current_user=admin_user)
        print("   [OK] Tâche A terminée.")
        
        # 2. Complete B (now allowed)
        res_b = await update_task(id_tache=tB_id, task_update=Schemas.TacheUpdate(statut="terminees"), db=db, current_user=admin_user)
        assert res_b["statut"] == "terminees"
        print("   [OK] Tâche B terminée avec succès.")

    print("9. Test de suppression de dépendance...")
    async with SessionLocal() as db:
        res = await remove_dependency(id_tache=tC_id, id_dependance=tB_id, db=db, current_user=admin_user)
        assert res["message"] == "Dépendance supprimée avec succès"
        print("   [OK] Dépendance C -> B supprimée.")

    print("10. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests de dépendances de tâches ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_task_dependencies())
