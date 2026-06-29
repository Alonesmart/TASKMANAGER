from fastapi import FastAPI
from .routes import communication, core
from .modules.auth import routes as auth_routes
from .modules.project import routes as project_routes
from .modules.tasks import routes as tasks_routes
from .modules.teams import routes as teams_routes
from .modules.users import routes as users_routes

app = FastAPI()

# Enregistrement des routes
app.include_router(auth_routes.router)
app.include_router(users_routes.router)
app.include_router(communication.router)
app.include_router(core.router)
app.include_router(project_routes.router)
app.include_router(tasks_routes.router)
app.include_router(teams_routes.router)
