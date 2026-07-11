import asyncio
from Backend.database import SessionLocal, pwd_context
from Backend import models
from sqlalchemy import select

async def change_pwd():
    async with SessionLocal() as db:
        res = await db.execute(select(models.User).filter(models.User.email == 'raoul@gmail.com'))
        user = res.scalar_one_or_none()
        if user:
            user.motdepasse = pwd_context.hash('password123')
            await db.commit()
            print('Password changed for raoul')
        else:
            print('User raoul not found')

if __name__ == "__main__":
    asyncio.run(change_pwd())
