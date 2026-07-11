import asyncio
from Backend.database import SessionLocal, engine
from sqlalchemy import text

async def check_columns():
    try:
        async with SessionLocal() as db:
            result = await db.execute(text("DESCRIBE projets"))
            columns = result.fetchall()
            print("Columns in 'projets' table:")
            for col in columns:
                print(col)
                
            result = await db.execute(text("DESCRIBE equipes"))
            columns = result.fetchall()
            print("\nColumns in 'equipes' table:")
            for col in columns:
                print(col)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_columns())
