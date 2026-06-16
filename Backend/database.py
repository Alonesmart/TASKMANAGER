import os
from pathlib import Path
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from passlib.context import CryptContext

# ─── Configuration SQLite ─────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parents[1]
SQLITE_DB_PATH = BASE_DIR / "taskmanager.db"
DATABASE_URL = URL.create("sqlite+aiosqlite", database=str(SQLITE_DB_PATH))

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)

class Base(DeclarativeBase):
    pass

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ─── Configuration Sécurité (JWT) ─────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "changez_cette_cle_en_production_!!!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
MAX_TENTATIVES = int(os.getenv("MAX_TENTATIVES", "5"))

# ─── Hachage des mots de passe ─────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Stockage en mémoire pour les tokens de reset mot de passe ────────────────
# (suffisant en dev — en prod utilise Redis ou une table DB)
reset_tokens_db: dict = {}

# ─── Dépendance FastAPI → session DB ──────────────────────────────────────────
async def get_db():
    async with SessionLocal() as db:
        yield db
