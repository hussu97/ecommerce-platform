from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.strategy import Strategy
from app.schemas.product import StrategyResponse

router = APIRouter()


@router.get("", response_model=list[StrategyResponse])
async def list_strategies(session: AsyncSession = Depends(get_db)):
    """List discovery strategies (from DB, seeded from code registry on startup)."""
    result = await session.execute(select(Strategy).order_by(Strategy.id))
    strategies = result.scalars().all()
    return list(strategies)
