import asyncio
from Backend.database import engine, Base
import Backend.models

async def reset_db():
    print("Resetting database...")
    async with engine.begin() as conn:
        # Warning: This will delete all data!
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset successfully!")

if __name__ == "__main__":
    asyncio.run(reset_db())
