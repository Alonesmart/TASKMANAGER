from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import date, datetime
from typing import Optional, List
from .database import Base

# ==============================================================================
# 1. GESTION DES UTILISATEURS (HÉRITAGE JOINT)
# ==============================================================================

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    motdepasse: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50))  # Sert de discriminant pour le polymorphisme
    actif: Mapped[bool] = mapped_column(Boolean, default=True)
    tentatives: Mapped[int] = mapped_column(Integer, default=0)
    en_ligne: Mapped[bool] = mapped_column(Boolean, default=False)
    derniere_connexion: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relations communes ou globales
    messages_envoyes: Mapped[List["Message"]] = relationship("Message", foreign_keys="Message.id_expediteur", back_populates="expediteur")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="utilisateur")
    reset_tokens: Mapped[List["ResetToken"]] = relationship("ResetToken", back_populates="user")
    reunions: Mapped[List["Reunion"]] = relationship("Reunion", secondary="participation_reunion", back_populates="participants")
    equipes_creees: Mapped[List["Equipe"]] = relationship("Equipe", back_populates="createur")
    taches_assignees: Mapped[List["TacheAssignation"]] = relationship("TacheAssignation", back_populates="utilisateur")
    projets_roles: Mapped[List["ProjetMembreRole"]] = relationship("ProjetMembreRole", back_populates="utilisateur", cascade="all, delete-orphan")
    reunion_invitations: Mapped[List["ParticipationReunion"]] = relationship("ParticipationReunion", back_populates="utilisateur", cascade="all, delete-orphan")
    google_credentials: Mapped[List["GoogleCredential"]] = relationship("GoogleCredential", back_populates="user", cascade="all, delete-orphan")

    __mapper_args__ = {
        "polymorphic_on": role,
        "polymorphic_identity": "utilisateur"
    }

class Administrateur(User):
    __tablename__ = "administrateurs"
    id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    projets_supervises: Mapped[List["Projet"]] = relationship("Projet", back_populates="administrateur")

    __mapper_args__ = {
        "polymorphic_identity": "admin"
    }

class Personnel(User):
    __tablename__ = "personnels"
    id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    commentaires: Mapped[List["Commentaire"]] = relationship("Commentaire", back_populates="personnel")
    rapports_generes: Mapped[List["Rapport"]] = relationship("Rapport", back_populates="personnel")
    appartenances_equipe: Mapped[List["Appartient_Equipe"]] = relationship("Appartient_Equipe", back_populates="personnel")

    __mapper_args__ = {
        "polymorphic_identity": "personnel"
    }


# ==============================================================================
# 2. CŒUR DE LA GESTION DE PROJET
# ==============================================================================

class Projet(Base):
    __tablename__ = "projets"
    id_projet: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dateDebut: Mapped[date] = mapped_column(Date)
    dateFin: Mapped[date] = mapped_column(Date)
    priorite: Mapped[str] = mapped_column(String(50), default="moyenne")
    statut: Mapped[str] = mapped_column(String(50), default="actif")
    etat: Mapped[str] = mapped_column(String(50), default="en_cours")
    id_administrateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))

    administrateur: Mapped["User"] = relationship("User")
    taches: Mapped[List["Tache"]] = relationship("Tache", back_populates="projet", cascade="all, delete-orphan")
    equipe: Mapped[Optional["Equipe"]] = relationship("Equipe", back_populates="projet", cascade="all, delete-orphan", uselist=False, lazy="selectin")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="projet", cascade="all, delete-orphan")
    rapports: Mapped[List["Rapport"]] = relationship("Rapport", back_populates="projet", cascade="all, delete-orphan")
    reunions: Mapped[List["Reunion"]] = relationship("Reunion", back_populates="projet", cascade="all, delete-orphan")
    membres_roles: Mapped[List["ProjetMembreRole"]] = relationship("ProjetMembreRole", back_populates="projet", cascade="all, delete-orphan")
    invitations: Mapped[List["Invitation"]] = relationship("Invitation", back_populates="projet", cascade="all, delete-orphan")


