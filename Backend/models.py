from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, Date, CheckConstraint
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
from datetime import timezone

def _now_utc():
    """Retourne l'heure UTC actuelle (compatible Python ≥ 3.12)."""
    return datetime.now(timezone.utc) 

class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom        = Column(String(100), nullable=False)
    email      = Column(String(150), unique=True, index=True, nullable=False)
    phone      = Column(String(20), nullable=True)
    motdepasse = Column(String(255), nullable=False)
    role       = Column(
                    Enum("admin", "chef_projet", "personnel", "collaborateur"),
                    default="personnel",
                    nullable=False,
                )
    actif      = Column(Boolean, default=True, nullable=False)        
    tentatives = Column(Integer, default=0, nullable=False)  
    created_at = Column(DateTime, default=_now_utc)
    updated_at     = Column(DateTime, nullable=False, default=_now_utc, onupdate=_now_utc)

   # Relations
    administrateur      = relationship("Administrateur", back_populates="utilisateur", uselist=False)
    personnel           = relationship("Personnel",      back_populates="utilisateur", uselist=False)
    reset_tokens        = relationship("ResetToken",     back_populates="user",        cascade="all, delete-orphan", overlaps="reset_tokens")
    messages_envoyes    = relationship("Message",        back_populates="expediteur",  cascade="all, delete-orphan", foreign_keys="Message.id_expediteur")
    destinataires       = relationship("MessageDestinataire", back_populates="utilisateur", cascade="all, delete-orphan")
    notifications       = relationship("Notification",   back_populates="utilisateur", cascade="all, delete-orphan")
    commentaires        = relationship("Commentaire",    back_populates="utilisateur", cascade="all, delete-orphan")
    rapports            = relationship("Rapport",        back_populates="utilisateur", cascade="all, delete-orphan")
    taches_assignees    = relationship("TacheAssignee",  back_populates="utilisateur", cascade="all, delete-orphan")
    reunions_participees = relationship("ParticipeReunion", back_populates="utilisateur", cascade="all, delete-orphan")
    documents           = relationship("Document",       back_populates="utilisateur")
 
class Administrateur(Base):
    __tablename__ = "Administrateur"
 
    id_utilisateur = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
 
    utilisateur = relationship("User", back_populates="administrateur")
    projets     = relationship("Projet", back_populates="administrateur")
 
 
class Personnel(Base):
    __tablename__ = "Personnel"
 
    id_utilisateur = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
 
    utilisateur = relationship("User", back_populates="personnel")
    equipes     = relationship("AppartientEquipe", back_populates="personnel", cascade="all, delete-orphan")
 
 
# ─── 2. TOKENS DE RÉINITIALISATION ────────────────────────────────────────────
 
class ResetToken(Base):
    __tablename__ = "reset_tokens"
 
    id         = Column(Integer, primary_key=True, autoincrement=True)
    token      = Column(String(128), unique=True, index=True, nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=_now_utc)
 
    user = relationship("User", back_populates="reset_tokens")
 
 
# ─── 3. PROJETS ET ÉQUIPES ─────────────────────────────────────────────────────
 
class Projet(Base):
    __tablename__ = "Projet"
 
    id_projet         = Column(Integer, primary_key=True, autoincrement=True)
    titre             = Column(String(150), nullable=False)
    description       = Column(Text)
    dateDebut         = Column(Date)
    dateFin           = Column(Date)
    statut            = Column(String(50))
    etat              = Column(String(50))
    priorite          = Column(Enum("haute", "moyenne", "basse"), default="moyenne")
    couleur           = Column(String(20))
    icone             = Column(String(10))
    id_administrateur = Column(Integer, ForeignKey("Administrateur.id_utilisateur", ondelete="SET NULL"), nullable=True)
    created_at        = Column(DateTime, nullable=False, default=_now_utc)
    updated_at        = Column(DateTime, nullable=False, default=_now_utc, onupdate=_now_utc)
 
    administrateur = relationship("Administrateur", back_populates="projets")
    equipe         = relationship("Equipe",     back_populates="projet",    uselist=False, cascade="all, delete-orphan")
    taches         = relationship("Tache",      back_populates="projet",    cascade="all, delete-orphan")
    rapport        = relationship("Rapport",    back_populates="projet",    cascade="all, delete-orphan")
    documents      = relationship("Document",   back_populates="projet",    cascade="all, delete-orphan")
    reunions       = relationship("Reunion",    back_populates="projet",    cascade="all, delete-orphan")
 
 
