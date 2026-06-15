import asyncio
from Backend.database import SessionLocal, engine, pwd_context
from sqlalchemy import select
from Backend import models

async def simulate_login(email, password):
    try:
        async with SessionLocal() as db:
            result = await db.execute(select(models.User).filter(models.User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"User {email} not found.")
                return
            
            print(f"User found: {user.email}")
            print(f"Hashed password in DB: {user.motdepasse}")
            
            try:
                is_valid = pwd_context.verify(password, user.motdepasse)
                print(f"Password valid: {is_valid}")
            except Exception as e:
                print(f"Error verifying password: {e}")
                
    except Exception as e:
        print(f"General error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "raoul@gmail.com"
    password = sys.argv[2] if len(sys.argv) > 2 else "password" # I don't know the password
    asyncio.run(simulate_login(email, password))