class Tache(Base):
    __tablename__ = "taches"
    id_tache: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priorite: Mapped[str] = mapped_column(String(50), default="moyenne")
    statut: Mapped[str] = mapped_column(String(50), default="a_faire")
    status: Mapped[str] = mapped_column(String(50), default="a_faire")
    echeance: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    progression: Mapped[int] = mapped_column(Integer, default=0)
    etat: Mapped[str] = mapped_column(String(50), default="active")
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"), index=True)

    preuve_texte: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_document_preuve: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    commentaire_rejet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    projet: Mapped["Projet"] = relationship("Projet", back_populates="taches", lazy="selectin")
    commentaires: Mapped[List["Commentaire"]] = relationship("Commentaire", back_populates="tache", cascade="all, delete-orphan")
    notifications_declenchees: Mapped[List["Notification"]] = relationship("Notification", back_populates="tache_origine")
    assignations: Mapped[List["TacheAssignation"]] = relationship("TacheAssignation", back_populates="tache", cascade="all, delete-orphan", lazy="selectin")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="tache", cascade="all, delete-orphan", foreign_keys="[Document.id_tache]")
    document_preuve: Mapped[Optional["Document"]] = relationship("Document", foreign_keys=[id_document_preuve])
    historique_validation: Mapped[List["HistoriqueValidationTache"]] = relationship("HistoriqueValidationTache", back_populates="tache", cascade="all, delete-orphan", lazy="selectin")

    dependencies: Mapped[List["Tache"]] = relationship(
        "Tache",
        secondary="tache_dependances",
        primaryjoin="Tache.id_tache == TacheDependance.id_tache",
        secondaryjoin="Tache.id_tache == TacheDependance.id_dependance",
        back_populates="dependents",
        lazy="selectin"
    )

    dependents: Mapped[List["Tache"]] = relationship(
        "Tache",
        secondary="tache_dependances",
        primaryjoin="Tache.id_tache == TacheDependance.id_dependance",
        secondaryjoin="Tache.id_tache == TacheDependance.id_tache",
        back_populates="dependencies",
        lazy="selectin"
    )


class HistoriqueValidationTache(Base):
    __tablename__ = "historique_validation_taches"
    id_historique: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    id_tache: Mapped[int] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="CASCADE"), index=True)
    ancien_statut: Mapped[str] = mapped_column(String(50))
    nouveau_statut: Mapped[str] = mapped_column(String(50))
    id_acteur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    commentaire: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    tache: Mapped["Tache"] = relationship("Tache", back_populates="historique_validation")
    acteur: Mapped["User"] = relationship("User")


class TacheAssignation(Base):
    __tablename__ = "tache_assignations"
    id_tache: Mapped[int] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="CASCADE"), primary_key=True)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    tache: Mapped["Tache"] = relationship("Tache", back_populates="assignations")
    utilisateur: Mapped["User"] = relationship("User", back_populates="taches_assignees", lazy="selectin")


class TacheDependance(Base):
    __tablename__ = "tache_dependances"
    id_tache: Mapped[int] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="CASCADE"), primary_key=True)
    id_dependance: Mapped[int] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="CASCADE"), primary_key=True)


class Equipe(Base):
    __tablename__ = "equipes"
    id_equipe: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet"), unique=True)
    id_personnel_createur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))

    projet: Mapped["Projet"] = relationship("Projet", back_populates="equipe")
    createur: Mapped["User"] = relationship("User", back_populates="equipes_creees")
    membres: Mapped[List["Appartient_Equipe"]] = relationship("Appartient_Equipe", back_populates="equipe", cascade="all, delete-orphan")


class Appartient_Equipe(Base):
    __tablename__ = "appartient_equipe"
    id_personnel: Mapped[int] = mapped_column(Integer, ForeignKey("personnels.id", ondelete="CASCADE"), primary_key=True)
    id_equipe: Mapped[int] = mapped_column(Integer, ForeignKey("equipes.id_equipe", ondelete="CASCADE"), primary_key=True)

    personnel: Mapped["Personnel"] = relationship("Personnel", back_populates="appartenances_equipe")
    equipe: Mapped["Equipe"] = relationship("Equipe", back_populates="membres")


