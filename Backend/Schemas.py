from pydantic import BaseModel, EmailStr, Field, validator
from datetime import date, datetime
from typing import List, Optional

# --- User Schemas ---
class UserBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)

class UserRegister(UserBase):
    motdepasse: str = Field(..., min_length=8)
    confirm_motdepasse: str

class UserLogin(BaseModel):
    email: EmailStr
    motdepasse: str

class UserResponse(UserBase):
    id: int
    role: str
    actif: bool
    en_ligne: bool = False
    derniere_connexion: Optional[datetime] = None
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

class Token(BaseModel):
    access_token: str
    token_type: str
    message: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Forgot Password Schemas ---
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_motdepasse: str = Field(..., min_length=8)
    confirm_motdepasse: str

# --- Equipe Schemas ---
class EquipeBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    id_projet: int

class EquipeCreate(EquipeBase):
    pass

class EquipeOut(EquipeBase):
    id_equipe: int
    class Config:
        from_attributes = True

# --- Projet Schemas ---
class ProjetBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    dateDebut: date
    dateFin: date
    priorite: str = Field("moyenne", max_length=50)
    statut: str = Field("actif", max_length=50)
    etat: str = Field("en_cours", max_length=50)
    id_administrateur: Optional[int] = None

    @validator('dateFin')
    def validate_dates(cls, v, values):
        if 'dateDebut' in values and v < values['dateDebut']:
            raise ValueError('La date de fin doit être postérieure à la date de début')
        return v

class ProjetCreate(ProjetBase):
    pass

class ProjetOut(ProjetBase):
    id_projet: int
    equipe: Optional[EquipeOut] = None
    class Config:
        from_attributes = True

# --- Tache Schemas ---
class TacheBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    priorite: str = Field("moyenne", max_length=50) # faible, moyenne, haute
    statut: str = Field("a_faire", max_length=50) # a_faire, en_cours, terminees
    echeance: Optional[date] = None
    progression: int = Field(0, ge=0, le=100) # 0-100
    etat: str = Field("active", max_length=50) # active, archivée
    id_projet: int

class TacheCreate(TacheBase):
    assigned_user_ids: List[int] = Field(default_factory=list)

class TacheUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    priorite: Optional[str] = Field(None, max_length=50)
    statut: Optional[str] = Field(None, max_length=50)
    echeance: Optional[date] = None
    progression: Optional[int] = Field(None, ge=0, le=100)
    etat: Optional[str] = Field(None, max_length=50)
    assigned_user_ids: Optional[List[int]] = None

class TacheAssignedUser(UserResponse):
    pass

class TacheOut(TacheBase):
    id_tache: int
    projet: Optional[ProjetOut] = None
    assigned_users: List[TacheAssignedUser] = Field(default_factory=list)
    preuve_texte: Optional[str] = None
    id_document_preuve: Optional[int] = None
    commentaire_rejet: Optional[str] = None
    historique_validation: List["HistoriqueValidationTacheOut"] = Field(default_factory=list)
    class Config:
        from_attributes = True

class HistoriqueValidationTacheOut(BaseModel):
    id_historique: int
    id_tache: int
    ancien_statut: str
    nouveau_statut: str
    id_acteur: int
    date: datetime
    commentaire: Optional[str] = None
    class Config:
        from_attributes = True

class TacheValidation(BaseModel):
    commentaire: Optional[str] = None

class TacheSubmission(BaseModel):
    preuve_texte: Optional[str] = None
    id_document_preuve: Optional[int] = None

# --- Commentaire Schemas ---
class CommentaireBase(BaseModel):
    contenu: str = Field(..., min_length=1)
    id_utilisateur: int

class CommentaireCreate(CommentaireBase):
    pass

class CommentaireOut(CommentaireBase):
    id_commentaire: int
    date_creation: datetime
    id_tache: int
    class Config:
        from_attributes = True

# --- Appartient_Equipe Schemas (Team Membership) ---
class AppartientEquipeCreate(BaseModel):
    id_utilisateur: int
    id_equipe: int

class AppartientEquipeOut(AppartientEquipeCreate):
    class Config:
        from_attributes = True

# --- Dashboard Schemas ---
class DashboardResponse(BaseModel):
    total_taches: int
    taches_terminees: int
    taches_en_cours: int
    taches_en_retard: int
    progression_globale: float

    class Config:
        from_attributes = True

class GlobalDashboardOut(BaseModel):
    active_projects: int
    my_tasks: int
    urgent_tasks: int
    due_soon_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    todo_tasks: int
    progression: float

    class Config:
        from_attributes = True


# --- Rapport Schemas ---
class RapportBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=150)
    contenu: str = Field(..., min_length=1)
    type: str = Field(..., max_length=50)
    id_projet: int

class RapportCreate(RapportBase):
    id_tache: Optional[int] = None

class HistoriqueRapportOut(BaseModel):
    id_historique: int
    id_rapport: int
    ancien_statut: str
    nouveau_statut: str
    id_acteur: int
    date: datetime
    commentaire: Optional[str] = None
    class Config:
        from_attributes = True

class RapportValidation(BaseModel):
    commentaire: Optional[str] = None

class RapportOut(RapportBase):
    id_rapport: int
    statut: str
    date_generation: datetime
    date_soumission: Optional[datetime] = None
    date_validation: Optional[datetime] = None
    commentaire_validation: Optional[str] = None
    id_personnel: int
    id_tache: Optional[int] = None
    historique: Optional[List[HistoriqueRapportOut]] = None
    class Config:
        from_attributes = True

