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
        # Alter conversations table
        try:
            await conn.execute(text("ALTER TABLE conversations ADD COLUMN id_admin INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            print("Added column 'id_admin' to table 'conversations'")
        except Exception as e:
            print("Column 'id_admin' might already exist or error:", e)

        try:
            await conn.execute(text("ALTER TABLE conversations ADD COLUMN avatar VARCHAR(255)"))
            print("Added column 'avatar' to table 'conversations'")
        except Exception as e:
            print("Column 'avatar' might already exist or error:", e)
            
        print("Done!")

if __name__ == "__main__":
    asyncio.run(update_schema())
