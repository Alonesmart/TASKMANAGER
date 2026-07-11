import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from ...database import get_db
from ... import models, Schemas
from ..auth import get_current_user, RequireProjectRole
from datetime import datetime

router = APIRouter(prefix="/api/v1/documents", tags=["Module Documents"])

# Physical upload storage directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Backend/uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper to verify project access for document operations
async def ensure_document_access(db: AsyncSession, id_projet: Optional[int], id_tache: Optional[int], user: models.User):
    from ..project.routes import user_can_access_project
    
    if id_projet:
        proj_res = await db.execute(select(models.Projet).where(models.Projet.id_projet == id_projet))
        project = proj_res.scalar_one_or_none()
        if not project or not await user_can_access_project(db, project, user):
            raise HTTPException(status_code=403, detail="Accès au projet refusé")
            
    if id_tache:
        task_res = await db.execute(select(models.Tache).where(models.Tache.id_tache == id_tache))
        task = task_res.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Tâche non trouvée")
        proj_res = await db.execute(select(models.Projet).where(models.Projet.id_projet == task.id_projet))
        project = proj_res.scalar_one_or_none()
        if not project or not await user_can_access_project(db, project, user):
            raise HTTPException(status_code=403, detail="Accès au projet de la tâche refusé")

@router.post("/upload", response_model=Schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    id_projet_str: Optional[str] = Form(None, alias="id_projet"),
    id_tache_str: Optional[str] = Form(None, alias="id_tache"),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Robust parsing of optional multipart integers
    id_projet = int(id_projet_str) if id_projet_str and id_projet_str.isdigit() else None
    id_tache = int(id_tache_str) if id_tache_str and id_tache_str.isdigit() else None

    # Check permissions
    await ensure_document_access(db, id_projet, id_tache, current_user)

    # Read file content and size
    file_content = await file.read()
    file_size = len(file_content)

    # Generate unique stored filename to avoid collisions
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save to disk
    with open(file_path, "wb") as f:
        f.write(file_content)

    # Register in DB
    db_doc = models.Document(
        nom_original=file.filename or "unnamed",
        nom_stocke=unique_filename,
        type_mime=file.content_type or "application/octet-stream",
        taille=file_size,
        chemin=file_path,
        id_projet=id_projet,
        id_tache=id_tache,
        id_uploader=current_user.id,
        date_upload=datetime.utcnow()
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)
    return db_doc

@router.get("/{id}/download", dependencies=[Depends(RequireProjectRole(["chef_projet", "collaborateur", "invite_externe"]))])
async def download_document(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Document).where(models.Document.id == id))
    db_doc = result.scalar_one_or_none()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    if not os.path.exists(db_doc.chemin):
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur")

    return FileResponse(
        path=db_doc.chemin,
        media_type=db_doc.type_mime,
        filename=db_doc.nom_original
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Document).where(models.Document.id == id))
    db_doc = result.scalar_one_or_none()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    # Verify uploader owner, or chef_projet, or global admin
    is_owner = db_doc.id_uploader == current_user.id
    is_admin_or_chef = False
    if current_user.role == "admin":
        is_admin_or_chef = True
    elif db_doc.id_projet:
        from ..invitations.routes import verify_project_role
        try:
            await verify_project_role(db, db_doc.id_projet, current_user, ["chef_projet"])
            is_admin_or_chef = True
        except Exception:
            pass

    if not is_owner and not is_admin_or_chef:
        raise HTTPException(status_code=403, detail="Vous n'avez pas l'autorisation de supprimer ce document")

    # Delete physical file
    try:
        if os.path.exists(db_doc.chemin):
            os.remove(db_doc.chemin)
    except Exception as e:
        print(f"Erreur lors de la suppression du fichier physique : {e}")

    await db.delete(db_doc)
    await db.commit()
    return

@router.get("/projet/{id_projet}", response_model=List[Schemas.DocumentOut], dependencies=[Depends(RequireProjectRole(["chef_projet", "collaborateur", "invite_externe"]))])
async def lister_documents_projet(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Document).where(models.Document.id_projet == id_projet))
    return result.scalars().all()

@router.get("/tache/{id_tache}", response_model=List[Schemas.DocumentOut], dependencies=[Depends(RequireProjectRole(["chef_projet", "collaborateur", "invite_externe"]))])
async def lister_documents_tache(
    id_tache: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Document).where(models.Document.id_tache == id_tache))
    return result.scalars().all()

# --- ALIASES AND DIRECT ENDPOINTS ACCORDING TO DEMARCHE.MD ---

@router.post("", response_model=Schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document_root(
    file: UploadFile = File(...),
    id_projet_str: Optional[str] = Form(None, alias="id_projet"),
    id_tache_str: Optional[str] = Form(None, alias="id_tache"),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return await upload_document(file, id_projet_str, id_tache_str, db, current_user)

@router.get("", response_model=List[Schemas.DocumentOut])
async def lister_documents_root(
    id_projet: Optional[int] = None,
    id_tache: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    await ensure_document_access(db, id_projet, id_tache, current_user)
    query = select(models.Document)
    if id_projet is not None:
        query = query.where(models.Document.id_projet == id_projet)
    if id_tache is not None:
        query = query.where(models.Document.id_tache == id_tache)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id}", dependencies=[Depends(RequireProjectRole(["chef_projet", "collaborateur", "invite_externe"]))])
async def download_document_root(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return await download_document(id, db, current_user)