class ProjetMembreRole(Base):
    __tablename__ = "projet_membre_roles"
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"), primary_key=True)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(50))  # "chef_projet", "collaborateur", "invite_externe"

    projet: Mapped["Projet"] = relationship("Projet", back_populates="membres_roles")
    utilisateur: Mapped["User"] = relationship("User", back_populates="projets_roles")


class Invitation(Base):
    __tablename__ = "invitations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email_invite: Mapped[str] = mapped_column(String(255))
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"))
    role_propose: Mapped[str] = mapped_column(String(50))  # "chef_projet", "collaborateur", "invite_externe"
    token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    statut: Mapped[str] = mapped_column(String(50), default="pending")  # "pending", "acceptee", "refusee"

    projet: Mapped["Projet"] = relationship("Projet", back_populates="invitations")


# ==============================================================================
# 3. DOCUMENTS, RAPPORTS ET COMMENTAIRES
# ==============================================================================

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom_original: Mapped[str] = mapped_column(String(255))
    nom_stocke: Mapped[str] = mapped_column(String(255))
    type_mime: Mapped[str] = mapped_column(String(100))
    taille: Mapped[int] = mapped_column(Integer)
    chemin: Mapped[str] = mapped_column(Text)
    id_projet: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"), nullable=True)
    id_tache: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="CASCADE"), nullable=True)
    id_uploader: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    date_upload: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    projet: Mapped[Optional["Projet"]] = relationship("Projet", back_populates="documents")
    tache: Mapped[Optional["Tache"]] = relationship("Tache", back_populates="documents", foreign_keys=[id_tache])
    uploader: Mapped["User"] = relationship("User")


class Rapport(Base):
    __tablename__ = "rapports"
    id_rapport: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[str] = mapped_column(String(150))
    contenu: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))
    periode: Mapped[str] = mapped_column(String(100), default="non_specifie")
    statut: Mapped[str] = mapped_column(String(50), default="brouillon")
    date_generation: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    date_soumission: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    date_validation: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    commentaire_validation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"), index=True)
    id_personnel: Mapped[int] = mapped_column(Integer, ForeignKey("personnels.id"))
    id_tache: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="SET NULL"), nullable=True, index=True)

    projet: Mapped["Projet"] = relationship("Projet", back_populates="rapports")
    personnel: Mapped["Personnel"] = relationship("Personnel", back_populates="rapports_generes")
    tache: Mapped[Optional["Tache"]] = relationship("Tache")
    historique: Mapped[List["HistoriqueRapport"]] = relationship("HistoriqueRapport", back_populates="rapport", cascade="all, delete-orphan")


class HistoriqueRapport(Base):
    __tablename__ = "historique_rapports"
    id_historique: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    id_rapport: Mapped[int] = mapped_column(Integer, ForeignKey("rapports.id_rapport", ondelete="CASCADE"), index=True)
    ancien_statut: Mapped[str] = mapped_column(String(50))
    nouveau_statut: Mapped[str] = mapped_column(String(50))
    id_acteur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    commentaire: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    rapport: Mapped["Rapport"] = relationship("Rapport", back_populates="historique")
    acteur: Mapped["User"] = relationship("User")


class Commentaire(Base):
    __tablename__ = "commentaires"
    id_commentaire: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contenu: Mapped[str] = mapped_column(Text)
    date_creation: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    id_tache: Mapped[int] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="CASCADE"))
    id_personnel: Mapped[int] = mapped_column(Integer, ForeignKey("personnels.id"))

    tache: Mapped["Tache"] = relationship("Tache", back_populates="commentaires")
    personnel: Mapped["Personnel"] = relationship("Personnel", back_populates="commentaires")


# ==============================================================================
# 4. COMMUNICATION & ASSISTANT IA
# ==============================================================================

class Conversation(Base):
    __tablename__ = "conversations"
    id_conversation: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="direct")  # 'direct' or 'groupe'
    id_admin: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    avatar: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    date_creation: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    admin: Mapped[Optional["User"]] = relationship("User", foreign_keys=[id_admin])
    participants: Mapped[List["ConversationParticipant"]] = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    id_conversation: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id_conversation", ondelete="CASCADE"), primary_key=True)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="participants")
    utilisateur: Mapped["User"] = relationship("User")


