from fastapi import FastAPI, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .routes.login import router as login_router
from .routes.register import router as register_router
from .routes.forgot_password import router as forgot_router
from .database import Base, engine, get_db
from . import models  # noqa: F401 — nécessaire pour que SQLAlchemy détecte les tables
from .Schemas import UserResponse

#  Création automatique des tables MySQL
Base.metadata.create_all(bind=engine)

#  Assure la compatibilité de l'enum `role` avec les anciennes valeurs en base
try:
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'chef_projet', 'personnel', 'collaborateur') "
            "NOT NULL DEFAULT 'personnel'"
        )
        conn.exec_driver_sql(
            "UPDATE users SET role='personnel' WHERE role='collaborateur'"
        )
except Exception:
    pass

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

# Routers
app.include_router(login_router, tags=["Login"])
app.include_router(register_router, tags=["Register"])
app.include_router(forgot_router, tags=["Password"])


# ─── Routes utilitaires
@app.get("/")
def root():
    return {"status": "ok", "message": "TaskManager API en ligne !"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=200)


@app.get("/users/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user