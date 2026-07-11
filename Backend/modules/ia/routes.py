from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import Schemas, models
from ...database import get_db
from ...modules.auth import get_current_user

router = APIRouter(prefix="/api/v1/ia", tags=["IA & Décisions"])


@router.post("/rediger-description", response_model=Schemas.IARedigerResponse)
async def rediger_description(
    req: Schemas.IARedigerRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Suggère automatiquement une description structurée et professionnelle selon le titre."""
    t = req.titre.lower().strip()
    
    if req.type == "projet":
        desc = (
            f"### 🎯 Vision du Projet : {req.titre}\n"
            f"Ce projet vise à concevoir, développer et déployer une solution complète répondant aux exigences du cahier des charges.\n\n"
            f"### 📈 Objectifs clés :\n"
            f"- Répondre aux besoins spécifiques et maximiser la valeur utilisateur.\n"
            f"- Respecter les jalons, les contraintes de temps et de qualité définis.\n"
            f"- Assurer une collaboration transparente et efficace au sein de l'équipe.\n\n"
            f"### 🛠️ Jalons principaux :\n"
            f"1. Cadrage et analyse des besoins.\n"
            f"2. Conception de l'architecture et modélisation.\n"
            f"3. Développement des modules principaux et intégration.\n"
            f"4. Phase d'assurance qualité et tests de validation.\n"
            f"5. Déploiement et suivi post-production."
        )
    else:
        # Default Task templates based on keywords
        if "bug" in t or "corriger" in t or "correction" in t or "fix" in t:
            desc = (
                f"### 🐛 Objectif :\n"
                f"Identifier la cause racine de l'anomalie liée à : '{req.titre}', puis implémenter le correctif nécessaire.\n\n"
                f"### 🛠️ Étapes de réalisation :\n"
                f"- Reproduire l'anomalie dans l'environnement local.\n"
                f"- Analyser les logs et isoler le composant défaillant.\n"
                f"- Appliquer le correctif de code approprié.\n"
                f"- Valider la correction par des tests unitaires et de non-régression.\n\n"
                f"### 📦 Livrables :\n"
                f"- Correctif de code déployé.\n"
                f"- Rapport succinct de l'origine de l'anomalie."
            )
        elif "test" in t or "valider" in t or "validation" in t:
            desc = (
                f"### 🧪 Objectif :\n"
                f"Mettre en place et exécuter les plans de tests pour valider le bon fonctionnement de : '{req.titre}'.\n\n"
                f"### 🛠️ Étapes de réalisation :\n"
                f"- Définir les scénarios de test (cas nominaux, limites et d'erreur).\n"
                f"- Écrire ou mettre à jour les scripts de tests automatisés.\n"
                f"- Exécuter les tests et documenter les résultats.\n"
                f"- Rapporter toute anomalie identifiée au reste de l'équipe.\n\n"
                f"### 📦 Livrables :\n"
                f"- Scripts de test intégrés au dépôt.\n"
                f"- Rapport complet de couverture et d'exécution des tests."
            )
        elif "doc" in t or "documenter" in t or "rediger" in t or "cahier des charges" in t:
            desc = (
                f"### 📖 Objectif :\n"
                f"Produire la documentation technique ou fonctionnelle pour : '{req.titre}'.\n\n"
                f"### 🛠️ Étapes de réalisation :\n"
                f"- Rassembler les informations techniques nécessaires auprès de l'équipe.\n"
                f"- Rédiger les sections principales de manière claire et concise.\n"
                f"- Mettre en forme le document au format Markdown.\n"
                f"- Faire relire et valider la documentation par les pairs.\n\n"
                f"### 📦 Livrables :\n"
                f"- Fichiers de documentation mis à jour dans le dépôt de code."
            )
        else:
            desc = (
                f"### 🎯 Objectif :\n"
                f"Réaliser l'étude, l'implémentation et la livraison de la fonctionnalité : '{req.titre}'.\n\n"
                f"### 🛠️ Étapes de réalisation :\n"
                f"- Analyser les exigences techniques et fonctionnelles associées.\n"
                f"- Concevoir la solution et modéliser si nécessaire.\n"
                f"- Développer la logique et intégrer les composants.\n"
                f"- Valider le fonctionnement général par des tests d'intégration.\n\n"
                f"### 📦 Livrables :\n"
                f"- Fonctionnalité pleinement intégrée et documentée."
            )

    return {"description": desc}


@router.post("/suggerer-priorite", response_model=Schemas.IASuggererPrioriteResponse)
async def suggerer_priorite(
    req: Schemas.IASuggererPrioriteRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Suggère la priorité d'une tâche (faible, moyenne, haute) selon son urgence."""
    titre = req.titre.lower()
    description = (req.description or "").lower()
    
    # Base priority
    priorite = "faible"
    
    # 1. Check deadline
    if req.date_echeance:
        now = datetime.now(timezone.utc)
        # Ensure timezone-naive comparison if db or req date has no tz info
        target_date = req.date_echeance.replace(tzinfo=timezone.utc) if req.date_echeance.tzinfo else req.date_echeance.replace(tzinfo=timezone.utc)
        diff = target_date - now
        
        if diff.days < 2:
            priorite = "haute"
        elif diff.days < 5:
            priorite = "moyenne"
            
    # 2. Check keywords for upgrade
    urgent_keywords = ["urgent", "bloquant", "critique", "asap", "immédiat", "panne", "erreur", "crash"]
    moyenne_keywords = ["important", "prioritaire", "client", "refactor", "correctif", "fix"]
    
    has_urgent = any(k in titre or k in description for k in urgent_keywords)
    has_moyenne = any(k in titre or k in description for k in moyenne_keywords)
    
    if has_urgent:
        priorite = "haute"
    elif has_moyenne and priorite == "faible":
        priorite = "moyenne"
        
    return {"priorite": priorite}


@router.post("/repartir-taches", response_model=Schemas.IARepartirResponse)
async def repartir_taches(
    req: Schemas.IARepartirRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Suggère la répartition optimale des tâches parmi les membres d'un projet selon leur charge."""
    # Fetch project and members
    proj_res = await db.execute(
        select(models.Projet)
        .options(selectinload(models.Projet.membres_roles).selectinload(models.ProjetMembreRole.utilisateur))
        .filter(models.Projet.id_projet == req.id_projet)
    )
    projet = proj_res.scalar_one_or_none()
    if not projet:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    # Get members
    members = [mr.utilisateur for mr in projet.membres_roles]
    if not members:
        # Default to admin if no other members
        result = await db.execute(select(models.User).filter(models.User.id == projet.id_administrateur))
        admin = result.scalar_one_or_none()
        if admin:
            members = [admin]
            
    if not members:
        raise HTTPException(status_code=400, detail="Aucun membre n'est associé à ce projet pour recevoir des tâches")

    # Count current active tasks per member
    workload = {}
    for m in members:
        # Count active tasks (not terminées) assigned to this user
        count_res = await db.execute(
            select(func.count(models.TacheAssignation.id_tache))
            .join(models.Tache, models.TacheAssignation.id_tache == models.Tache.id_tache)
            .filter(
                models.TacheAssignation.id_utilisateur == m.id,
                models.Tache.statut != "terminees",
                models.Tache.id_projet == req.id_projet
            )
        )
        workload[m.id] = count_res.scalar() or 0

    repartition = []
    # Assign each task to the member with the lowest load
    for t_id in req.tache_ids:
        # Find member with minimum workload
        assigned_user_id = min(workload, key=workload.get)
        repartition.append({
            "id_tache": t_id,
            "id_utilisateur": assigned_user_id
        })
        # Update local workload tracker to balance subsequent tasks
        workload[assigned_user_id] += 1

    return {"repartition": repartition}


@router.get("/risques-retard", response_model=Schemas.IARisqueResponse)
async def identifier_risques_retard(
    id_projet: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Analyse les risques de retard pour toutes les tâches en cours d'un projet."""
    tasks_res = await db.execute(
        select(models.Tache)
        .filter(models.Tache.id_projet == id_projet, models.Tache.statut != "terminees")
    )
    tasks = tasks_res.scalars().all()
    
    risques = []
    now = datetime.now(timezone.utc)
    
    for t in tasks:
        # Determine progress or fallback to 0
        progress = 0
        if t.statut == "en_cours":
            progress = 50
        elif t.statut == "a_faire":
            progress = 10
            
        risque = "faible"
        raison = "Progression conforme aux échéances"
        
        if t.echeance:
            # Ensure timezone-aware comparison with t.echeance (date)
            target_date = datetime(t.echeance.year, t.echeance.month, t.echeance.day, tzinfo=timezone.utc)
            diff = target_date - now
            
            if diff.total_seconds() < 0:
                risque = "eleve"
                raison = f"Échéance dépassée"
            elif diff.days < 2 and progress < 50:
                risque = "eleve"
                raison = f"Échéance imminente ({diff.days}j restants) avec une progression trop faible ({progress}%)"
            elif diff.days < 5 and progress < 25:
                risque = "moyen"
                raison = f"Échéance proche ({diff.days}j restants) avec une progression très faible ({progress}%)"
        else:
            # No deadline, fallback
            if progress < 15:
                risque = "moyen"
                raison = "Tâche commencée sans date d'échéance et faible progression"
                
        risques.append({
            "id_tache": t.id_tache,
            "titre": t.titre,
            "statut": t.statut,
            "risque": risque,
            "raison": raison
        })
        
    return {"risques": risques}
