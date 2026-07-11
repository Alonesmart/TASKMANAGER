import asyncio
from sqlalchemy import text
from Backend.database import engine

async def run_alter():
    async with engine.begin() as conn:
        try:
            print("Adding column 'statut' to table 'participation_reunion'...")
            await conn.execute(text("ALTER TABLE participation_reunion ADD COLUMN statut VARCHAR(50) DEFAULT 'invite'"))
            print("Done!")
        except Exception as e:
            print("Column might already exist:", e)

if __name__ == "__main__":
    asyncio.run(run_alter())
