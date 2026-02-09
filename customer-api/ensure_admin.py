import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def ensure_admin_user():
    email = "admin@example.com"
    password = "admin123"
    
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {email} found. Resetting password and ensuring Admin role...")
            hashed_password = get_password_hash(password)
            user.password_hash = hashed_password
            user.is_superuser = True
            user.role = "admin"
            await session.commit()
            print("User updated to Admin with reset password.")
        else:
            print(f"User {email} not found. Creating new Admin user...")
            hashed_password = get_password_hash(password)
            new_user = User(
                email=email,
                password_hash=hashed_password,
                full_name="System Admin",
                is_active=True,
                is_superuser=True,
                role="admin"
            )
            session.add(new_user)
            await session.commit()
            print("Admin user created successfully.")

if __name__ == "__main__":
    asyncio.run(ensure_admin_user())
