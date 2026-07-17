import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from Backend.database import SessionLocal, pwd_context
from Backend.models import Administrateur, Personnel, User
from sqlalchemy import select

async def seed_users():
    async with SessionLocal() as db:
        # Check if admin already exists
        result_admin = await db.execute(select(User).filter(User.email == "admin@taskmanager.com"))
        admin = result_admin.scalar_one_or_none()
        if not admin:
            print("Creating administrator account...")
            admin = Administrateur(
                nom="Administrateur",
                email="admin@taskmanager.com",
                phone="0600000001",
                motdepasse=pwd_context.hash("Password123!"),
                role="admin",
                actif=True
            )
            db.add(admin)
        else:
            print("Administrator account already exists.")

        # Check if collaborator already exists
        result_collab = await db.execute(select(User).filter(User.email == "collab@taskmanager.com"))
        collab = result_collab.scalar_one_or_none()
        if not collab:
            print("Creating collaborator account...")
            collab = Personnel(
                nom="Collaborateur",
                email="collab@taskmanager.com",
                phone="0600000002",
                motdepasse=pwd_context.hash("Password123!"),
                role="personnel",
                actif=True
            )
            db.add(collab)
        else:
            print("Collaborator account already exists.")

        await db.commit()
        print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_users())
