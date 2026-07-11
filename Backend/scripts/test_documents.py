import asyncio
import io
import os
from datetime import date
from fastapi import UploadFile, HTTPException
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.documents.routes import (
    upload_document, download_document, delete_document,
    lister_documents_projet, lister_documents_tache,
    upload_document_root, lister_documents_root, download_document_root
)
from Backend.modules.project.routes import create_project
from Backend.modules.tasks.routes import create_task
from Backend.Schemas import ProjetCreate, TacheCreate
from Backend import models

TEST_ADMIN_EMAIL = "test_doc_admin@taskmanager.com"

async def clean_db(db):
    # Suppression en cascade des documents
    await db.execute(text("""
        DELETE FROM documents 
        WHERE id_uploader IN (SELECT id FROM users WHERE email = :email)
    """), {"email": TEST_ADMIN_EMAIL})

    # Suppression en cascade des tâches
    await db.execute(text("""
        DELETE FROM taches 
        WHERE id_projet IN (
            SELECT id_projet FROM projets WHERE id_administrateur IN (
                SELECT id FROM users WHERE email = :email
            )
        )
    """), {"email": TEST_ADMIN_EMAIL})

    # Suppression en cascade des projets
    await db.execute(text("DELETE FROM projets WHERE id_administrateur IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_ADMIN_EMAIL})
    
    # Suppression de l'utilisateur
    await db.execute(text("DELETE FROM administrateurs WHERE id IN (SELECT id FROM users WHERE email = :email)"), {"email": TEST_ADMIN_EMAIL})
    await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": TEST_ADMIN_EMAIL})
    await db.commit()

async def test_documents_flow():
    print("1. Nettoyage de la base de données...")
    async with SessionLocal() as db:
        await clean_db(db)

    print("2. Création de l'administrateur de test...")
    async with SessionLocal() as db:
        admin = models.Administrateur(nom="Admin Doc", email=TEST_ADMIN_EMAIL, motdepasse="hash", role="admin", actif=True)
        db.add(admin)
        await db.commit()
        admin_id = admin.id

    print("3. Création du projet et de la tâche...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        
        proj = ProjetCreate(
            titre="Projet Doc Test",
            description="Test docs",
            dateDebut=date.today(),
            dateFin=date.today(),
            priorite="faible",
            statut="actif",
            etat="en_cours",
            id_administrateur=admin_id
        )
        project = await create_project(project=proj, db=db, current_user=admin)
        project_id = project.id_projet

        task_create = TacheCreate(
            titre="Tâche Doc Test",
            description="Test task docs",
            priorite="moyenne",
            statut="a_faire",
            id_projet=project_id,
            assigned_user_ids=[]
        )
        task = await create_task(task=task_create, db=db, current_user=admin)
        task_id = task["id_tache"]

    # --- TEST 1: Upload de document ---
    print("4. Test d'upload de document...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        
        file_content = b"Contenu fictif de fichier de test."
        fake_file = UploadFile(
            file=io.BytesIO(file_content),
            filename="document_de_test.txt"
        )
        
        doc = await upload_document(
            file=fake_file,
            id_projet_str=str(project_id),
            id_tache_str=str(task_id),
            db=db,
            current_user=admin
        )
        
        assert doc.nom_original == "document_de_test.txt"
        assert doc.taille == len(file_content)
        assert os.path.exists(doc.chemin)
        
        doc_id = doc.id
        doc_chemin = doc.chemin
        print(f"   [OK] Fichier uploadé et stocké à : {doc_chemin}")

    # --- TEST 2: Listage des documents ---
    print("5. Test de listage des documents (projet & tâche)...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        
        docs_proj = await lister_documents_projet(id_projet=project_id, db=db, current_user=admin)
        assert len(docs_proj) == 1
        assert docs_proj[0].id == doc_id
        
        docs_task = await lister_documents_tache(id_tache=task_id, db=db, current_user=admin)
        assert len(docs_task) == 1
        assert docs_task[0].id == doc_id

        # Test query parameter-based root listing route
        docs_query_proj = await lister_documents_root(id_projet=project_id, db=db, current_user=admin)
        assert len(docs_query_proj) == 1
        assert docs_query_proj[0].id == doc_id

        docs_query_task = await lister_documents_root(id_tache=task_id, db=db, current_user=admin)
        assert len(docs_query_task) == 1
        assert docs_query_task[0].id == doc_id

        print("   [OK] Listage des documents par projet, tâche et via la route racine filtrée validé.")

    # --- TEST 3: Téléchargement du document ---
    print("6. Test de téléchargement du document...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        response = await download_document(id=doc_id, db=db, current_user=admin)
        assert response.path == doc_chemin
        assert response.filename == "document_de_test.txt"

        # Test direct GET /{id} endpoint
        response_root = await download_document_root(id=doc_id, db=db, current_user=admin)
        assert response_root.path == doc_chemin
        assert response_root.filename == "document_de_test.txt"

        print("   [OK] Téléchargement (routes /download et direct /{id}) validé.")

    # --- TEST 4: Suppression du document ---
    print("7. Test de suppression du document...")
    async with SessionLocal() as db:
        admin = await db.get(models.User, admin_id)
        await delete_document(id=doc_id, db=db, current_user=admin)
        
        # Le fichier physique doit avoir été supprimé
        assert not os.path.exists(doc_chemin)
        
        # L'enregistrement en base doit avoir été supprimé
        docs_after = await lister_documents_projet(id_projet=project_id, db=db, current_user=admin)
        assert len(docs_after) == 0
        print("   [OK] Suppression physique et logique validée.")

    # --- NETTOYAGE ---
    print("8. Nettoyage final...")
    async with SessionLocal() as db:
        await clean_db(db)
        print("Tous les tests du module documents ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_documents_flow())
