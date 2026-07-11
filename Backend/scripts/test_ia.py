import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.ia.routes import rediger_description, suggerer_priorite, repartir_taches, identifier_risques_retard
from Backend import Schemas

TEST_IA_EMAIL = "test_ia_user@taskmanager.com"

async def clean_db(db):
    # Clean tasks & assignations
    await db.execute(text("""
        DELETE FROM tache_assignations 
        WHERE id_utilisateur IN (SELECT id FROM users WHERE email = :email)
    """), {"email": TEST_IA_EMAIL})
    await db.execute(text("""
        DELETE FROM taches 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email = :email
            )
        )
    """), {"email": TEST_IA_EMAIL})
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_IA_EMAIL})
    await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": TEST_IA_EMAIL})
    await db.commit()

async def test_ia_module():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création de l'utilisateur...")
    async with SessionLocal() as db:
        user = models.User(nom="IA User", email=TEST_IA_EMAIL, motdepasse="pwd", role="admin", actif=True)
        db.add(user)
        await db.commit()
        user_id = user.id
        
        # User object for Depends
        user_res = await db.execute(select(models.User).where(models.User.id == user_id))
        current_user = user_res.scalar_one()

    print("3. Test 7.2 : Aide à la rédaction de description...")
    # Test task title with bug
    req_bug = Schemas.IARedigerRequest(titre="Correction du bug de connexion", type="tache")
    res_bug = await rediger_description(req=req_bug, current_user=current_user)
    assert "🐛 Objectif" in res_bug["description"]
    assert "reproduire l'anomalie" in res_bug["description"].lower()

    # Test project title
    req_proj = Schemas.IARedigerRequest(titre="Nouveau Site E-commerce", type="projet")
    res_proj = await rediger_description(req=req_proj, current_user=current_user)
    assert "🎯 Vision du Projet" in res_proj["description"]
    print("   [OK] Aide à la rédaction fonctionnelle (tâche bug & projet).")

    print("4. Test 7.3 : Suggestion de priorités...")
    # Test high priority due to deadline
    req_prio_date = Schemas.IASuggererPrioriteRequest(
        titre="Rédaction rapport final",
        date_echeance=datetime.now() + timedelta(hours=24)
    )
    res_prio_date = await suggerer_priorite(req=req_prio_date, current_user=current_user)
    assert res_prio_date["priorite"] == "haute"

    # Test high priority due to keywords
    req_prio_key = Schemas.IASuggererPrioriteRequest(
        titre="CRASH CRITIQUE sur production",
        description="Le serveur est hors-ligne"
    )
    res_prio_key = await suggerer_priorite(req=req_prio_key, current_user=current_user)
    assert res_prio_key["priorite"] == "haute"
    print("   [OK] Suggestion de priorité fonctionnelle (par date et mots-clés).")

    print("5. Test 7.4 : Répartition optimale des tâches...")
    async with SessionLocal() as db:
        # Create project
        proj = models.Projet(
            titre="Projet IA",
            description="Test IA allocations",
            dateDebut=datetime.now().date(),
            dateFin=datetime.now().date() + timedelta(days=10),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=user_id
        )
        db.add(proj)
        await db.commit()
        proj_id = proj.id_projet

        # Let's request task allocation simulation
        req_repartir = Schemas.IARepartirRequest(id_projet=proj_id, tache_ids=[101, 102, 103])
        res_repartir = await repartir_taches(req=req_repartir, db=db, current_user=current_user)
        
        # Since user_id is the only member, all tasks must be allocated to user_id
        assert len(res_repartir["repartition"]) == 3
        for item in res_repartir["repartition"]:
            assert item["id_utilisateur"] == user_id
        print("   [OK] Répartition optimale calculée.")

    print("6. Test 7.5 : Anticipation des risques de retard...")
    async with SessionLocal() as db:
        # Create a task in progress with overdue deadline
        t1 = models.Tache(
            titre="Tâche en retard",
            description="Tâche de test",
            priorite="haute",
            statut="en_cours",
            echeance=(datetime.now() - timedelta(days=1)).date(),
            id_projet=proj_id
        )
        db.add(t1)
        await db.commit()

        res_risques = await identifier_risques_retard(id_projet=proj_id, db=db, current_user=current_user)
        assert len(res_risques["risques"]) == 1
        assert res_risques["risques"][0]["risque"] == "eleve"
        assert "Échéance dépassée" in res_risques["risques"][0]["raison"]
        print("   [OK] Identification des risques de retard fonctionnelle.")

    print("7. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module IA ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_ia_module())
