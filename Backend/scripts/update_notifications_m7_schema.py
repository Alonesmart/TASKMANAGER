import asyncio
import os
import sys

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import engine, Base
from sqlalchemy import text

async def update_schema():
    async with engine.begin() as conn:
        print("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)
        
        print("Altering existing tables to add columns if they don't exist...")
        # Alter notifications table
        try:
            await conn.execute(text("ALTER TABLE notifications ADD COLUMN id_conversation INTEGER REFERENCES conversations(id_conversation) ON DELETE CASCADE"))
            print("Added column 'id_conversation' to table 'notifications'")
        except Exception as e:
            print("Column 'id_conversation' might already exist or error:", e)
            
        print("Done!")

if __name__ == "__main__":
    asyncio.run(update_schema())
