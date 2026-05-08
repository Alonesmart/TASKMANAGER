from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
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
    created_at = Column(DateTime, default=datetime.utcnow)

    reset_tokens = relationship("ResetToken", back_populates="user", cascade="all, delete-orphan")


class ResetToken(Base):
    __tablename__ = "reset_tokens"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    token      = Column(String(128), unique=True, index=True, nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="reset_tokens")