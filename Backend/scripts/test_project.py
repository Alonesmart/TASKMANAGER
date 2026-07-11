import asyncio
from datetime import date
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.project.routes import create_project, get_project, update_project, delete_project
from Backend.Schemas import ProjetCreate, ProjetBase
from Backend import models

TEST_ADMIN_EMAIL = "test_project_admin@taskmanager.com"
TEST_OTHER_ADMIN_EMAIL = "test_project_other_admin@taskmanager.com"
TEST_STAFF_EMAIL = "test_project_staff@taskmanager.com"
TEST_OTHER_STAFF_EMAIL = "test_project_other_staff@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_OTHER_ADMIN_EMAIL, TEST_STAFF_EMAIL, TEST_OTHER_STAFF_EMAIL]
    
    # Suppression en cascade manuelle des données de test de projets au cas où
    await db.execute(text("""
        DELETE FROM documents 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})
    
    await db.execute(text("""
        DELETE FROM rapports 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

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

    await db.execute(text("""
        DELETE FROM equipes 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    await db.execute(text("""
        DELETE FROM taches 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email IN (:e1, :e2))"), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})
    
    for email in emails:
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": email})
        await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
    
    await db.execute(text("DELETE FROM personnels WHERE id NOT IN (SELECT id FROM users)"))
    await db.execute(text("DELETE FROM administrateurs WHERE id NOT IN (SELECT id FROM users)"))
    await db.commit()

async def test_project_flow():
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

        # --- TEST 1: Création ---
        print("3. Test de création de projet...")
        proj_schema = ProjetCreate(
            titre="Projet Test Audit",
            description="Description du projet",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="haute",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin1.id
        )
        
        project = await create_project(project=proj_schema, db=db, current_user=admin1)
        assert project.titre == "Projet Test Audit"
        print("   [OK] Projet créé par un administrateur.")

        try:
            await create_project(project=proj_schema, db=db, current_user=staff1)
            raise AssertionError("Un membre du personnel a pu créer un projet.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Interdiction aux non-administrateurs de créer un projet (HTTP 403).")

        # --- TEST 2: Accès ---
        print("4. Test d'accès au projet...")
        fetched_project = await get_project(id_projet=project.id_projet, db=db, current_user=admin1)
        assert fetched_project.id_projet == project.id_projet
        print("   [OK] L'administrateur superviseur a accès au projet.")

        try:
            await get_project(id_projet=project.id_projet, db=db, current_user=staff1)
            raise AssertionError("Un utilisateur tiers a pu accéder au projet.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Accès refusé pour un utilisateur tiers (HTTP 403).")

        # Accès avec équipe
        print("5. Test d'accès pour un membre de l'équipe du projet...")
        team = models.Equipe(nom="Equipe Projet Test", id_projet=project.id_projet, id_personnel_createur=staff1.id)
        db.add(team)
        await db.commit()
        await db.refresh(team)
        
        member = models.Appartient_Equipe(id_personnel=staff1.id, id_equipe=team.id_equipe)
        db.add(member)
        await db.commit()

        fetched_by_staff = await get_project(id_projet=project.id_projet, db=db, current_user=staff1)
        assert fetched_by_staff.id_projet == project.id_projet
        print("   [OK] Le membre de l'équipe a bien accès au projet.")

        # --- TEST 3: Modification ---
        print("6. Test de modification de projet...")
        update_schema = ProjetBase(
            titre="Projet Test Modifié",
            description="Nouvelle description",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="faible",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin1.id
        )

        updated_project = await update_project(id_projet=project.id_projet, project_update=update_schema, db=db, current_user=admin1)
        assert updated_project.titre == "Projet Test Modifié"
        print("   [OK] Projet modifié avec succès par le superviseur.")

        try:
            await update_project(id_projet=project.id_projet, project_update=update_schema, db=db, current_user=admin2)
            raise AssertionError("Un autre administrateur a pu modifier le projet.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus de modification par un autre administrateur (HTTP 403).")

        # --- TEST 4: Suppression ---
        print("7. Test de suppression de projet...")
        try:
            await delete_project(id_projet=project.id_projet, db=db, current_user=admin2)
            raise AssertionError("Un autre administrateur a pu supprimer le projet.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus de suppression par un autre administrateur (HTTP 403).")

        await delete_project(id_projet=project.id_projet, db=db, current_user=admin1)
        print("   [OK] Projet supprimé avec succès par le superviseur.")

        try:
            await get_project(id_projet=project.id_projet, db=db, current_user=admin1)
            raise AssertionError("Le projet existe encore après suppression.")
        except HTTPException as e:
            assert e.status_code == 404
            print("   [OK] Projet introuvable après suppression (HTTP 404).")

        # --- NETTOYAGE ---
        print("8. Nettoyage final...")
        await clean_db(db)
        print("Tous les tests du module projets ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_project_flow())
