import asyncio
from sqlalchemy import text
from Backend.database import engine

async def create_indexes():
    async with engine.begin() as conn:
        print("Creating indexes on SQLite database...")
        queries = [
            "CREATE INDEX IF NOT EXISTS idx_taches_id_projet ON taches(id_projet);",
            "CREATE INDEX IF NOT EXISTS idx_rapports_id_projet ON rapports(id_projet);",
            "CREATE INDEX IF NOT EXISTS idx_reunions_id_projet ON reunions(id_projet);"
        ]
        for q in queries:
            try:
                await conn.execute(text(q))
                print(f" Executed: {q}")
            except Exception as e:
                print(f" Error executing {q}: {e}")
        print("Done!")

if __name__ == "__main__":
    asyncio.run(create_indexes())
