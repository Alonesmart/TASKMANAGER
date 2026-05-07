import re

from pydantic import BaseModel, EmailStr, field_validator
from fastapi import HTTPException, Depends  
from sqlalchemy.orm import Session
from .import models
from .database import get_db

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

class UserLogin(BaseModel):
    email:      EmailStr
    motdepasse: str          # correspond au champ envoyé par le frontend React Native

class Token(BaseModel):
    access_token: str
    token_type:   str
    message:      str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:            str
    new_motdepasse:   str
    confirm_motdepasse: str

class UserRegister(BaseModel):
    nom:               str
    email:             EmailStr
    phone:             str  = ""
    motdepasse:        str
    confirm_motdepasse: str

    @field_validator("nom")
    @classmethod
    def nom_non_vide(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Le nom ne peut pas être vide")
        return v.strip()

    @field_validator("motdepasse")
    @classmethod
    def motdepasse_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères")
        return v
    
    @field_validator("phone")
    @classmethod
    def validate_cameroon_phone(cls, v: str) -> str:
        # Supprime les espaces
        phone = v.replace(" ", "")

        # Regex Cameroun
        pattern = r"^(\+237)?6[0-9]{8}$"

        if not re.match(pattern, phone):
            raise ValueError(
                "Numéro camerounais invalide. Exemple: +237 xxxxxxxxx ou 6xxxxxxxx"
            )

        return phone