import asyncio
import os
import sys

# Ensure the root of the project is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import engine, Base
from Backend import models
from sqlalchemy import text

async def update_schema():
    async with engine.begin() as conn:
        print("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)
        
        print("Altering existing tables to add columns if they don't exist...")
        # Alter users table
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN en_ligne BOOLEAN DEFAULT 0"))
            print("Added column 'en_ligne' to table 'users'")
        except Exception as e:
            print("Column 'en_ligne' might already exist or error:", e)

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN derniere_connexion DATETIME"))
            print("Added column 'derniere_connexion' to table 'users'")
        except Exception as e:
            print("Column 'derniere_connexion' might already exist or error:", e)

        # Alter messages table
        try:
            await conn.execute(text("ALTER TABLE messages ADD COLUMN statut VARCHAR(50) DEFAULT 'envoye'"))
            print("Added column 'statut' to table 'messages'")
        except Exception as e:
            print("Column 'statut' might already exist or error:", e)
            
        print("Done!")

if __name__ == "__main__":
    asyncio.run(update_schema())
