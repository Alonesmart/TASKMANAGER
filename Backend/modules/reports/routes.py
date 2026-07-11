import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user, RequireProjectRole

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
            statut="pending"
        )
        db.add(new_rapport)
        await db.commit()
        await db.refresh(new_rapport)
        return new_rapport
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du rapport: {str(e)}")

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

@router.put("/{id_rapport}/statut", response_model=Schemas.RapportOut, dependencies=[Depends(RequireProjectRole(["chef_projet"]))])
async def modifier_statut_rapport(
    id_rapport: int,
    nouveau_statut: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Modifie le statut d'un rapport (doit être admin ou chef de projet)."""
    result = await db.execute(select(models.Rapport).filter(models.Rapport.id_rapport == id_rapport))
    rapport = result.scalar_one_or_none()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")

    rapport.statut = nouveau_statut
    await db.commit()
    await db.refresh(rapport)
    return rapport


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
