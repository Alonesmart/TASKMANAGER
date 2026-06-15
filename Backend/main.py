from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from .routes.login import router as login_router
from .routes.register import router as register_router
from .routes.forgot_password import router as forgot_router
from .routes.users import router as users_router
from .routes.core import router as core_router
from .routes.communication import router as comm_router

from .database import Base, engine
from . import models  # noqa: F401 — nécessaire pour que SQLAlchemy détecte les tables
from .Schemas import UserResponse

#  Application FastAPI
app = FastAPI(
    title="TaskManager API",
    description="API d'authentification — Login, Register, Reset Password",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Initialisation asynchrone de la base de données
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # Création des tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Migrations manuelles
        try:
            # Ajout des colonnes si manquantes
            try:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
            except Exception:
                pass
                
            try:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
            except Exception:
                pass

            try:
                await conn.exec_driver_sql("ALTER TABLE taches ADD COLUMN status VARCHAR(50) DEFAULT 'todo'")
            except Exception:
                pass

            # Mise à jour de l'enum role
            await conn.exec_driver_sql(
                "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'chef_projet', 'personnel', 'collaborateur') "
                "NOT NULL DEFAULT 'personnel'"
            )
            await conn.exec_driver_sql(
                "UPDATE users SET role='personnel' WHERE role='collaborateur'"
            )
        except Exception as e:
            print(f"Note: Migration manuelle ignorée ou échouée : {e}")

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
app.include_router(core_router)
app.include_router(comm_router)

# ─── Routes utilitaires
@app.get("/")
def root():
    return {"status": "ok", "message": "TaskManager API en ligne !"}
