import asyncio
from Backend.database import engine, Base
from Backend import models

async def update_schema():
    async with engine.begin() as conn:
        print("Recreating database tables for Reunions...")
        # Since ParticipationReunion model was updated, we drop and recreate the table to avoid primary key/column conflicts in SQLite
        await conn.run_sync(Base.metadata.create_all)
        print("Done!")

if __name__ == "__main__":
    asyncio.run(update_schema())
