import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext

# ─── URL de connexion MySQL ────────────────────────────────────────────────────
# Configurable via variable d'environnement DATABASE_URL
# Format : mysql+pymysql://user:password@host:port/dbname
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://taskuser:Task2024!@localhost:3306/taskmanager"
)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # vérifie la connexion avant chaque requête
    pool_recycle=3600,        # recycle les connexions toutes les 1h
    pool_size=10,             # taille du pool de connexions
    max_overflow=20,          # connexions supplémentaires si le pool est plein
    echo=False,               # mettre True pour voir les requêtes SQL en console
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── Hachage des mots de passe ─────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Dépendance FastAPI → session DB ──────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()