# --- Message Schemas ---
class ConversationBase(BaseModel):
    nom: Optional[str] = Field(None, max_length=100)
    type: str = Field("direct", max_length=50)  # 'direct' or 'groupe'
    id_admin: Optional[int] = None
    avatar: Optional[str] = None

class ConversationCreate(ConversationBase):
    participant_ids: List[int]

class UserMinOut(BaseModel):
    id: int
    nom: str
    email: str
    role: str
    en_ligne: bool = False
    derniere_connexion: Optional[datetime] = None
    class Config:
        from_attributes = True

class ConversationParticipantOut(BaseModel):
    id_utilisateur: int
    utilisateur: UserMinOut
    class Config:
        from_attributes = True

class LastMessageMinOut(BaseModel):
    contenu: str
    date_envoi: datetime
    id_expediteur: int
    statut: str
    class Config:
        from_attributes = True

class ConversationOut(ConversationBase):
    id_conversation: int
    date_creation: datetime
    participants: List[ConversationParticipantOut] = []
    last_message: Optional[LastMessageMinOut] = None
    unread_count: int = 0
    class Config:
        from_attributes = True

class ConversationParticipantCreate(BaseModel):
    id_utilisateur: int

class ConversationUpdate(BaseModel):
    nom: Optional[str] = None
    avatar: Optional[str] = None

class GroupParticipantsUpdate(BaseModel):
    participant_ids: List[int]

class GroupAdminUpdate(BaseModel):
    id_admin: int

class MessageBase(BaseModel):
    contenu: str
    type_conversation: str
    id_expediteur: Optional[int] = None
    id_assistant: Optional[int] = None
    id_conversation: Optional[int] = None

class MessageCreate(MessageBase):
    pass

class MessageUpdate(BaseModel):
    contenu: str

class MessageRead(MessageBase):
    id_message: int
    date_envoi: datetime
    lu: bool
    statut: str
    expediteur: Optional[UserMinOut] = None
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    id_utilisateur: int
    message: str
    lu: bool = False
    id_tache: Optional[int] = None
    id_conversation: Optional[int] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationRead(NotificationBase):
    id_notification: int
    date_envoi: datetime
    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    count: int

# --- Document Schemas ---
class DocumentBase(BaseModel):
    nom_original: str = Field(..., max_length=255)
    nom_stocke: str = Field(..., max_length=255)
    type_mime: str = Field(..., max_length=100)
    taille: int = Field(..., ge=0)
    chemin: str
    id_projet: Optional[int] = None
    id_tache: Optional[int] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentOut(DocumentBase):
    id: int
    id_uploader: int
    date_upload: datetime
    class Config:
        from_attributes = True

# --- ProjetMembreRole Schemas ---
class ProjetMembreRoleBase(BaseModel):
    id_projet: int
    id_utilisateur: int
    role: str = Field(..., max_length=50)

class ProjetMembreRoleCreate(ProjetMembreRoleBase):
    pass

class ProjetMembreRoleOut(ProjetMembreRoleBase):
    class Config:
        from_attributes = True

# --- Invitation Schemas ---
class InvitationBase(BaseModel):
    email_invite: str
    id_projet: int
    role_propose: str = Field(..., max_length=50)

class InvitationCreate(InvitationBase):
    pass

class InvitationOut(InvitationBase):
    id: int
    token: str
    expires_at: datetime
    statut: str
    class Config:
        from_attributes = True


# --- Reunion Schemas ---
class ReunionParticipantOut(BaseModel):
    id_utilisateur: int
    nom: str
    email: str
    statut: str
    class Config:
        from_attributes = True

class ReunionBase(BaseModel):
    titre: str
    date: datetime
    lien_virtuel: Optional[str] = None
    ordre_jour: Optional[str] = None
    compte_rendu: Optional[str] = None
    id_projet: int

class ReunionCreate(BaseModel):
    titre: str
    date: datetime
    lien_virtuel: Optional[str] = None
    ordre_jour: Optional[str] = None
    id_projet: int
    invited_user_ids: List[int] = []

class ReunionOut(ReunionBase):
    id_reunion: int
    invitations: List[ReunionParticipantOut] = []
    class Config:
        from_attributes = True

class ReunionResponseUpdate(BaseModel):
    statut: str = Field(..., pattern="^(confirme|decline)$")


# --- IA Schemas ---
class IARedigerRequest(BaseModel):
    titre: str
    type: str = "tache" # "tache" or "projet"

class IARedigerResponse(BaseModel):
    description: str

class IASuggererPrioriteRequest(BaseModel):
    titre: str
    description: Optional[str] = None
    date_echeance: Optional[datetime] = None

class IASuggererPrioriteResponse(BaseModel):
    priorite: str

class IARepartirRequest(BaseModel):
    id_projet: int
    tache_ids: List[int]

class IARepartirItem(BaseModel):
    id_tache: int
    id_utilisateur: int

class IARepartirResponse(BaseModel):
    repartition: List[IARepartirItem]

class IARisqueItem(BaseModel):
    id_tache: int
    titre: str
    statut: str
    risque: str
    raison: str

class IARisqueResponse(BaseModel):
    risques: List[IARisqueItem]
