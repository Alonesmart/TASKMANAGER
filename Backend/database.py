import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext

# ─── URL de connexion MySQL ────────────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://taskuser:Task2024!@localhost:3306/taskmanager"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── Configuration Sécurité (JWT) ─────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "changez_cette_cle_en_production_!!!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ─── Hachage des mots de passe ─────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Stockage en mémoire pour les tokens de reset mot de passe ────────────────
# (suffisant en dev — en prod utilise Redis ou une table DB)
reset_tokens_db: dict = {}

# ─── Dépendance FastAPI → session DB ──────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()