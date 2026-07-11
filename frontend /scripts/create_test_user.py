import asyncio
from Backend.database import SessionLocal, engine, pwd_context
from Backend import models

async def create_test_user():
    async with SessionLocal() as db:
        hashed_pw = pwd_context.hash("testpassword123")
        new_user = models.Personnel(
            nom="Test User",
            email="test@example.com",
            phone="0123456789",
            motdepasse=hashed_pw,
            role="personnel",
        )
        db.add(new_user)
        await db.commit()
        print("Test user created: test@example.com / testpassword123")

if __name__ == "__main__":
    asyncio.run(create_test_user())
