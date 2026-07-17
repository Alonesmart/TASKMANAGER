import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user, RequireProjectRole
from ..messages.routes import manager as ws_manager

router = APIRouter(prefix="/api/v1/reports", tags=["Rapports"])

@router.post("/", response_model=Schemas.RapportOut, status_code=status.HTTP_201_CREATED)
async def creer_rapport(
    rapport_in: Schemas.RapportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Crée un nouveau rapport pour un projet."""
    if current_user.role != "personnel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Seul le personnel peut créer des rapports"
        )

    # Vérifier si l'utilisateur a accès au projet
    result = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport_in.id_projet))
    projet = result.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    from ..project.routes import user_can_access_project
    if not await user_can_access_project(db, projet, current_user):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce projet")

    try:
        new_rapport = models.Rapport(
            titre=rapport_in.titre,
            contenu=rapport_in.contenu,
            type=rapport_in.type,
            id_projet=rapport_in.id_projet,
            id_personnel=current_user.id,
            id_tache=rapport_in.id_tache,
            statut="brouillon"
        )
        db.add(new_rapport)
        await db.flush()  # Pour récupérer l'id_rapport
        
        # Enregistrer l'historique initial
        hist = models.HistoriqueRapport(
            id_rapport=new_rapport.id_rapport,
            ancien_statut="",
            nouveau_statut="brouillon",
            id_acteur=current_user.id,
            commentaire="Création du rapport en brouillon"
        )
        db.add(hist)
        
        await db.commit()
        await db.refresh(new_rapport, ["historique"])
        return new_rapport
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du rapport: {str(e)}")

@router.put("/{id_rapport}", response_model=Schemas.RapportOut)
async def modifier_rapport(
    id_rapport: int,
    rapport_update: Schemas.RapportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Modifie le titre et le contenu d'un rapport tant qu'il est en brouillon ou rejeté."""
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
        
    if rapport.id_personnel != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur peut modifier ce rapport")
        
    if rapport.statut not in ["brouillon", "rejete"]:
        raise HTTPException(status_code=400, detail="Impossible de modifier un rapport déjà soumis ou validé")
        
    rapport.titre = rapport_update.titre
    rapport.contenu = rapport_update.contenu
    rapport.type = rapport_update.type
    rapport.id_projet = rapport_update.id_projet
    if rapport_update.id_tache is not None:
        rapport.id_tache = rapport_update.id_tache
        
    # Log historique
    hist = models.HistoriqueRapport(
        id_rapport=id_rapport,
        ancien_statut=rapport.statut,
        nouveau_statut=rapport.statut,
        id_acteur=current_user.id,
        commentaire="Modification du contenu du rapport"
    )
    db.add(hist)
    await db.commit()
    await db.refresh(rapport)
    return rapport


@router.get("/my-reports", response_model=List[Schemas.RapportOut])
async def recuperer_mes_rapports(
    statut: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Récupère les rapports de l'utilisateur actuel, avec filtre optionnel sur le statut."""
    query = select(models.Rapport).filter(models.Rapport.id_personnel == current_user.id)
    
    if statut and statut != "all":
        query = query.filter(models.Rapport.statut == statut)
    
    result = await db.execute(query.order_by(models.Rapport.date_generation.desc()))
    return result.scalars().all()

@router.put("/{id_rapport}/soumettre", response_model=Schemas.RapportOut)
async def soumettre_rapport(
    id_rapport: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Soumet un rapport (fait passer de brouillon/rejete à soumis)."""
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    
    if rapport.id_personnel != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'auteur du rapport peut le soumettre")
    
    if rapport.statut not in ["brouillon", "rejete"]:
        raise HTTPException(status_code=400, detail=f"Impossible de soumettre un rapport avec le statut '{rapport.statut}'")
    
    ancien = rapport.statut
    rapport.statut = "soumis"
    rapport.date_soumission = datetime.utcnow()
    
    # Log historique
    hist = models.HistoriqueRapport(
        id_rapport=id_rapport,
        ancien_statut=ancien,
        nouveau_statut="soumis",
        id_acteur=current_user.id,
        commentaire="Soumission du rapport pour validation"
    )
    db.add(hist)
    
    # Récupérer les validateurs du projet pour leur envoyer une notification
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport.id_projet))
    projet = proj_res.scalar_one_or_none()
    if projet:
        validators = set()
        validators.add(projet.id_administrateur)
        
        role_res = await db.execute(
            select(models.ProjetMembreRole.id_utilisateur)
            .where(
                models.ProjetMembreRole.id_projet == rapport.id_projet,
                models.ProjetMembreRole.role == "chef_projet"
            )
        )
        for v_id in role_res.scalars().all():
            validators.add(v_id)
            
        validators.discard(current_user.id)  # Pas de notification pour soi-même
        
        for v_id in validators:
            notif = models.Notification(
                message=f"Nouveau rapport '{rapport.titre}' soumis par {current_user.nom}.",
                id_utilisateur=v_id,
                lu=False,
                date_envoi=datetime.utcnow()
            )
            db.add(notif)
            await db.flush()  # Pour avoir l'id_notification
            
            if v_id in ws_manager.active_connections:
                notif_payload = {
                    "type": "NEW_NOTIFICATION",
                    "id_notification": notif.id_notification,
                    "message": notif.message,
                    "lu": notif.lu,
                    "date_envoi": notif.date_envoi.isoformat(),
                    "id_utilisateur": notif.id_utilisateur
                }
                try:
                    await ws_manager.active_connections[v_id].send_json(notif_payload)
                except Exception:
                    pass
    await db.commit()
    
    # Re-fetch populated with historique
    result_ref = await db.execute(
        select(models.Rapport)
        .filter(models.Rapport.id_rapport == id_rapport)
        .options(selectinload(models.Rapport.historique))
    )
    return result_ref.scalar_one()

@router.put("/{id_rapport}/valider", response_model=Schemas.RapportOut, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def valider_rapport(
    id_rapport: int,
    validation_in: Schemas.RapportValidation,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Valide un rapport soumis (réservé au chef de projet/admin)."""
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    
    # Vérification explicite des droits
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport.id_projet))
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet associé non trouvé")
        
    is_admin = (projet.id_administrateur == current_user.id) or (current_user.role == "admin")
    role_res = await db.execute(
        select(models.ProjetMembreRole)
        .where(
            models.ProjetMembreRole.id_projet == rapport.id_projet,
            models.ProjetMembreRole.id_utilisateur == current_user.id,
            models.ProjetMembreRole.role == "chef_projet"
        )
    )
    is_chef = role_res.scalar_one_or_none() is not None
    
    if not (is_admin or is_chef):
        raise HTTPException(status_code=403, detail="Seuls les chefs de projet ou administrateurs peuvent effectuer cette action")
        
    if rapport.statut != "soumis":
        raise HTTPException(status_code=400, detail="Seuls les rapports soumis peuvent être validés")
    
    ancien = rapport.statut
    rapport.statut = "valide"
    rapport.date_validation = datetime.utcnow()
    rapport.commentaire_validation = validation_in.commentaire
    
    # Log historique
    hist = models.HistoriqueRapport(
        id_rapport=id_rapport,
        ancien_statut=ancien,
        nouveau_statut="valide",
        id_acteur=current_user.id,
        commentaire=validation_in.commentaire or "Validation du rapport"
    )
    db.add(hist)
    
    # Notifier l'auteur du rapport
    notif_msg = f"Votre rapport '{rapport.titre}' a été validé."
    if validation_in.commentaire:
        notif_msg += f" Commentaire : {validation_in.commentaire}"
        
    notif = models.Notification(
        message=notif_msg,
        id_utilisateur=rapport.id_personnel,
        lu=False,
        date_envoi=datetime.utcnow()
    )
    db.add(notif)
    await db.flush()
    
    if rapport.id_personnel in ws_manager.active_connections:
        notif_payload = {
            "type": "NEW_NOTIFICATION",
            "id_notification": notif.id_notification,
            "message": notif.message,
            "lu": notif.lu,
            "date_envoi": notif.date_envoi.isoformat(),
            "id_utilisateur": notif.id_utilisateur
        }
        try:
            await ws_manager.active_connections[rapport.id_personnel].send_json(notif_payload)
        except Exception:
            pass
    await db.commit()
    
    # Re-fetch populated with historique
    result_ref = await db.execute(
        select(models.Rapport)
        .filter(models.Rapport.id_rapport == id_rapport)
        .options(selectinload(models.Rapport.historique))
    )
    return result_ref.scalar_one()

@router.put("/{id_rapport}/rejeter", response_model=Schemas.RapportOut, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def rejeter_rapport(
    id_rapport: int,
    validation_in: Schemas.RapportValidation,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Rejette un rapport soumis avec commentaire obligatoire (réservé au chef de projet/admin)."""
    if not validation_in.commentaire or not validation_in.commentaire.strip():
        raise HTTPException(status_code=400, detail="Un commentaire est obligatoire pour rejeter un rapport")
        
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
        
    # Vérification explicite des droits
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport.id_projet))
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet associé non trouvé")
        
    is_admin = (projet.id_administrateur == current_user.id) or (current_user.role == "admin")
    role_res = await db.execute(
        select(models.ProjetMembreRole)
        .where(
            models.ProjetMembreRole.id_projet == rapport.id_projet,
            models.ProjetMembreRole.id_utilisateur == current_user.id,
            models.ProjetMembreRole.role == "chef_projet"
        )
    )
    is_chef = role_res.scalar_one_or_none() is not None
    
    if not (is_admin or is_chef):
        raise HTTPException(status_code=403, detail="Seuls les chefs de projet ou administrateurs peuvent effectuer cette action")
    
    if rapport.statut != "soumis":
        raise HTTPException(status_code=400, detail="Seuls les rapports soumis peuvent être rejetés")
    
    ancien = rapport.statut
    rapport.statut = "rejete"
    rapport.commentaire_validation = validation_in.commentaire
    
    # Log historique
    hist = models.HistoriqueRapport(
        id_rapport=id_rapport,
        ancien_statut=ancien,
        nouveau_statut="rejete",
        id_acteur=current_user.id,
        commentaire=validation_in.commentaire
    )
    db.add(hist)
    
    # Notifier l'auteur du rapport
    notif = models.Notification(
        message=f"Votre rapport '{rapport.titre}' a été rejeté. Motif : {validation_in.commentaire}",
        id_utilisateur=rapport.id_personnel,
        lu=False,
        date_envoi=datetime.utcnow()
    )
    db.add(notif)
    await db.flush()
    
    if rapport.id_personnel in ws_manager.active_connections:
        notif_payload = {
            "type": "NEW_NOTIFICATION",
            "id_notification": notif.id_notification,
            "message": notif.message,
            "lu": notif.lu,
            "date_envoi": notif.date_envoi.isoformat(),
            "id_utilisateur": notif.id_utilisateur
        }
        try:
            await ws_manager.active_connections[rapport.id_personnel].send_json(notif_payload)
        except Exception:
            pass
    await db.commit()
    
    # Re-fetch populated with historique
    result_ref = await db.execute(
        select(models.Rapport)
        .filter(models.Rapport.id_rapport == id_rapport)
        .options(selectinload(models.Rapport.historique))
    )
    return result_ref.scalar_one()


@router.get("/stats/dashboard")
async def recuperer_stats_rapports(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Calcule les statistiques clés des rapports pour le tableau de bord (réservé aux managers/admin)."""
    # Trouver d'abord tous les id_projet où l'utilisateur est administrateur ou chef_projet
    admin_projects_query = select(models.Projet.id_projet).where(models.Projet.id_administrateur == current_user.id)
    admin_proj_res = await db.execute(admin_projects_query)
    admin_project_ids = set(admin_proj_res.scalars().all())
    
    role_projects_query = select(models.ProjetMembreRole.id_projet).where(
        models.ProjetMembreRole.id_utilisateur == current_user.id,
        models.ProjetMembreRole.role == "chef_projet"
    )
    role_proj_res = await db.execute(role_projects_query)
    role_project_ids = set(role_proj_res.scalars().all())
    
    responsible_project_ids = list(admin_project_ids.union(role_project_ids))
    
    if current_user.role == "admin":
        # Global admin sees all projects
        all_proj_query = select(models.Projet.id_projet)
        all_proj_res = await db.execute(all_proj_query)
        responsible_project_ids = list(all_proj_res.scalars().all())
        
    if not responsible_project_ids:
        return {
            "total": 0,
            "brouillon": 0,
            "soumis": 0,
            "valide": 0,
            "rejete": 0,
            "delai_moyen_validation_heures": 0.0,
            "projets_stats": []
        }
        
    # Get all reports in responsible scope
    query = select(models.Rapport).where(models.Rapport.id_projet.in_(responsible_project_ids))
    result = await db.execute(query)
    rapports = result.scalars().all()
    
    total = len(rapports)
    brouillon = sum(1 for r in rapports if r.statut == "brouillon")
    soumis = sum(1 for r in rapports if r.statut == "soumis")
    valide = sum(1 for r in rapports if r.statut == "valide")
    rejete = sum(1 for r in rapports if r.statut == "rejete")
    
    # Calculate average validation delay (time between date_soumission and date_validation)
    delais = []
    for r in rapports:
        if r.statut == "valide" and r.date_soumission and r.date_validation:
            diff = r.date_validation - r.date_soumission
            delais.append(diff.total_seconds() / 3600.0) # hours
            
    delai_moyen = round(sum(delais) / len(delais), 1) if delais else 0.0
    
    # Project-wise breakdown
    proj_map = {}
    for r in rapports:
        pid = r.id_projet
        if pid not in proj_map:
            proj_map[pid] = {"id_projet": pid, "total": 0, "valide": 0, "en_attente": 0}
        proj_map[pid]["total"] += 1
        if r.statut == "valide":
            proj_map[pid]["valide"] += 1
        elif r.statut == "soumis":
            proj_map[pid]["en_attente"] += 1
            
    # Resolve project titles
    projets_stats = []
    if proj_map:
        proj_ids = list(proj_map.keys())
        p_query = select(models.Projet).where(models.Projet.id_projet.in_(proj_ids))
        p_res = await db.execute(p_query)
        for p in p_res.scalars().all():
            stats = proj_map[p.id_projet]
            stats["titre_projet"] = p.titre
            projets_stats.append(stats)
            
    return {
        "total": total,
        "brouillon": brouillon,
        "soumis": soumis,
        "valide": valide,
        "rejete": rejete,
        "delai_moyen_validation_heures": delai_moyen,
        "projets_stats": projets_stats
    }


@router.get("/to-validate", response_model=List[Schemas.RapportOut])
async def recuperer_rapports_a_valider(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère les rapports soumis en attente de validation pour les projets dont l'utilisateur est responsable."""
    # Trouver d'abord tous les id_projet où l'utilisateur est administrateur ou chef_projet
    admin_projects_query = select(models.Projet.id_projet).where(models.Projet.id_administrateur == current_user.id)
    admin_proj_res = await db.execute(admin_projects_query)
    admin_project_ids = set(admin_proj_res.scalars().all())
    
    role_projects_query = select(models.ProjetMembreRole.id_projet).where(
        models.ProjetMembreRole.id_utilisateur == current_user.id,
        models.ProjetMembreRole.role == "chef_projet"
    )
    role_proj_res = await db.execute(role_projects_query)
    role_project_ids = set(role_proj_res.scalars().all())
    
    responsible_project_ids = list(admin_project_ids.union(role_project_ids))
    
    if current_user.role == "admin":
        # Global admin sees all projects
        all_proj_query = select(models.Projet.id_projet)
        all_proj_res = await db.execute(all_proj_query)
        responsible_project_ids = list(all_proj_res.scalars().all())
        
    if not responsible_project_ids:
        return []
        
    query = (
        select(models.Rapport)
        .where(
            models.Rapport.id_projet.in_(responsible_project_ids),
            models.Rapport.statut == "soumis"
        )
        .order_by(models.Rapport.date_generation.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{id_rapport}", response_model=Schemas.RapportOut)
async def recuperer_details_rapport(
    id_rapport: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère les détails d'un rapport spécifique."""
    result = await db.execute(
        select(models.Rapport)
        .filter(models.Rapport.id_rapport == id_rapport)
        .options(selectinload(models.Rapport.historique))
    )
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
        
    # Vérifier l'accès au projet associé au rapport
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport.id_projet))
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet associé non trouvé")
        
    is_admin = (projet.id_administrateur == current_user.id) or (current_user.role == "admin")
    is_creator = (rapport.id_personnel == current_user.id)
    
    from ..project.routes import user_can_access_project
    can_access = await user_can_access_project(db, projet, current_user)
    
    if not (is_admin or is_creator or can_access):
        raise HTTPException(status_code=403, detail="Vous n'avez pas l'autorisation d'accéder à ce rapport")
        
    return rapport


@router.get("/{id_rapport}/historique", response_model=List[Schemas.HistoriqueRapportOut])
async def recuperer_historique_rapport(
    id_rapport: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère l'historique complet des statuts d'un rapport."""
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    
    # Vérifier l'accès au projet associé au rapport
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport.id_projet))
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet associé non trouvé")
    
    is_admin = (projet.id_administrateur == current_user.id) or (current_user.role == "admin")
    is_creator = (rapport.id_personnel == current_user.id)
    
    from ..project.routes import user_can_access_project
    can_access = await user_can_access_project(db, projet, current_user)
    
    if not (is_admin or is_creator or can_access):
        raise HTTPException(status_code=403, detail="Vous n'avez pas l'autorisation d'accéder à l'historique de ce rapport")
    
    hist_res = await db.execute(
        select(models.HistoriqueRapport)
        .filter(models.HistoriqueRapport.id_rapport == id_rapport)
        .order_by(models.HistoriqueRapport.date.asc())
    )
    return hist_res.scalars().all()


@router.get("/{id_rapport}/export-pdf")
async def export_rapport_pdf(
    id_rapport: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Génère et exporte un rapport spécifique sous forme de fichier PDF."""
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    # Vérifier l'accès au projet associé au rapport
    proj_res = await db.execute(select(models.Projet).filter(models.Projet.id_projet == rapport.id_projet))
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet associé non trouvé")

    # Droit : Admin du projet, créateur du rapport, ou membre ayant accès au projet
    is_admin = (projet.id_administrateur == current_user.id) or (current_user.role == "admin")
    is_creator = (rapport.id_personnel == current_user.id)
    
    from ..project.routes import user_can_access_project
    can_access = await user_can_access_project(db, projet, current_user)

    if not (is_admin or is_creator or can_access):
        raise HTTPException(status_code=403, detail="Vous n'avez pas l'autorisation d'accéder à ce rapport")

    # Génération du PDF avec ReportLab en mémoire
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Styles personnalisés
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#4b5563'),
        spaceAfter=20
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1f2937'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#374151')
    )

    story = []

    # En-tête / Badge Projet
    story.append(Paragraph(f"PROJET : {projet.titre.upper()}", ParagraphStyle('ProjBadge', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#0284c7'), spaceAfter=4)))
    
    # Titre du rapport
    story.append(Paragraph(rapport.titre, title_style))
    
    # Métadonnées du rapport
    meta_text = (
        f"Généré le : {rapport.date_generation.strftime('%d/%m/%Y à %H:%M:%S')} UTC<br/>"
        f"Type de rapport : {rapport.type}<br/>"
        f"Période : {rapport.periode}<br/>"
        f"Statut : {rapport.statut}"
    )
    story.append(Paragraph(meta_text, subtitle_style))
    
    story.append(Spacer(1, 12))
    
    # Ligne de séparation
    sep_table = Table([['']], colWidths=[530], rowHeights=[1])
    sep_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(sep_table)
    story.append(Spacer(1, 12))

    # Section Contenu
    story.append(Paragraph("Détail du Rapport", heading_style))
    
    # Formater le contenu en remplaçant les retours à la ligne par des balises <br/> pour ReportLab
    formatted_content = rapport.contenu.replace('\n', '<br/>')
    story.append(Paragraph(formatted_content, body_style))
    
    # Récupérer l'historique de validation
    hist_res = await db.execute(
        select(models.HistoriqueRapport)
        .filter(models.HistoriqueRapport.id_rapport == id_rapport)
        .order_by(models.HistoriqueRapport.date.asc())
    )
    history = hist_res.scalars().all()
    
    if history:
        story.append(Spacer(1, 24))
        story.append(Paragraph("Cycle de Validation & Traçabilité", heading_style))
        
        hist_rows = []
        for h in history:
            comment_str = f"<br/><font color='#6b7280'>Commentaire : {h.commentaire}</font>" if h.commentaire else ""
            hist_rows.append([
                Paragraph(h.date.strftime('%d/%m/%Y %H:%M'), body_style),
                Paragraph(f"Statut : <b>{h.ancien_statut.upper()}</b> → <b>{h.nouveau_statut.upper()}</b>{comment_str}", body_style)
            ])
            
        hist_table = Table(hist_rows, colWidths=[110, 420])
        hist_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        story.append(hist_table)
    
    # Pied de page (signature automatique)
    story.append(Spacer(1, 40))
    story.append(Paragraph("Document officiel TaskManager", ParagraphStyle('DocFooter', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7, textColor=colors.HexColor('#9ca3af'), alignment=1)))

    doc.build(story)
    buffer.seek(0)
    
    # Nettoyer les caractères non valides pour les en-têtes HTTP
    safe_filename = "".join(c for c in rapport.titre if c.isalnum() or c in (" ", "-", "_")).strip()
    safe_filename = safe_filename.replace(" ", "_") or "rapport"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_filename}.pdf"}
    )
