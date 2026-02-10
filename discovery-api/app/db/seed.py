"""Seed discovery DB with strategy rows from the code registry."""
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.strategy import Strategy
from app.strategies import STRATEGY_REGISTRY

logger = logging.getLogger(__name__)


async def seed_strategies(session: AsyncSession) -> None:
    """
    Upsert strategy rows from STRATEGY_REGISTRY into the strategies table.
    New strategies get enabled=True; existing rows keep their enabled flag and get name/description updated.
    """
    for strategy_id, strategy_instance in STRATEGY_REGISTRY.items():
        name = getattr(strategy_instance, "name", "") or strategy_id
        description = getattr(strategy_instance, "description", "") or ""
        result = await session.execute(select(Strategy).where(Strategy.id == strategy_id))
        row = result.scalars().first()
        if row:
            row.name = name
            row.description = description or None
            logger.debug("Updated strategy %s", strategy_id)
        else:
            session.add(
                Strategy(
                    id=strategy_id,
                    name=name,
                    description=description or None,
                    enabled=True,
                )
            )
            logger.debug("Inserted strategy %s", strategy_id)
    await session.commit()
