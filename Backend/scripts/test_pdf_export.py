import asyncio
from datetime import datetime
from sqlalchemy import select, text
from Backend.database import SessionLocal
from Backend import models
from Backend.modules.reports.routes import export_rapport_pdf

TEST_USER_EMAIL = "test_pdf_user@taskmanager.com"

async def clean_db(db):
    # Clean reports
    await db.execute(text("DELETE FROM rapports WHERE id_personnel IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_USER_EMAIL})
    # Clean projects
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_USER_EMAIL})
    # Clean personnels
    await db.execute(text("DELETE FROM personnels WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_USER_EMAIL})
    # Clean users
    await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": TEST_USER_EMAIL})
    await db.commit()

async def test_pdf_export():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création de l'utilisateur (personnel)...")
    async with SessionLocal() as db:
        user = models.Personnel(nom="PDF User", email=TEST_USER_EMAIL, motdepasse="pwd", role="personnel", actif=True)
        db.add(user)
        await db.commit()
        user_id = user.id

    print("3. Création du projet et du rapport...")
    async with SessionLocal() as db:
        p1 = models.Projet(
            titre="Projet PDF",
            description="Test PDF export",
            dateDebut=datetime.now().date(),
            dateFin=datetime.now().date(),
            priorite="moyenne",
            statut="actif",
            etat="en_cours",
            id_administrateur=user_id
        )
        db.add(p1)
        await db.flush()
        p1_id = p1.id_projet

        rapport = models.Rapport(
            titre="Rapport Mensuel PDF Test",
            contenu="Ceci est le contenu du rapport mensuel de test.\nIl contient plusieurs lignes.\nLigne 3.",
            type="mensuel",
            periode="Juillet 2026",
            statut="validated",
            id_projet=p1_id,
            id_personnel=user_id
        )
        db.add(rapport)
        await db.commit()
        rapport_id = rapport.id_rapport

        user_obj_res = await db.execute(select(models.User).where(models.User.id == user_id))
        user_obj = user_obj_res.scalar_one()

    print("4. Test de génération du PDF...")
    async with SessionLocal() as db:
        response = await export_rapport_pdf(id_rapport=rapport_id, db=db, current_user=user_obj)
        
        # Verify response properties
        assert response.media_type == "application/pdf"
        assert "Content-Disposition" in response.headers
        assert "attachment" in response.headers["Content-Disposition"]
        assert "Rapport_Mensuel_PDF_Test.pdf" in response.headers["Content-Disposition"]

        # Consume streaming body to verify it contains PDF bytes
        content = b""
        async for chunk in response.body_iterator:
            content += chunk
        
        assert len(content) > 0
        assert content.startswith(b"%PDF-")  # Every PDF starts with %PDF- header
        print("   [OK] Le document PDF a été généré correctement (%PDF- présent, taille =", len(content), "octets).")

    print("5. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests d'exportation PDF ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_pdf_export())
