from contextlib import asynccontextmanager
from fastapi import FastAPI
from .modules.auth import routes as auth_routes
from .modules.project import routes as project_routes
from .modules.tasks import routes as tasks_routes
from .modules.teams import routes as teams_routes
from .modules.users import routes as users_routes
from .modules.reports import routes as reports_routes
from .modules.messages import routes as messages_routes
from .modules.dashboard import routes as dashboard_routes
from .modules.documents import routes as documents_routes
from .modules.invitations import routes as invitations_routes
from .modules.reunions import routes as reunions_routes
from .modules.ia import routes as ia_routes
from .scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()

app = FastAPI(lifespan=lifespan)

# Enregistrement des routes
app.include_router(auth_routes.router)
app.include_router(users_routes.router)
app.include_router(messages_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(project_routes.router)
app.include_router(tasks_routes.router)
app.include_router(teams_routes.router)
app.include_router(reports_routes.router)
app.include_router(documents_routes.router)
app.include_router(invitations_routes.router)
app.include_router(reunions_routes.router)
app.include_router(ia_routes.router)

