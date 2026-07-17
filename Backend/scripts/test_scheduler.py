import asyncio
from datetime import date, timedelta
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.scheduler import check_task_deadlines

TEST_ADMIN_EMAIL = "test_sched_admin@taskmanager.com"
TEST_USER_EMAIL = "test_sched_user@taskmanager.com"

async def clean_db(db):
    # Suppression dans l'ordre inverse des dépendances pour un nettoyage complet et sécurisé
    await db.execute(text("DELETE FROM notifications"))
    await db.execute(text("DELETE FROM tache_assignations"))
    await db.execute(text("DELETE FROM taches"))
    await db.execute(text("DELETE FROM projets"))
    await db.execute(text("DELETE FROM administrateurs"))
    await db.execute(text("DELETE FROM personnels"))
    await db.execute(text("DELETE FROM users"))
    await db.commit()


async def test_scheduler():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création des utilisateurs de test...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Sched Admin", email=TEST_ADMIN_EMAIL, motdepasse="pwd", role="admin", actif=True)
        user = models.Personnel(nom="Sched User", email=TEST_USER_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        db.add_all([admin, user])
        await db.commit()
        admin_id = admin.id
        user_id = user.id

    print("3. Création du projet de test...")
    async with SessionLocal() as db:
        project = models.Projet(
            titre="Sched Project",
            description="Scheduler test project",
            dateDebut=date.today(),
            dateFin=date.today() + timedelta(days=10),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        db.add(project)
        await db.flush()
        project_id = project.id_projet

        print("4. Création des tâches avec différentes échéances...")
        # Task A: 24h deadline (tomorrow)
        task_a = models.Tache(
            titre="Tâche 24h",
            description="Deadline tomorrow",
            priorite="haute",
            statut="a_faire",
            echeance=date.today() + timedelta(days=1),
            id_projet=project_id
        )
        # Task B: 48h deadline (in 2 days)
        task_b = models.Tache(
            titre="Tâche 48h",
            description="Deadline in 2 days",
            priorite="moyenne",
            statut="a_faire",
            echeance=date.today() + timedelta(days=2),
            id_projet=project_id
        )
        # Task C: 72h deadline (in 3 days) - should not trigger notifications
        task_c = models.Tache(
            titre="Tâche 72h",
            description="Deadline in 3 days",
            priorite="faible",
            statut="a_faire",
            echeance=date.today() + timedelta(days=3),
            id_projet=project_id
        )

        db.add_all([task_a, task_b, task_c])
        await db.flush()

        # Assign user to all three tasks by setting relationship AND adding to session
        assign_a = models.TacheAssignation(tache=task_a, id_utilisateur=user_id)
        assign_b = models.TacheAssignation(tache=task_b, id_utilisateur=user_id)
        assign_c = models.TacheAssignation(tache=task_c, id_utilisateur=user_id)

        db.add_all([assign_a, assign_b, assign_c])
        await db.commit()

        task_a_id = task_a.id_tache
        task_b_id = task_b.id_tache
        task_c_id = task_c.id_tache

    print("5. Exécution de check_task_deadlines()...")
    await check_task_deadlines()

    print("6. Vérification des notifications créées...")
    async with SessionLocal() as db:
        # Check notifications for Task A (24h)
        notif_a_res = await db.execute(
            select(models.Notification)
            .where(models.Notification.id_tache == task_a_id, models.Notification.id_utilisateur == user_id)
        )
        notif_a = notif_a_res.scalars().all()
        assert len(notif_a) == 1, f"Attendu 1 notification pour la tâche 24h, obtenu {len(notif_a)}"
        assert "24 heures" in notif_a[0].message
        print("   [OK] Notification de 24h créée avec succès.")

        # Check notifications for Task B (48h)
        notif_b_res = await db.execute(
            select(models.Notification)
            .where(models.Notification.id_tache == task_b_id, models.Notification.id_utilisateur == user_id)
        )
        notif_b = notif_b_res.scalars().all()
        assert len(notif_b) == 1, f"Attendu 1 notification pour la tâche 48h, obtenu {len(notif_b)}"
        assert "48 heures" in notif_b[0].message
        print("   [OK] Notification de 48h créée avec succès.")

        # Check notifications for Task C (72h)
        notif_c_res = await db.execute(
            select(models.Notification)
            .where(models.Notification.id_tache == task_c_id, models.Notification.id_utilisateur == user_id)
        )
        notif_c = notif_c_res.scalars().all()
        assert len(notif_c) == 0, f"Attendu 0 notification pour la tâche 72h, obtenu {len(notif_c)}"
        print("   [OK] Pas de notification créée pour l'échéance de 72h.")

    print("7. Seconde exécution de check_task_deadlines() (test anti-doublon)...")
    await check_task_deadlines()

    async with SessionLocal() as db:
        # Check notifications again
        notif_a_res2 = await db.execute(
            select(models.Notification)
            .where(models.Notification.id_tache == task_a_id, models.Notification.id_utilisateur == user_id)
        )
        assert len(notif_a_res2.scalars().all()) == 1, "Doublon créé pour la tâche 24h !"
        print("   [OK] Le filtre anti-doublon a fonctionné.")

    print("8. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du Scheduler ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_scheduler())
