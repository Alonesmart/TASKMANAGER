from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.login import router as login_router
from .routes.register import router as register_router
from .routes.forgot_password import router as forgot_router
from .routes.users import router as users_router
from .routes.core import router as core_router
from .routes.communication import router as comm_router

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
app.include_router(core_router)
app.include_router(comm_router)

# ─── Routes utilitaires
@app.get("/")
def root():
    return {"status": "ok", "message": "TaskManager API en ligne !"}
