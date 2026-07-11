import asyncio
from datetime import date
from fastapi import HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.teams.routes import create_team, add_team_member, remove_team_member, get_team_members, sync_team_members
from Backend.modules.project.routes import create_project
from Backend.Schemas import EquipeCreate, AppartientEquipeCreate, ProjetCreate
from Backend import models

TEST_ADMIN_EMAIL = "test_team_admin@taskmanager.com"
TEST_OTHER_ADMIN_EMAIL = "test_team_other_admin@taskmanager.com"
TEST_STAFF_EMAIL = "test_team_staff@taskmanager.com"
TEST_OTHER_STAFF_EMAIL = "test_team_other_staff@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_OTHER_ADMIN_EMAIL, TEST_STAFF_EMAIL, TEST_OTHER_STAFF_EMAIL]
    
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

async def test_teams_flow():
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
            titre="Projet pour Equipes Test",
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

    # --- TEST 1: Création d'équipe ---
    print("4. Test de création d'équipe...")
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        team_schema = EquipeCreate(
            nom="Equipe Giga Projet",
            description="L'équipe de choc",
            id_projet=project_id
        )
        team = await create_team(team=team_schema, db=db, current_user=admin1)
        assert team.nom == "Equipe Giga Projet"
        team_id = team.id_equipe
        print("   [OK] Équipe créée avec succès par le superviseur admin.")

    # Test duplication
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        team_schema = EquipeCreate(
            nom="Equipe Giga Projet",
            description="L'équipe de choc",
            id_projet=project_id
        )
        try:
            await create_team(team=team_schema, db=db, current_user=admin1)
            raise AssertionError("Plusieurs équipes créées pour le même projet.")
        except HTTPException as e:
            assert e.status_code == 409
            print("   [OK] Conflit levé si une équipe existe déjà pour le projet (HTTP 409).")

    # Test autre admin
    async with SessionLocal() as db:
        admin2 = await db.get(models.User, admin2_id)
        team_schema2 = EquipeCreate(
            nom="Equipe Autre Projet",
            description="Autre description",
            id_projet=project_id
        )
        try:
            await create_team(team=team_schema2, db=db, current_user=admin2)
            raise AssertionError("Un autre admin a pu créer une équipe.")
        except HTTPException as e:
            assert e.status_code == 403
            print("   [OK] Refus de création par un autre administrateur (HTTP 403).")

    # --- TEST 2: Ajout de membres ---
    print("5. Test d'ajout de membres...")
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        member_data = AppartientEquipeCreate(id_utilisateur=staff1_id, id_equipe=team_id)
        added_member = await add_team_member(id_equipe=team_id, member_data=member_data, db=db, current_user=admin1)
        assert added_member["id_utilisateur"] == staff1_id
        print("   [OK] Collaborateur staff1 ajouté avec succès par l'admin.")

    # Ajout doublon
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        member_data = AppartientEquipeCreate(id_utilisateur=staff1_id, id_equipe=team_id)
        try:
            await add_team_member(id_equipe=team_id, member_data=member_data, db=db, current_user=admin1)
            raise AssertionError("Un membre a pu être ajouté deux fois.")
        except HTTPException as e:
            assert e.status_code == 409
            print("   [OK] Refus d'ajout si le collaborateur est déjà membre (HTTP 409).")

    # Ajout admin
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        member_admin_data = AppartientEquipeCreate(id_utilisateur=admin2_id, id_equipe=team_id)
        try:
            await add_team_member(id_equipe=team_id, member_data=member_admin_data, db=db, current_user=admin1)
            raise AssertionError("Un administrateur a pu être ajouté à l'équipe.")
        except HTTPException as e:
            assert e.status_code == 400
            print("   [OK] Refus d'ajouter un admin comme membre d'une équipe (HTTP 400).")

    # --- TEST 3: Consultation ---
    print("6. Test de récupération des membres...")
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        members = await get_team_members(id_equipe=team_id, db=db, current_user=admin1)
        assert len(members) == 1
        assert members[0].id == staff1_id
        print("   [OK] Les membres de l'équipe ont été listés avec succès.")

    # --- TEST 4: Synchronisation ---
    print("7. Test de synchronisation des membres...")
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        sync_result = await sync_team_members(id_equipe=team_id, user_ids=[staff1_id, staff2_id], db=db, current_user=admin1)
        assert sync_result["count"] == 2

    # Vérification
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        members_sync = await get_team_members(id_equipe=team_id, db=db, current_user=admin1)
        assert len(members_sync) == 2
        print("   [OK] Synchronisation des membres réussie.")

    # --- TEST 5: Suppression d'un membre ---
    print("8. Test de suppression d'un membre...")
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        await remove_team_member(id_equipe=team_id, id_utilisateur=staff2_id, db=db, current_user=admin1)

    # Vérification
    async with SessionLocal() as db:
        admin1 = await db.get(models.User, admin1_id)
        members_after = await get_team_members(id_equipe=team_id, db=db, current_user=admin1)
        assert len(members_after) == 1
        assert members_after[0].id == staff1_id
        print("   [OK] Membre supprimé avec succès.")

    # --- NETTOYAGE ---
    print("9. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module équipes ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_teams_flow())
