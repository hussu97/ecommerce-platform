from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserLogin, UserResponse, Token
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_admin_user

router = APIRouter()


@router.post("/login", response_model=Token)
async def admin_login(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Admin login - only accepts users with is_superuser=True."""
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_admin_me(
    current_user: User = Depends(get_current_admin_user),
):
    """Get current admin user."""
    return current_user
