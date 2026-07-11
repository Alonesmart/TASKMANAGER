import asyncio
from datetime import date
from fastapi import HTTPException, Request
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.auth.routes import RequireProjectRole
from Backend import models

TEST_ADMIN_EMAIL = "test_roles_admin@taskmanager.com"
TEST_CHEF_EMAIL = "test_roles_chef@taskmanager.com"
TEST_COLLAB_EMAIL = "test_roles_collab@taskmanager.com"
TEST_EXTERNAL_EMAIL = "test_roles_ext@taskmanager.com"
TEST_STRANGER_EMAIL = "test_roles_stranger@taskmanager.com"
TEST_TEAM_EMAIL = "test_roles_team_member@taskmanager.com"

async def clean_db(db):
    emails = [TEST_ADMIN_EMAIL, TEST_CHEF_EMAIL, TEST_COLLAB_EMAIL, TEST_EXTERNAL_EMAIL, TEST_STRANGER_EMAIL, TEST_TEAM_EMAIL]

    for email in emails:
        # Clean teams and member mappings
        await db.execute(text("""
            DELETE FROM appartient_equipe 
            WHERE id_equipe IN (
                SELECT id_equipe FROM equipes 
                WHERE id_projet IN (
                    SELECT id_projet FROM projets WHERE id_administrateur IN (
                        SELECT id FROM users WHERE email = :email
                    )
                )
            )
        """), {"email": email})
        await db.execute(text("""
            DELETE FROM equipes 
            WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email = :email
                )
            )
        """), {"email": email})

        # Clean project roles
        await db.execute(text("""
            DELETE FROM projet_membre_roles 
            WHERE id_projet IN (
                SELECT id_projet FROM projets WHERE id_administrateur IN (
                    SELECT id FROM users WHERE email = :email
                )
            )
        """), {"email": email})

        # Clean tasks and comments
        await db.execute(text("""
            DELETE FROM commentaires 
            WHERE id_tache IN (
                SELECT id_tache FROM taches WHERE id_projet IN (
                    SELECT id_projet FROM projets WHERE id_administrateur IN (
                        SELECT id FROM users WHERE email = :email
                    )
                )
            )
        """), {"email": email})
        await db.execute(text("""
            DELETE FROM tache_assignations 
            WHERE id_tache IN (
                SELECT id_tache FROM taches WHERE id_projet IN (
                    SELECT id_projet FROM projets WHERE id_administrateur IN (
                        SELECT id FROM users WHERE email = :email
                    )
                )
            )
        """), {"email": email})
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

async def test_project_roles():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création des utilisateurs...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Global Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        chef = models.Personnel(nom="Chef Projet", email=TEST_CHEF_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        collab = models.Personnel(nom="Collab", email=TEST_COLLAB_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        external = models.Personnel(nom="External", email=TEST_EXTERNAL_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        stranger = models.Personnel(nom="Stranger", email=TEST_STRANGER_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        team_member = models.Personnel(nom="Team Member", email=TEST_TEAM_EMAIL, motdepasse="pwd", role="personnel", actif=True)

        db.add_all([admin, chef, collab, external, stranger, team_member])
        await db.commit()

        admin_id = admin.id
        chef_id = chef.id
        collab_id = collab.id
        external_id = external.id
        stranger_id = stranger.id
        team_member_id = team_member.id

    print("3. Création du projet et des rôles...")
    async with SessionLocal() as db:
        # Create project under admin
        project = models.Projet(
            titre="Role Test Project",
            description="Testing RequireProjectRole",
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

        # Add chef role manually to ProjetMembreRole
        role_chef = models.ProjetMembreRole(id_projet=project_id, id_utilisateur=chef_id, role="chef_projet")
        role_collab = models.ProjetMembreRole(id_projet=project_id, id_utilisateur=collab_id, role="collaborateur")
        role_ext = models.ProjetMembreRole(id_projet=project_id, id_utilisateur=external_id, role="invite_externe")

        # Create a team and add team_member to it
        team = models.Equipe(nom="Role Test Team", description="Test team", id_projet=project_id, id_personnel_createur=admin_id)
        db.add(team)
        await db.flush()
        team_id = team.id_equipe

        team_link = models.Appartient_Equipe(id_equipe=team_id, id_personnel=team_member_id)

        # Create a task for this project
        task = models.Tache(titre="Test Task", description="Testing task access", priorite="moyenne", statut="a_faire", id_projet=project_id)
        db.add(task)
        await db.flush()
        task_id = task.id_tache

        db.add_all([role_chef, role_collab, role_ext, team_link])
        await db.commit()

    print("4. Test de la dépendance RequireProjectRole...")
    # Helper function to invoke dependency
    async def run_dep(allowed_roles, path_params, path, user_id):
        async with SessionLocal() as db:
            user = await db.get(models.User, user_id)
            dep = RequireProjectRole(allowed_roles)
            scope = {
                "type": "http",
                "path": path,
                "headers": [],
                "path_params": path_params,
                "query_string": b"",
            }
            req = Request(scope)
            try:
                res = await dep(request=req, db=db, current_user=user)
                return res
            except HTTPException as e:
                return e

    # Test Cases for path parameter: id_projet
    print("   Testing path param: id_projet")
    # chef_projet should access chef_projet allowed
    res = await run_dep(["chef_projet"], {"id_projet": str(project_id)}, f"/api/v1/core/projets/{project_id}", chef_id)
    assert res == project_id
    
    # collab should NOT access chef_projet allowed
    res = await run_dep(["chef_projet"], {"id_projet": str(project_id)}, f"/api/v1/core/projets/{project_id}", collab_id)
    assert isinstance(res, HTTPException) and res.status_code == 403

    # collab should access collaborateur allowed
    res = await run_dep(["chef_projet", "collaborateur"], {"id_projet": str(project_id)}, f"/api/v1/core/projets/{project_id}", collab_id)
    assert res == project_id

    # stranger should NOT access anything
    res = await run_dep(["chef_projet", "collaborateur", "invite_externe"], {"id_projet": str(project_id)}, f"/api/v1/core/projets/{project_id}", stranger_id)
    assert isinstance(res, HTTPException) and res.status_code == 403

    # team_member should be treated as collaborateur and succeed
    res = await run_dep(["collaborateur"], {"id_projet": str(project_id)}, f"/api/v1/core/projets/{project_id}", team_member_id)
    assert res == project_id

    # Test Cases for path parameter: id_tache
    print("   Testing path param: id_tache")
    # chef should access task actions
    res = await run_dep(["chef_projet"], {"id_tache": str(task_id)}, f"/api/v1/core/taches/{task_id}", chef_id)
    assert res == project_id

    # collab should fail for chef actions
    res = await run_dep(["chef_projet"], {"id_tache": str(task_id)}, f"/api/v1/core/taches/{task_id}", collab_id)
    assert isinstance(res, HTTPException) and res.status_code == 403

    # stranger should fail
    res = await run_dep(["chef_projet", "collaborateur"], {"id_tache": str(task_id)}, f"/api/v1/core/taches/{task_id}", stranger_id)
    assert isinstance(res, HTTPException) and res.status_code == 403

    print("   [OK] Tous les cas de test RequireProjectRole ont réussi !")

    print("5. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)

if __name__ == "__main__":
    asyncio.run(test_project_roles())
