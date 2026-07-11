import asyncio
from Backend.database import SessionLocal
from Backend import models
from sqlalchemy import select, func

async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(models.Tache))
        tasks = res.scalars().all()
        for t in tasks:
            print(f"Task ID: {t.id_tache}, Statut: {repr(t.statut)}")

if __name__ == "__main__":
    asyncio.run(check())
