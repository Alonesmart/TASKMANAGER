import asyncio
from datetime import date
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.reports.routes import creer_rapport, recuperer_mes_rapports, modifier_rapport, soumettre_rapport
from Backend.modules.project.routes import create_project
from Backend.Schemas import RapportCreate, ProjetCreate
from Backend import models

TEST_ADMIN_EMAIL = "test_rep_admin@taskmanager.com"
TEST_OTHER_ADMIN_EMAIL = "test_rep_other_admin@taskmanager.com"
TEST_STAFF_EMAIL = "test_rep_staff@taskmanager.com"
TEST_OTHER_STAFF_EMAIL = "test_rep_other_staff@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_OTHER_ADMIN_EMAIL, TEST_STAFF_EMAIL, TEST_OTHER_STAFF_EMAIL]
    
    # Suppression en cascade des rapports
    await db.execute(text("""
        DELETE FROM rapports 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email IN (:e1, :e2)
            )
        )
    """), {"e1": TEST_ADMIN_EMAIL, "e2": TEST_OTHER_ADMIN_EMAIL})

    # Suppression en cascade des rôles
    await db.execute(text("""
        DELETE FROM projet_membre_roles 
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

async def test_reports_flow():
    # --- ETAPE 1: NETTOYAGE ---
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    # --- ETAPE 2: UTILISATEURS ---
    print("2. Création des utilisateurs de test...")
    async with SessionLocal() as db:
        admin1 = models.Administrateur(nom="Admin 1", email=TEST_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        admin2 = models.Administrateur(nom="Admin 2", email=TEST_OTHER_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        staff1 = models.Personnel(nom="Staff 1", email=TEST_STAFF_EMAIL, motdepasse="hash", role="personnel", actif=True)
        staff2 = models.Personnel(nom="Staff 2", email=TEST_OTHER_STAFF_EMAIL, motdepasse="hash", role="personnel", actif=True)
        
        db.add_all([admin1, admin2, staff1, staff2])
        await db.commit()
        
        admin1_id = admin1.id
        admin2_id = admin2.id
        staff1_id = staff1.id
        staff2_id = staff2.id

    # --- ETAPE 3: PROJET ---
    print("3. Création du projet...")
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        proj_schema = ProjetCreate(
            titre="Projet pour Rapports Test",
            description="Description du projet",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin1_id
        )
        project = await create_project(project=proj_schema, db=db, current_user=admin1)
        project_id = project.id_projet

        # Ajouter staff1_id en tant que collaborateur sur ce projet pour le test
        role_link = models.ProjetMembreRole(
            id_projet=project_id,
            id_utilisateur=staff1_id,
            role="collaborateur"
        )
        db.add(role_link)
        await db.commit()

    # --- TEST 1: Création de rapport ---
    print("4. Test de création de rapport...")
    async with SessionLocal() as db:
        staff1 = await db.get(models.User, staff1_id)
        rapport_schema = RapportCreate(
            titre="Rapport d'activité Hebdo",
            contenu="J'ai bien avancé sur les tests unitaires.",
            type="hebdomadaire",
            id_projet=project_id
        )
        rapport = await creer_rapport(rapport_in=rapport_schema, db=db, current_user=staff1)
        assert rapport.titre == "Rapport d'activité Hebdo"
        assert rapport.statut == "brouillon"
        rapport_id = rapport.id_rapport
        print("   [OK] Rapport créé avec succès par le personnel.")

    # Essayer de créer un rapport en tant qu'admin
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        rapport_schema = RapportCreate(
            titre="Rapport Admin",
            contenu="Je ne devrais pas pouvoir créer de rapport.",
            type="mensuel",
            id_projet=project_id
        )
        try:
            await creer_rapport(rapport_in=rapport_schema, db=db, current_user=admin1)
            raise AssertionError("Un administrateur a pu créer un rapport.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Interdiction aux administrateurs de créer un rapport (HTTP 403).")

    # --- TEST 2: Mes Rapports ---
    print("5. Test de récupération des rapports personnels...")
    async with SessionLocal() as db:
        staff1 = await db.get(models.User, staff1_id)
        mes_rapports = await recuperer_mes_rapports(db=db, current_user=staff1)
        assert len(mes_rapports) == 1
        assert mes_rapports[0].id_rapport == rapport_id
        print("   [OK] Rapports personnels récupérés avec succès.")

    # --- TEST 3: Validation / Modification statut ---
    print("6. Test de modification du statut du rapport...")
    # Soumission par le personnel
    async with SessionLocal() as db:
        staff1 = await db.get(models.User, staff1_id)
        await soumettre_rapport(id_rapport=rapport_id, db=db, current_user=staff1)
        print("   [OK] Rapport soumis avec succès par le personnel.")

    # Validation par l'admin
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        from Backend.modules.reports.routes import valider_rapport
        from Backend.Schemas import RapportValidation
        rapport_valide = await valider_rapport(id_rapport=rapport_id, validation_in=RapportValidation(commentaire="Validation par admin"), db=db, current_user=admin1)
        assert rapport_valide.statut == "valide"
        print("   [OK] Statut du rapport modifié en 'valide' par l'administrateur.")

    # Tentative de modification par un membre du personnel
    async with SessionLocal() as db:
        staff1 = await db.get(models.User, staff1_id)
        try:
            from Backend.modules.reports.routes import valider_rapport
            from Backend.Schemas import RapportValidation
            await valider_rapport(id_rapport=rapport_id, validation_in=RapportValidation(commentaire="Validation par staff"), db=db, current_user=staff1)
            raise AssertionError("Un membre du personnel a pu valider un rapport.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus de validation de statut par un non-administrateur (HTTP 403).")

    # --- NETTOYAGE ---
    print("7. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module rapports ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_reports_flow())
