import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from ...database import get_db, pwd_context
from ... import models, Schemas
from ..auth import get_current_user

router = APIRouter(tags=["Invitations & Rôles"])

# Helper to verify project role (admin bypass)
async def verify_project_role(db: AsyncSession, id_projet: int, user: models.User, allowed_roles: List[str]):
    project_res = await db.execute(select(models.Projet).where(models.Projet.id_projet == id_projet))
    project = project_res.scalar_one_or_none()
    if project and project.id_administrateur == user.id:
        return "chef_projet"
        
    role_res = await db.execute(
        select(models.ProjetMembreRole.role)
        .where(
            models.ProjetMembreRole.id_projet == id_projet,
            models.ProjetMembreRole.id_utilisateur == user.id
        )
    )
    role = role_res.scalar_one_or_none()
    if not role:
        # Check team membership
        team_res = await db.execute(select(models.Equipe).filter(models.Equipe.id_projet == id_projet))
        team = team_res.scalar_one_or_none()
        if team:
            member_res = await db.execute(
                select(models.Appartient_Equipe).filter(
                    models.Appartient_Equipe.id_equipe == team.id_equipe,
                    models.Appartient_Equipe.id_personnel == user.id,
                )
            )
            if member_res.scalar_one_or_none() is not None:
                role = "collaborateur"

    if not role and user.role == "admin":
        role = "admin"

    if not role or (role not in allowed_roles and "admin" not in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé : rôle insuffisant sur ce projet"
        )
    return role

# 1. POST /api/v1/projets/{id_projet}/invitations
@router.post("/api/v1/projets/{id_projet}/invitations", response_model=Schemas.InvitationOut, status_code=status.HTTP_201_CREATED)
async def creer_invitation(
    id_projet: int,
    inv_in: Schemas.InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify caller is chef_projet or admin
    await verify_project_role(db, id_projet, current_user, ["chef_projet"])

    # Generate unique secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7) # Valid for 7 days

    db_inv = models.Invitation(
        email_invite=inv_in.email_invite.strip().lower(),
        id_projet=id_projet,
        role_propose=inv_in.role_propose,
        token=token,
        expires_at=expires_at,
        statut="pending"
    )
    db.add(db_inv)
    await db.commit()
    await db.refresh(db_inv)

    print(f"[SIMULATION EMAIL] Invitation envoyée à {db_inv.email_invite}. Lien : http://localhost:8000/api/v1/invitations/{token}/accepter")
    return db_inv

# 2. GET /api/v1/projets/{id_projet}/invitations
@router.get("/api/v1/projets/{id_projet}/invitations", response_model=List[Schemas.InvitationOut])
async def lister_invitations_projet(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify caller is member of project
    await verify_project_role(db, id_projet, current_user, ["chef_projet", "collaborateur"])
    
    result = await db.execute(
        select(models.Invitation)
        .where(models.Invitation.id_projet == id_projet, models.Invitation.statut == "pending")
    )
    return result.scalars().all()

# 3. DELETE /api/v1/invitations/{id}
@router.delete("/api/v1/invitations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def annuler_invitation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Invitation).where(models.Invitation.id == id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation non trouvée")

    # Verify caller is chef_projet or admin on the invitation's project
    await verify_project_role(db, inv.id_projet, current_user, ["chef_projet"])

    await db.delete(inv)
    await db.commit()
    return

# Body schema for accepting invitation
class AcceptInvitationPayload(Schemas.BaseModel):
    nom: Optional[str] = None
    motdepasse: Optional[str] = None

# 4. POST /api/v1/invitations/{token}/accepter
@router.post("/api/v1/invitations/{token}/accepter", status_code=status.HTTP_200_OK)
async def accepter_invitation(
    token: str,
    payload: AcceptInvitationPayload = Body(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Invitation).where(models.Invitation.token == token))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation invalide ou introuvable")

    if inv.statut != "pending":
        raise HTTPException(status_code=400, detail=f"L'invitation a déjà été {inv.statut}")

    if inv.expires_at < datetime.utcnow():
        inv.statut = "expiree"
        await db.commit()
        raise HTTPException(status_code=400, detail="L'invitation a expiré")

    # Check if user already exists
    user_res = await db.execute(select(models.User).where(models.User.email == inv.email_invite))
    user = user_res.scalar_one_or_none()

    if not user:
        # Create account if it doesn't exist
        if not payload or not payload.motdepasse:
            raise HTTPException(
                status_code=400,
                detail="Compte inexistant. Veuillez spécifier un mot de passe pour créer votre compte."
            )
        
        # Create Personnel user
        nom = payload.nom or inv.email_invite.split("@")[0].capitalize()
        hashed_password = pwd_context.hash(payload.motdepasse)
        
        user = models.Personnel(
            nom=nom,
            email=inv.email_invite,
            motdepasse=hashed_password,
            role="personnel",
            actif=True
        )
        db.add(user)
        await db.flush()  # to get user.id

    # Create link in project roles
    role_link = models.ProjetMembreRole(
        id_projet=inv.id_projet,
        id_utilisateur=user.id,
        role=inv.role_propose
    )
    db.add(role_link)

    # Mark invitation as accepted
    inv.statut = "acceptee"
    await db.commit()

    return {"message": "Invitation acceptée avec succès. Vous avez rejoint le projet.", "role": inv.role_propose}

# 5. GET /api/v1/projets/{id_projet}/membres
@router.get("/api/v1/projets/{id_projet}/membres", status_code=status.HTTP_200_OK)
async def lister_membres_roles_projet(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify access
    await verify_project_role(db, id_projet, current_user, ["chef_projet", "collaborateur"])

    # Query members roles joined with User
    result = await db.execute(
        select(models.ProjetMembreRole, models.User)
        .join(models.User, models.User.id == models.ProjetMembreRole.id_utilisateur)
        .where(models.ProjetMembreRole.id_projet == id_projet)
    )
    
    members = []
    for role_link, user in result.all():
        members.append({
            "id": user.id,
            "nom": user.nom,
            "email": user.email,
            "role": role_link.role
        })
        
    return members
