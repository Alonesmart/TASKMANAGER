import os
import sys
import asyncio
from datetime import date

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import SessionLocal
from Backend import models, Schemas
from Backend.modules.tasks.routes import (
    update_task, soumettre_tache_terminee, valider_tache, rejeter_tache, recuperer_historique_validation_tache
)
from sqlalchemy import select

TEST_USER_AUTHOR = "author_task@test.com"
TEST_USER_MANAGER = "manager_task@test.com"
TEST_USER_RANDOM = "random_task@test.com"

async def test_tasks_flow():
    db = SessionLocal()
    
    try:
        # Nettoyage préalable
        await db.execute(models.Notification.__table__.delete().where(models.Notification.message.like("%Test Tache%")))
        await db.execute(models.HistoriqueValidationTache.__table__.delete())
        await db.execute(models.TacheAssignation.__table__.delete())
        await db.execute(models.Tache.__table__.delete())
        await db.execute(models.ProjetMembreRole.__table__.delete())
        await db.execute(models.Projet.__table__.delete())
        await db.execute(models.Personnel.__table__.delete())
        await db.execute(models.User.__table__.delete())
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
        await db.commit()

        # 1. Créer une tâche
        task = models.Tache(titre="Test Tache", description="Tache desc", statut="a_faire", id_projet=project.id_projet)
        db.add(task)
        await db.commit()
        await db.refresh(task)

        # Assigner l'auteur à la tâche
        db.add(models.TacheAssignation(id_tache=task.id_tache, id_utilisateur=author.id))
        await db.commit()
        await db.refresh(task)

        print("[OK] Task created and assigned successfully.")

        # 2. Le collaborateur tente de marquer directement comme terminée (doit échouer)
        try:
            up_in = Schemas.TacheUpdate(statut="terminees")
            await update_task(task.id_tache, up_in, db, author)
            raise AssertionError("Collaborator was able to mark task as completed directly!")
        except Exception as e:
            print(f"  [OK] Direct completion blocked correctly: {e}")

        # 3. Soumettre la tâche avec preuve
        sub_in = Schemas.TacheSubmission(preuve_texte="I did the job")
        task = await soumettre_tache_terminee(task.id_tache, sub_in, db, author)
        assert task.statut == "terminee_en_attente", "Status should be terminee_en_attente"
        assert task.preuve_texte == "I did the job", "Proof text should match"
        print("  [OK] Task successfully submitted for validation.")

        # 4. Vérifier l'historique de soumission
        history = await recuperer_historique_validation_tache(task.id_tache, db, author)
        assert len(history) == 1
        assert history[0].nouveau_statut == "terminee_en_attente"
        print("  [OK] History log for submission verified.")

        # 5. Tentative de validation par un non-responsable (random_user) -> doit échouer
        try:
            val_in = Schemas.TacheValidation(commentaire="Looks good")
            await valider_tache(task.id_tache, val_in, db, random_user)
            raise AssertionError("Random user was able to validate the task!")
        except Exception as e:
            print(f"  [OK] Unauthorized validation rejected correctly: {e}")

        # 6. Tentative de rejet sans commentaire obligatoire -> doit échouer
        try:
            rej_in = Schemas.TacheValidation(commentaire="")
            await rejeter_tache(task.id_tache, rej_in, db, manager)
            raise AssertionError("Manager was able to reject the task without comment!")
        except Exception as e:
            print(f"  [OK] Rejection without comment rejected correctly: {e}")

        # 7. Rejet par le manager avec commentaire obligatoire -> retourne à en_cours
        rej_in = Schemas.TacheValidation(commentaire="Need details")
        task = await rejeter_tache(task.id_tache, rej_in, db, manager)
        assert task.statut == "en_cours", "Status should return to en_cours"
        assert task.commentaire_rejet == "Need details", "Reject comment should match"
        print("  [OK] Task rejected and returned to en_cours.")

        # 8. Re-soumission par le collaborateur
        sub_in = Schemas.TacheSubmission(preuve_texte="Updated proof details")
        task = await soumettre_tache_terminee(task.id_tache, sub_in, db, author)
        assert task.statut == "terminee_en_attente"
        print("  [OK] Task resubmitted successfully.")

        # 9. Validation par le manager -> passe à terminees, progression 100
        val_in = Schemas.TacheValidation(commentaire="Validated")
        task = await valider_tache(task.id_tache, val_in, db, manager)
        assert task.statut == "terminees"
        assert task.progression == 100
        print("  [OK] Task validated, status set to terminees and progression set to 100.")

        # Nettoyage final
        await db.execute(models.Notification.__table__.delete().where(models.Notification.message.like("%Test Tache%")))
        await db.execute(models.HistoriqueValidationTache.__table__.delete())
        await db.execute(models.TacheAssignation.__table__.delete())
        await db.execute(models.Tache.__table__.delete())
        await db.execute(models.ProjetMembreRole.__table__.delete())
        await db.execute(models.Projet.__table__.delete())
        await db.execute(models.Personnel.__table__.delete())
        await db.execute(models.User.__table__.delete())
        await db.commit()

        print("\nAll tasks validation lifecycle tests passed successfully!")

    except Exception as e:
        print(f"\n[FAIL] Test failed: {e}")
        # Nettoyage en cas d'erreur
        await db.rollback()
        raise e
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(test_tasks_flow())