class AssistantIA(Base):
    __tablename__ = "assistants_ia"
    id_ia: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    etat: Mapped[str] = mapped_column(String(50), default="actif")

    messages_assistes: Mapped[List["Message"]] = relationship("Message", back_populates="assistant")


class Message(Base):
    __tablename__ = "messages"
    id_message: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contenu: Mapped[str] = mapped_column(Text)
    type_conversation: Mapped[str] = mapped_column(String(50))
    date_envoi: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    lu: Mapped[bool] = mapped_column(Boolean, default=False)
    statut: Mapped[str] = mapped_column(String(50), default="envoye")  # 'envoye', 'distribue', 'lu'
    id_expediteur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    id_ia: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("assistants_ia.id_ia"), nullable=True)
    id_conversation: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("conversations.id_conversation"), nullable=True)

    expediteur: Mapped["User"] = relationship("User", foreign_keys=[id_expediteur], back_populates="messages_envoyes")
    assistant: Mapped[Optional["AssistantIA"]] = relationship("AssistantIA", back_populates="messages_assistes")
    conversation: Mapped[Optional["Conversation"]] = relationship("Conversation", back_populates="messages")
    lectures: Mapped[List["LectureMessage"]] = relationship("LectureMessage", back_populates="message", cascade="all, delete-orphan")


class LectureMessage(Base):
    __tablename__ = "lectures_messages"
    id_lecture: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    id_message: Mapped[int] = mapped_column(Integer, ForeignKey("messages.id_message", ondelete="CASCADE"))
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    date_lecture: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    message: Mapped["Message"] = relationship("Message", back_populates="lectures")
    utilisateur: Mapped["User"] = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"
    id_notification: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    message: Mapped[str] = mapped_column(Text)
    lu: Mapped[bool] = mapped_column(Boolean, default=False)
    date_envoi: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    id_tache: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="SET NULL"), nullable=True)
    id_conversation: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("conversations.id_conversation", ondelete="CASCADE"), nullable=True)

    utilisateur: Mapped["User"] = relationship("User", back_populates="notifications")
    tache_origine: Mapped[Optional["Tache"]] = relationship("Tache", back_populates="notifications_declenchees")
    conversation: Mapped[Optional["Conversation"]] = relationship("Conversation")


# ==============================================================================
# 5. RÉUNIONS (RELATION TABLE SECONDAIRE)
# ==============================================================================

class ParticipationReunion(Base):
    __tablename__ = "participation_reunion"
    id_reunion: Mapped[int] = mapped_column(Integer, ForeignKey("reunions.id_reunion", ondelete="CASCADE"), primary_key=True)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    statut: Mapped[str] = mapped_column(String(50), default="invite")

    reunion: Mapped["Reunion"] = relationship("Reunion", back_populates="invitations")
    utilisateur: Mapped["User"] = relationship("User", back_populates="reunion_invitations")


class Reunion(Base):
    __tablename__ = "reunions"
    id_reunion: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[str] = mapped_column(String(150))
    date: Mapped[datetime] = mapped_column(DateTime)
    lien_virtuel: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ordre_jour: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    compte_rendu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"), index=True)

    projet: Mapped["Projet"] = relationship("Projet", back_populates="reunions")
    participants: Mapped[List["User"]] = relationship("User", secondary="participation_reunion", back_populates="reunions")
    invitations: Mapped[List["ParticipationReunion"]] = relationship("ParticipationReunion", back_populates="reunion", cascade="all, delete-orphan", lazy="selectin")


# ==============================================================================
# 6. SÉCURITÉ & AUTHENTIFICATION
# ==============================================================================

class ResetToken(Base):
    __tablename__ = "reset_tokens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    used: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User", back_populates="reset_tokens")

class GoogleCredential(Base):
    __tablename__ = "google_credentials"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    access_token: Mapped[str] = mapped_column(String(500))
    refresh_token: Mapped[str] = mapped_column(String(500))
    token_expiry: Mapped[datetime] = mapped_column(DateTime)
    
    user: Mapped["User"] = relationship("User", back_populates="google_credentials")
