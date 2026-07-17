
import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from Backend.database import engine
from sqlalchemy import text

async def apply_migration():
    async with engine.begin() as conn:
        print("Starting migration to make id_ia nullable in 'messages' table...")
        
        # 1. Create a new table with the correct schema
        await conn.execute(text("""
            CREATE TABLE messages_new (
                id_message INTEGER PRIMARY KEY AUTOINCREMENT,
                contenu TEXT NOT NULL,
                type_conversation VARCHAR(50) NOT NULL,
                date_envoi DATETIME NOT NULL,
                lu BOOLEAN NOT NULL,
                statut VARCHAR(50) DEFAULT 'envoye',
                id_expediteur INTEGER NOT NULL,
                id_ia INTEGER,
                id_conversation INTEGER,
                FOREIGN KEY(id_expediteur) REFERENCES users(id),
                FOREIGN KEY(id_ia) REFERENCES assistants_ia(id_ia),
                FOREIGN KEY(id_conversation) REFERENCES conversations(id_conversation) ON DELETE CASCADE
            )
        """))
        
        # 2. Copy data
        await conn.execute(text("""
            INSERT INTO messages_new 
            SELECT id_message, contenu, type_conversation, date_envoi, lu, statut, id_expediteur, id_ia, id_conversation 
            FROM messages
        """))
        
        # 3. Drop old table
        await conn.execute(text("DROP TABLE messages"))
        
        # 4. Rename new table
        await conn.execute(text("ALTER TABLE messages_new RENAME TO messages"))
        
        print("Migration successful: 'id_ia' is now nullable.")

if __name__ == "__main__":
    asyncio.run(apply_migration())
