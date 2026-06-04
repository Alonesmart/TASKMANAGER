from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from .routes.login import router as login_router
from .routes.register import router as register_router
from .routes.forgot_password import router as forgot_router
from .routes.users import router as users_router

from .database import Base, engine
from . import models  # noqa: F401 — nécessaire pour que SQLAlchemy détecte les tables
from .Schemas import UserResponse

#  Création automatique des tables MySQL
Base.metadata.create_all(bind=engine)

#  Assure la compatibilité de la base de données avec les modèles SQLAlchemy
try:
    with engine.begin() as conn:
        # Ajout manuel des colonnes de timestamp si elles manquent (migration dev)
        try:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        except Exception:
            pass  # La colonne existe probablement déjà
            
        try:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
        except Exception:
            pass  # La colonne existe probablement déjà

        # Mise à jour de l'enum role
        conn.exec_driver_sql(
            "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'chef_projet', 'personnel', 'collaborateur') "
            "NOT NULL DEFAULT 'personnel'"
        )
        conn.exec_driver_sql(
            "UPDATE users SET role='personnel' WHERE role='collaborateur'"
        )
except Exception as e:
    print(f"Note: Migration manuelle ignorée ou échouée : {e}")

#  Application FastAPI
app = FastAPI(
    title="TaskManager API",
    description="API d'authentification — Login, Register, Reset Password",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

#  CORS (indispensable pour React Native) 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ─── Inclusion des Routers par modules
app.include_router(login_router, tags=["Login"])
app.include_router(register_router, tags=["Register"])
app.include_router(forgot_router, tags=["Password"])
app.include_router(users_router)

# ─── Routes utilitaires
@app.get("/")
def root():
    return {"status": "ok", "message": "TaskManager API en ligne !"}
