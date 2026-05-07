from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    nom        = Column(String(100), nullable=False)
    email      = Column(String(150), unique=True, index=True)
    phone      = Column(String(20))
    motdepasse = Column(String(255), nullable=False)
    role       = Column(Enum("admin", "chef_projet", "collaborateur"), default="collaborateur")
    tentatives = Column(Integer, default=0)
    actif      = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
