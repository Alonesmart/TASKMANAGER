import asyncio
from Backend.database import engine, Base
from Backend import models  # Force registration of all SQLAlchemy models
from sqlalchemy import text

async def update_schema():
    async with engine.begin() as conn:
        print("Dropping old table documents...")
        await conn.execute(text("DROP TABLE IF EXISTS documents;"))
        print("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Done!")

if __name__ == "__main__":
    asyncio.run(update_schema())
