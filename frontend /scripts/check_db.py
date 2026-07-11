import asyncio
from Backend.database import SessionLocal, engine
from sqlalchemy import text

async def check_db():
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
            print("Database connection successful!")
            
            # Check users table
            result = await db.execute(text("SHOW TABLES LIKE 'users'"))
            tables = result.fetchall()
            if tables:
                print("Table 'users' exists.")
                
                # List users (obfuscating passwords)
                result = await db.execute(text("SELECT id, email, nom, role, actif FROM users"))
                users = result.fetchall()
                print(f"Found {len(users)} users:")
                for user in users:
                    print(f"ID: {user.id}, Email: {user.email}, Nom: {user.nom}, Role: {user.role}, Actif: {user.actif}")
            else:
                print("Table 'users' DOES NOT exist.")
                
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
