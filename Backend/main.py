from fastapi import FastAPI, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .routes.login import router as login_router
from .routes.register import router as register_router
from .routes.forgot_password import router as forgot_router
from .database import Base, engine, get_db
from . import models  # noqa: F401 — nécessaire pour que SQLAlchemy détecte les tables
from .Schemas import UserResponse

# ─── Création automatique des tables MySQL ─────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── Application FastAPI ───────────────────────────────────────────────────────
app = FastAPI(
    title="TaskManager API",
    description="API d'authentification — Login, Register, Reset Password",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS (indispensable pour React Native) ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["127.0.0.1:8000  "],       
    allow_credentials=True,
    allow_methods=["127.0.0.1:8000"],
    allow_headers=["127.0.0.1:8000"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(login_router, tags=["Login"])
app.include_router(register_router, tags=["Register"])
app.include_router(forgot_router, tags=["Password"])


# ─── Routes utilitaires ────────────────────────────────────────────────────────
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