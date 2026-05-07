from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from .routes.login import router as login_router
from .routes.register import router as register_router
from .routes.forgot_password import router as forgot_router
from .database import Base, engine
from . import models  # noqa: F401 — nécessaire pour que SQLAlchemy détecte les tables

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
    allow_origins=["*"],       # ⚠️ en production → précisez votre domaine
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(login_router,   prefix="/auth", tags=["Auth - Login"])
app.include_router(register_router, prefix="/auth", tags=["Auth - Register"])
app.include_router(forgot_router,  prefix="/auth", tags=["Auth - Password"])

# ─── Routes utilitaires ────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "TaskManager API en ligne 🚀"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)