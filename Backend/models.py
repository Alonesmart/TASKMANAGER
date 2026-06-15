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

    # Relations communes ou globales
    messages_envoyes: Mapped[List["Message"]] = relationship("Message", foreign_keys="Message.id_expediteur", back_populates="expediteur")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="utilisateur")
    reset_tokens: Mapped[List["ResetToken"]] = relationship("ResetToken", back_populates="user")
    reunions: Mapped[List["Reunion"]] = relationship("Reunion", secondary="participation_reunion", back_populates="participants")
    equipes_creees: Mapped[List["Equipe"]] = relationship("Equipe", back_populates="createur")

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


class Tache(Base):
    __tablename__ = "taches"
    id_tache: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priorite: Mapped[str] = mapped_column(String(50), default="moyenne")
    statut: Mapped[str] = mapped_column(String(50), default="a_faire")
    status: Mapped[str] = mapped_column(String(50), default="todo")
    echeance: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    progression: Mapped[int] = mapped_column(Integer, default=0)
    etat: Mapped[str] = mapped_column(String(50), default="active")
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"))

    projet: Mapped["Projet"] = relationship("Projet", back_populates="taches", lazy="selectin")
    commentaires: Mapped[List["Commentaire"]] = relationship("Commentaire", back_populates="tache", cascade="all, delete-orphan")
    notifications_declenchees: Mapped[List["Notification"]] = relationship("Notification", back_populates="tache_origine")


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


# ==============================================================================
# 3. DOCUMENTS, RAPPORTS ET COMMENTAIRES
# ==============================================================================

class Document(Base):
    __tablename__ = "documents"
    id_document: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(150))
    format: Mapped[str] = mapped_column(String(10))
    uri: Mapped[str] = mapped_column(Text)
    date_ajout: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"))

    projet: Mapped["Projet"] = relationship("Projet", back_populates="documents")


class Rapport(Base):
    __tablename__ = "rapports"
    id_rapport: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(50))
    periode: Mapped[str] = mapped_column(String(100))
    date_generation: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"))
    id_personnel: Mapped[int] = mapped_column(Integer, ForeignKey("personnels.id"))

    projet: Mapped["Projet"] = relationship("Projet", back_populates="rapports")
    personnel: Mapped["Personnel"] = relationship("Personnel", back_populates="rapports_generes")


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
    id_expediteur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    id_ia: Mapped[int] = mapped_column(Integer, ForeignKey("assistants_ia.id_ia"))

    expediteur: Mapped["User"] = relationship("User", foreign_keys=[id_expediteur], back_populates="messages_envoyes")
    assistant: Mapped["AssistantIA"] = relationship("AssistantIA", back_populates="messages_assistes")


class Notification(Base):
    __tablename__ = "notifications"
    id_notification: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    message: Mapped[str] = mapped_column(Text)
    lu: Mapped[bool] = mapped_column(Boolean, default=False)
    date_envoi: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    id_tache: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("taches.id_tache", ondelete="SET NULL"), nullable=True)

    utilisateur: Mapped["User"] = relationship("User", back_populates="notifications")
    tache_origine: Mapped[Optional["Tache"]] = relationship("Tache", back_populates="notifications_declenchees")


# ==============================================================================
# 5. RÉUNIONS (RELATION TABLE SECONDAIRE)
# ==============================================================================

class ParticipationReunion(Base):
    __tablename__ = "participation_reunion"
    id_reunion: Mapped[int] = mapped_column(Integer, ForeignKey("reunions.id_reunion", ondelete="CASCADE"), primary_key=True)
    id_utilisateur: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class Reunion(Base):
    __tablename__ = "reunions"
    id_reunion: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titre: Mapped[str] = mapped_column(String(150))
    date: Mapped[datetime] = mapped_column(DateTime)
    lien_virtuel: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ordre_jour: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    compte_rendu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_projet: Mapped[int] = mapped_column(Integer, ForeignKey("projets.id_projet", ondelete="CASCADE"))

    projet: Mapped["Projet"] = relationship("Projet", back_populates="reunions")
    participants: Mapped[List["User"]] = relationship("User", secondary="participation_reunion", back_populates="reunions")


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