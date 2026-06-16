import asyncio
import argparse
import sys
from pathlib import Path
from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from Backend.database import Base, engine
import Backend.models  # noqa: F401 - registers SQLAlchemy models

async def ensure_sqlite_columns(conn):
    result = await conn.execute(text("PRAGMA table_info(users)"))
    user_columns = {row[1] for row in result.fetchall()}

    if "actif" not in user_columns:
        print("Adding missing users.actif column...", flush=True)
        await conn.execute(text("ALTER TABLE users ADD COLUMN actif BOOLEAN NOT NULL DEFAULT 1"))

    if "tentatives" not in user_columns:
        print("Adding missing users.tentatives column...", flush=True)
        await conn.execute(text("ALTER TABLE users ADD COLUMN tentatives INTEGER NOT NULL DEFAULT 0"))

async def init_db(reset: bool = False):
    print("Opening database connection...", flush=True)
    async with engine.begin() as conn:
        if reset:
            print("Resetting database: dropping all tables...")
            await conn.run_sync(Base.metadata.drop_all)

        print("Creating missing tables...", flush=True)
        await conn.run_sync(Base.metadata.create_all)
        if engine.dialect.name == "sqlite":
            await ensure_sqlite_columns(conn)

    await engine.dispose()
    print("Database schema is ready.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize the TaskManager database schema.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all tables before creating them. This deletes existing data.",
    )
    args = parser.parse_args()
    asyncio.run(init_db(reset=args.reset))
