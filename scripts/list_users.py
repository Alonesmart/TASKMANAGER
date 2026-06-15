import asyncio
import sys
import os

# Ajouter le répertoire parent au chemin pour importer Backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from Backend.database import SessionLocal
from Backend import models
from sqlalchemy import select

async def list_users():
    async with SessionLocal() as db:
        res = await db.execute(select(models.User))
        users = res.scalars().all()
        if not users:
            print("Aucun utilisateur trouvé.")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Nom: {u.nom} | Rôle: {u.role}")

if __name__ == "__main__":
    asyncio.run(list_users())
