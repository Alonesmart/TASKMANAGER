from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# ─── Configuration MySQL ───────────────────────────────────────
DB_USER = "root"
DB_PASSWORD = "votre_mot_de_passe"
DB_HOST = "localhost"
DB_PORT = "3306"
DB_NAME = "taskmanager"

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Stockage temporaire utilise par les routes login/register actuelles.
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
fake_users_db = {}
login_logs = []
reset_tokens_db = {}

# ─── Dépendance pour les routes ───────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
