from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom        = Column(String(100), nullable=False)
    email      = Column(String(150), unique=True, index=True, nullable=False)
    phone      = Column(String(20), nullable=True)
    motdepasse = Column(String(255), nullable=False)   # stocke le hash bcrypt
    role       = Column(
                    Enum("admin", "chef_projet", "personnel"),
                    default="admin",
                    nullable=False
                )
    created_at = Column(DateTime, default=datetime.utcnow)