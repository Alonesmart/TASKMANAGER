import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from Backend.database import engine, SessionLocal
from Backend import models
from sqlalchemy import select
from datetime import date

async def test_create_project():
    async with SessionLocal() as db:
        # Get a user (or create one if none exist)
        res = await db.execute(select(models.User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No user found. Creating a test admin user...")
            user = models.Administrateur(
                nom="Admin Test",
                email="admin@test.com",
                motdepasse="hashed_password",
                role="admin"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        print(f"Testing with user: {user.id} ({user.role})")
        
        new_project = models.Projet(
            titre="Test Project",
            description="Test Description",
            dateDebut=date.today(),
            dateFin=date.today(),
            id_administrateur=user.id
        )
        db.add(new_project)
        try:
            await db.commit()
            print("Project created successfully!")
            await db.delete(new_project)
            await db.commit()
            print("Test project cleaned up.")
        except Exception as e:
            print(f"Error creating project: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(test_create_project())
    asyncio.run(engine.dispose())