class Equipe(Base):
    __tablename__ = "Equipe"
 
    id_equipe   = Column(Integer, primary_key=True, autoincrement=True)
    nom         = Column(String(100), nullable=False)
    description = Column(Text)
    id_projet   = Column(Integer, ForeignKey("Projet.id_projet", ondelete="CASCADE"), unique=True, nullable=False)
 
    projet   = relationship("Projet",          back_populates="equipe")
    membres  = relationship("AppartientEquipe", back_populates="equipe", cascade="all, delete-orphan")
 
 
class AppartientEquipe(Base):
    __tablename__ = "Appartient_Equipe"
 
    id_utilisateur = Column(Integer, ForeignKey("Personnel.id_utilisateur",  ondelete="CASCADE"), primary_key=True)
    id_equipe      = Column(Integer, ForeignKey("Equipe.id_equipe",           ondelete="CASCADE"), primary_key=True)
    rejoint_le     = Column(DateTime, default=_now_utc)
 
    personnel = relationship("Personnel", back_populates="equipes")
    equipe    = relationship("Equipe",    back_populates="membres")
 
 
# ─── 4. TÂCHES, COMMENTAIRES, RAPPORTS ────────────────────────────────────────
 
class Tache(Base):
    __tablename__ = "Tache"
    __table_args__ = (
        CheckConstraint("progression BETWEEN 0 AND 100", name="ck_tache_progression"),
    )
 
    id_tache    = Column(Integer, primary_key=True, autoincrement=True)
    titre       = Column(String(150), nullable=False)
    description = Column(Text)
    priorite    = Column(Enum("faible", "moyenne", "haute"), default="faible")
    statut      = Column(Enum("a_faire", "en_cours", "terminees"), default="a_faire")
    echeance    = Column(Date)
    dateDebut   = Column(Date)
    progression = Column(Integer, nullable=False, default=0)
    etat        = Column(String(50))
    id_projet   = Column(Integer, ForeignKey("Projet.id_projet", ondelete="CASCADE"), nullable=False)
    created_at  = Column(DateTime, nullable=False, default=_now_utc)
    updated_at  = Column(DateTime, nullable=False, default=_now_utc, onupdate=_now_utc)
 
    projet      = relationship("Projet",       back_populates="taches")
    assignees   = relationship("TacheAssignee", back_populates="tache", cascade="all, delete-orphan")
    commentaires = relationship("Commentaire",  back_populates="tache",  cascade="all, delete-orphan")
 
 
class TacheAssignee(Base):
    __tablename__ = "Tache_Assignee"
 
    id_tache       = Column(Integer, ForeignKey("Tache.id_tache",             ondelete="CASCADE"), primary_key=True)
    id_utilisateur = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    assigne_le     = Column(DateTime, default=_now_utc)
 
    tache       = relationship("Tache",       back_populates="assignees")
    utilisateur = relationship("User", back_populates="taches_assignees")
 
 
class Commentaire(Base):
    __tablename__ = "Commentaire"
 
    id_commentaire = Column(Integer, primary_key=True, autoincrement=True)
    contenu        = Column(Text, nullable=False)
    date_envoi     = Column(DateTime, nullable=False, default=_now_utc)
    id_tache       = Column(Integer, ForeignKey("Tache.id_tache",             ondelete="CASCADE"), nullable=False)
    id_utilisateur = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
 
    tache       = relationship("Tache",       back_populates="commentaires")
    utilisateur = relationship("User", back_populates="commentaires")
 
 
class Rapport(Base):
    __tablename__ = "Rapport"
 
    id_rapport       = Column(Integer, primary_key=True, autoincrement=True)
    type             = Column(String(100))
    titre            = Column(String(150))
    contenu          = Column(Text)
    periode          = Column(String(100))
    dateGeneration   = Column(DateTime, nullable=False, default=_now_utc)
    statut           = Column(Enum("brouillon", "envoye", "archive"), default="brouillon")
    id_projet        = Column(Integer, ForeignKey("Projet.id_projet",             ondelete="CASCADE"), nullable=False)
    id_utilisateur   = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
 
    projet      = relationship("Projet",       back_populates="rapport")
    utilisateur = relationship("User",  back_populates="rapports")
 
 
# ─── 5. COMMUNICATION, DOCUMENTS, IA ──────────────────────────────────────────
 
class AssistantIA(Base):
    __tablename__ = "Assistant_IA"
 
    id_assistant = Column(Integer, primary_key=True, autoincrement=True)
    etat         = Column(String(50))
 
    messages = relationship("Message", back_populates="assistant")
 
 
