from fastapi import FastAPI
from .login import router as login_router
from .register import router as register_router
# from .forgot_password import router as forgot_router

app = FastAPI(title="Auth API")

app.include_router(login_router)
app.include_router(register_router)
# app.include_router(forgot_router)

@app.get("/")
def root():
    return {"message": "API opérationnelle"}