"""Generate unique product parent and child codes."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from app.models.product_child import ProductChild
from app.core.config import settings


async def generate_parent_code(db: AsyncSession) -> str:
    """Generate a unique parent product code."""
    while True:
        code = f"{settings.PARENT_CODE_PREFIX}{uuid.uuid4().hex[:8].upper()}{settings.PARENT_CODE_SUFFIX}"
        r = await db.execute(select(Product.id).where(Product.code == code))
        if r.scalar_one_or_none() is None:
            return code


async def generate_child_code(db: AsyncSession, product_id: str) -> str:
    """Generate a unique child code for the given product. Uses product_id prefix + short unique."""
    existing = await db.execute(
        select(ProductChild.code).where(ProductChild.product_id == product_id)
    )
    count = len(existing.scalars().all())
    while True:
        code = f"{settings.CHILD_CODE_PREFIX}{product_id[:8].upper()}-{count + 1}{settings.CHILD_CODE_SUFFIX}"
        r = await db.execute(select(ProductChild.id).where(ProductChild.code == code))
        if r.scalar_one_or_none() is None:
            return code
        count += 1