class Message(Base):
    __tablename__ = "Message"
 
    id_message        = Column(Integer, primary_key=True, autoincrement=True)
    contenu           = Column(Text, nullable=False)
    objet             = Column(String(150))
    priorite          = Column(Enum("normal", "urgent"), default="normal")
    date_envoi        = Column(DateTime, nullable=False, default=_now_utc)
    type_conversation = Column(String(100))
    lu                = Column(Boolean, nullable=False, default=False)
    id_expediteur     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    id_assistant      = Column(Integer, ForeignKey("Assistant_IA.id_assistant",  ondelete="SET NULL"), nullable=True)
 
    expediteur    = relationship("User",         back_populates="messages_envoyes", foreign_keys=[id_expediteur])
    assistant     = relationship("AssistantIA",         back_populates="messages")
    destinataires = relationship("MessageDestinataire", back_populates="message",   cascade="all, delete-orphan")
    pieces_jointes = relationship("PieceJointe",        back_populates="message",   cascade="all, delete-orphan")
 
 
class MessageDestinataire(Base):
    __tablename__ = "Message_Destinataire"
 
    id_message     = Column(Integer, ForeignKey("Message.id_message",           ondelete="CASCADE"), primary_key=True)
    id_utilisateur = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), primary_key=True)
    lu             = Column(Boolean, nullable=False, default=False)
    lu_le          = Column(DateTime, nullable=True)
 
    message     = relationship("Message",     back_populates="destinataires")
    utilisateur = relationship("User", back_populates="destinataires")
 
 
class PieceJointe(Base):
    __tablename__ = "Piece_Jointe"
 
    id_piece_jointe = Column(Integer, primary_key=True, autoincrement=True)
    nom             = Column(String(255), nullable=False)
    url             = Column(String(500), nullable=False)
    type_mime       = Column(String(100))
    taille_octets   = Column(Integer)
    kind            = Column(Enum("image", "file", "link"), default="file")
    id_message      = Column(Integer, ForeignKey("Message.id_message", ondelete="CASCADE"), nullable=False)
 
    message = relationship("Message", back_populates="pieces_jointes")
 
 
class Notification(Base):
    __tablename__ = "Notification"
 
    id_notification = Column(Integer, primary_key=True, autoincrement=True)
    type            = Column(String(100))
    message         = Column(Text)
    date_envoi      = Column(DateTime, nullable=False, default=_now_utc)
    lu              = Column(Boolean, nullable=False, default=False)
    id_utilisateur  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
 
    utilisateur = relationship("User", back_populates="notifications")
 
 
class Document(Base):
    __tablename__ = "Document"
 
    id_document    = Column(Integer, primary_key=True, autoincrement=True)
    nom            = Column(String(255), nullable=False)
    format         = Column(String(50))
    url            = Column(String(500))
    date_ajout     = Column(DateTime, nullable=False, default=_now_utc)
    id_projet      = Column(Integer, ForeignKey("Projet.id_projet",             ondelete="CASCADE"),   nullable=False)
    id_utilisateur = Column(Integer, ForeignKey("users.id",   ondelete="SET NULL"),  nullable=True)
 
    projet      = relationship("Projet",       back_populates="documents")
    utilisateur = relationship("User",  back_populates="documents")
 
 
class Reunion(Base):
    __tablename__ = "Reunion"
 
    id_reunion   = Column(Integer, primary_key=True, autoincrement=True)
    titre        = Column(String(150), nullable=False)
    date_reunion = Column(DateTime, nullable=False)
    lien_virtuel = Column(String(500))
    ordre_jour   = Column(Text)
    compte_rendu = Column(Text)
    id_projet    = Column(Integer, ForeignKey("Projet.id_projet", ondelete="CASCADE"), nullable=False)
 
    projet       = relationship("Projet",         back_populates="reunions")
    participants = relationship("ParticipeReunion", back_populates="reunion", cascade="all, delete-orphan")
 
 
class ParticipeReunion(Base):
    __tablename__ = "Participe_Reunion"
 
    id_utilisateur = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    id_reunion     = Column(Integer, ForeignKey("Reunion.id_reunion",          ondelete="CASCADE"), primary_key=True)
    confirme       = Column(Boolean, default=False)
 
    utilisateur = relationship("User",     back_populates="reunions_participees")
    reunion     = relationship("Reunion",     back_populates="participants")