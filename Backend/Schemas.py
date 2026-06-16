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
    pass

class TacheUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    priorite: Optional[str] = Field(None, max_length=50)
    statut: Optional[str] = Field(None, max_length=50)
    echeance: Optional[date] = None
    progression: Optional[int] = Field(None, ge=0, le=100)
    etat: Optional[str] = Field(None, max_length=50)

class TacheOut(TacheBase):
    id_tache: int
    projet: Optional[ProjetOut] = None
    class Config:
        from_attributes = True

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


# --- Message Schemas ---
class MessageBase(BaseModel):
    contenu: str
    type_conversation: str
    id_expediteur: int
    id_assistant: Optional[int] = None

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    id_message: int
    date_envoi: datetime
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    id_utilisateur: int
    message: str
    lu: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationRead(NotificationBase):
    id_notification: int
    date_envoi: datetime
    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    count: int
