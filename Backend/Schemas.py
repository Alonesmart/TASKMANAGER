from pydantic import BaseModel
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from .import models
from .database import get_db
from .main import app

class UserCreate(BaseModel):
    nom: str
    phone: str
    email: str
    motdepasse: str

class UserResponse(BaseModel):
    id: int
    nom: str
    phone: str 
    email: str

    @app.get("/users/{user_id}", response_model=UserResponse)
    def get_user(user_id: int, db: Session = Depends(get_db)):
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user