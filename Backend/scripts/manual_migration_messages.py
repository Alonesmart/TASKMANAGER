
import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import engine
from sqlalchemy import text

async def apply_migration():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE messages ADD COLUMN id_conversation INTEGER REFERENCES conversations(id_conversation) ON DELETE CASCADE"))
            print("Added column 'id_conversation' to table 'messages'")
        except Exception as e:
            print("Error adding column 'id_conversation':", e)

if __name__ == "__main__":
    asyncio.run(apply_migration())
