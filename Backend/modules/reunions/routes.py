from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user, RequireProjectRole
from ...modules.messages.routes import create_and_send_notification

router = APIRouter(prefix="/api/v1/reunions", tags=["Réunions"])


def serialize_reunion(reunion: models.Reunion) -> dict:
    invitations = []
    for invitation in reunion.invitations:
        invitations.append({
            "id_utilisateur": invitation.id_utilisateur,
            "nom": invitation.utilisateur.nom,
            "email": invitation.utilisateur.email,
            "statut": invitation.statut
        })
    return {
        "id_reunion": reunion.id_reunion,
        "titre": reunion.titre,
        "date": reunion.date,
        "lien_virtuel": reunion.lien_virtuel,
        "ordre_jour": reunion.ordre_jour,
        "compte_rendu": reunion.compte_rendu,
        "id_projet": reunion.id_projet,
        "invitations": invitations
    }


@router.post("", response_model=Schemas.ReunionOut, status_code=status.HTTP_201_CREATED)
async def creer_reunion(
    reunion_in: Schemas.ReunionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Crée une nouvelle réunion de projet et invite les participants."""
    # Check project access
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == reunion_in.id_projet))
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Access control: Must be admin or chef_projet
    from ..project.routes import user_can_access_project
    has_access = await user_can_access_project(db, projet, current_user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce projet")

    new_reunion = models.Reunion(
        titre=reunion_in.titre,
        date=reunion_in.date,
        lien_virtuel=reunion_in.lien_virtuel,
        ordre_jour=reunion_in.ordre_jour,
        id_projet=reunion_in.id_projet
    )
    db.add(new_reunion)
    await db.flush()

    # Add invitations
    invited_ids = set(reunion_in.invited_user_ids)
    # Always invite the organizer if not in the list
    invited_ids.add(current_user.id)

    for u_id in invited_ids:
        # Check user existence
        user_res = await db.execute(select(models.User).filter(models.User.id == u_id))
        user_exists = user_res.scalar_one_or_none()
        if user_exists:
            # Set organizer status as 'confirme' automatically
            statut = "confirme" if u_id == current_user.id else "invite"
            db_participation = models.ParticipationReunion(
                id_reunion=new_reunion.id_reunion,
                id_utilisateur=u_id,
                statut=statut
            )
            db.add(db_participation)

            # Send notification (exclude the organizer)
            if u_id != current_user.id:
                await create_and_send_notification(
                    db=db,
                    message=f"Vous êtes invité à la réunion '{reunion_in.titre}' le {reunion_in.date.strftime('%d/%m/%Y à %H:%M')}.",
                    id_utilisateur=u_id
                )

    await db.commit()

    # Reload reunion with relationships
    reload_res = await db.execute(
        select(models.Reunion)
        .options(
            selectinload(models.Reunion.invitations).selectinload(models.ParticipationReunion.utilisateur),
            selectinload(models.Reunion.projet)
        )
        .filter(models.Reunion.id_reunion == new_reunion.id_reunion)
    )
    return serialize_reunion(reload_res.scalar_one())


@router.get("", response_model=List[Schemas.ReunionOut])
async def lister_reunions(
    id_projet: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Récupère la liste des réunions auxquelles l'utilisateur a accès."""
    query = (
        select(models.Reunion)
        .options(
            selectinload(models.Reunion.invitations).selectinload(models.ParticipationReunion.utilisateur),
            selectinload(models.Reunion.projet)
        )
        .join(models.Projet, models.Reunion.id_projet == models.Projet.id_projet)
    )

    if id_projet is not None:
        query = query.filter(models.Reunion.id_projet == id_projet)

    # Restrict to projects the user is involved in, or meetings the user is invited to
    query = query.outerjoin(models.ParticipationReunion, models.Reunion.id_reunion == models.ParticipationReunion.id_reunion)
    
    from ..project.routes import user_can_access_project
    # We load all meetings and filter client-side / database-side based on project membership
    result = await db.execute(query.distinct())
    all_reunions = result.scalars().all()

    # Filter by user access
    user_reunions = []
    for r in all_reunions:
        # User is invited or has access to the project
        is_invited = any(inv.id_utilisateur == current_user.id for inv in r.invitations)
        has_proj_access = await user_can_access_project(db, r.projet, current_user)
        if is_invited or has_proj_access:
            user_reunions.append(serialize_reunion(r))

    return user_reunions


@router.put("/{id_reunion}/reponse")
async def repondre_invitation_reunion(
    id_reunion: int,
    reponse: Schemas.ReunionResponseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Permet à un participant de confirmer ou décliner une invitation de réunion."""
    res = await db.execute(
        select(models.ParticipationReunion)
        .where(
            models.ParticipationReunion.id_reunion == id_reunion,
            models.ParticipationReunion.id_utilisateur == current_user.id
        )
    )
    invitation = res.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation non trouvée pour cette réunion")

    invitation.statut = reponse.statut
    await db.commit()

    # Notify organizer / project owner
    reunion_res = await db.execute(
        select(models.Reunion)
        .options(selectinload(models.Reunion.projet))
        .filter(models.Reunion.id_reunion == id_reunion)
    )
    reunion = reunion_res.scalar_one()
    owner_id = reunion.projet.id_administrateur
    
    if owner_id and owner_id != current_user.id:
        status_label = "confirmé" if reponse.statut == "confirme" else "décliné"
        await create_and_send_notification(
            db=db,
            message=f"{current_user.nom} a {status_label} l'invitation à la réunion '{reunion.titre}'.",
            id_utilisateur=owner_id
        )
        await db.commit()

    return {"message": "Réponse enregistrée avec succès"}
