import os
import sys
import asyncio
from datetime import date

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import SessionLocal
from Backend import models, Schemas
from Backend.modules.reports.routes import (
    creer_rapport, soumettre_rapport, valider_rapport, rejeter_rapport, recuperer_historique_rapport
)
from sqlalchemy import text

TEST_USER_AUTHOR = "test_rep_author@taskmanager.com"
TEST_USER_MANAGER = "test_rep_manager@taskmanager.com"
TEST_USER_RANDOM = "test_rep_random@taskmanager.com"

async def test_reports_flow():
    print("Testing reports validation lifecycle...")
    async with SessionLocal() as db:
        # Nettoyage plus agressif
        await db.execute(text("DELETE FROM historique_rapports WHERE id_rapport IN (SELECT id_rapport FROM rapports WHERE titre LIKE 'Test %')"))
        await db.execute(text("DELETE FROM rapports WHERE titre LIKE 'Test %'"))
        await db.execute(text("DELETE FROM projet_membre_roles WHERE id_projet IN (SELECT id_projet FROM projets WHERE titre = 'Test Project')"))
        await db.execute(text("DELETE FROM projets WHERE titre = 'Test Project'"))
        await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email IN (:u1, :u2, :u3))"), {"u1": TEST_USER_AUTHOR, "u2": TEST_USER_MANAGER, "u3": TEST_USER_RANDOM})
        await db.execute(text("DELETE FROM users WHERE email IN (:u1, :u2, :u3)"), {"u1": TEST_USER_AUTHOR, "u2": TEST_USER_MANAGER, "u3": TEST_USER_RANDOM})
        # Au cas où, nettoyer tout ce qui reste
        await db.execute(text("DELETE FROM historique_rapports WHERE id_rapport NOT IN (SELECT id_rapport FROM rapports)"))
        await db.commit()

        # Création des utilisateurs
        author = models.Personnel(nom="Author", email=TEST_USER_AUTHOR, motdepasse="pass", role="personnel", actif=True)
        manager = models.Personnel(nom="Manager", email=TEST_USER_MANAGER, motdepasse="pass", role="personnel", actif=True)
        random_user = models.Personnel(nom="Random", email=TEST_USER_RANDOM, motdepasse="pass", role="personnel", actif=True)
        db.add(author)
        db.add(manager)
        db.add(random_user)
        await db.commit()
        await db.refresh(author)
        await db.refresh(manager)
        await db.refresh(random_user)

        # Création d'un projet
        project = models.Projet(titre="Test Project", description="Desc", dateDebut=date.today(), dateFin=date.today(), id_administrateur=manager.id)
        db.add(project)
        await db.commit()
        await db.refresh(project)

        # Ajouter l'auteur au projet comme collaborateur
        db.add(models.ProjetMembreRole(id_projet=project.id_projet, id_utilisateur=author.id, role="collaborateur"))
        # Ajouter le manager au projet comme chef de projet
        db.add(models.ProjetMembreRole(id_projet=project.id_projet, id_utilisateur=manager.id, role="chef_projet"))
        await db.commit()

        # 1. Tester la création en brouillon
        rapport_create = Schemas.RapportCreate(
            titre="Test Report 1",
            contenu="Initial Content",
            type="progression",
            id_projet=project.id_projet
        )
        rep = await creer_rapport(rapport_create, db, author)
        print(f"Created report ID: {rep.id_rapport}")
        assert rep.statut == "brouillon", "Default status should be 'brouillon'!"
        print("  [OK] Default status is 'brouillon'.")

        # Vérifier que l'historique contient la création (filtré par id_rapport)
        try:
            history_all = await recuperer_historique_rapport(rep.id_rapport, db, author)
            history = [h for h in history_all if h.id_rapport == rep.id_rapport]
        except Exception as e:
            print(f"DEBUG: Error retrieving history: {e}")
            raise e
        print(f"DEBUG: History count (filtered): {len(history)}")
        assert len(history) == 1, f"Should have 1 history entry for this report, got {len(history)}"
        assert history[0].nouveau_statut == "brouillon"
        print("  [OK] History log for creation verified.")

        # 2. Tester la soumission par l'auteur
        rep = await soumettre_rapport(rep.id_rapport, db, author)
        assert rep.statut == "soumis", "Status should transition to 'soumis'!"
        assert rep.date_soumission is not None, "date_soumission should be set!"
        print("  [OK] Report successfully submitted.")

        # Vérifier historique après soumission (filtré)
        history_all = await recuperer_historique_rapport(rep.id_rapport, db, author)
        history = [h for h in history_all if h.id_rapport == rep.id_rapport]
        assert len(history) == 2
        assert history[1].nouveau_statut == "soumis"
        print("  [OK] History log for submission verified.")

        # 3. Tester la validation
        # a. Essayer de valider par un utilisateur non autorisé (random_user) -> doit échouer
        try:
            val_in = Schemas.RapportValidation(commentaire="Looks good")
            await valider_rapport(rep.id_rapport, val_in, db, random_user)
            raise AssertionError("Random user was able to validate the report!")
        except Exception as e:
            print(f"  [OK] Unauthorized validation rejected correctly: {e}")

        # b. Valider par le manager (chef_projet)
        val_in = Schemas.RapportValidation(commentaire="Approved by manager")
        rep = await valider_rapport(rep.id_rapport, val_in, db, manager)
        assert rep.statut == "valide"
        assert rep.date_validation is not None
        assert rep.commentaire_validation == "Approved by manager"
        print("  [OK] Report approved by manager.")

        # Vérifier historique après validation
        history = await recuperer_historique_rapport(rep.id_rapport, db, manager)
        assert len(history) == 3
        assert history[2].nouveau_statut == "valide"
        assert history[2].commentaire == "Approved by manager"
        print("  [OK] History log for validation verified.")

        # 4. Tester le rejet
        # Création d'un second rapport pour tester le rejet
        rapport_create2 = Schemas.RapportCreate(
            titre="Test Report 2",
            contenu="Some content",
            type="progression",
            id_projet=project.id_projet
        )
        rep2 = await creer_rapport(rapport_create2, db, author)
        rep2 = await soumettre_rapport(rep2.id_rapport, db, author)

        # a. Rejet sans commentaire (doit échouer)
        try:
            rej_in = Schemas.RapportValidation(commentaire="")
            await rejeter_rapport(rep2.id_rapport, rej_in, db, manager)
            raise AssertionError("Was able to reject report without mandatory comment!")
        except Exception as e:
            print(f"  [OK] Rejection without comment rejected correctly: {e}")

        # b. Rejet avec commentaire
        rej_in = Schemas.RapportValidation(commentaire="Needs more info")
        rep2 = await rejeter_rapport(rep2.id_rapport, rej_in, db, manager)
        assert rep2.statut == "rejete"
        assert rep2.commentaire_validation == "Needs more info"
        print("  [OK] Report rejected with mandatory comment.")

        # 5. Tester la resoumission après rejet
        rep2 = await soumettre_rapport(rep2.id_rapport, db, author)
        assert rep2.statut == "soumis"
        print("  [OK] Author was able to resubmit a rejected report.")

        # Nettoyage
        await db.execute(text("DELETE FROM historique_rapports WHERE id_rapport IN (:r1, :r2)"), {"r1": rep.id_rapport, "r2": rep2.id_rapport})
        await db.execute(text("DELETE FROM rapports WHERE id_rapport IN (:r1, :r2)"), {"r1": rep.id_rapport, "r2": rep2.id_rapport})
        await db.execute(text("DELETE FROM projet_membre_roles WHERE id_utilisateur IN (:u1, :u2, :u3)"), {"u1": author.id, "u2": manager.id, "u3": random_user.id})
        await db.execute(text("DELETE FROM projets WHERE id_projet = :pid"), {"pid": project.id_projet})
        await db.execute(text("DELETE FROM personnels WHERE id IN (:u1, :u2, :u3)"), {"u1": author.id, "u2": manager.id, "u3": random_user.id})
        await db.execute(text("DELETE FROM users WHERE id IN (:u1, :u2, :u3)"), {"u1": author.id, "u2": manager.id, "u3": random_user.id})
        await db.commit()
        
    print("All reports validation lifecycle tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_reports_flow())
