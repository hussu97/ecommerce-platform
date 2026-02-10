from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.discovered_product import DiscoveredProduct
from app.schemas.product import DiscoveredProductResponse

router = APIRouter()


@router.get("", response_model=list[DiscoveredProductResponse])
async def list_products(
    strategy_id: Optional[str] = None,
    delivers_to_uae: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List discovered products with optional filters."""
    q = select(DiscoveredProduct).order_by(DiscoveredProduct.discovered_at.desc())
    if strategy_id is not None:
        q = q.where(DiscoveredProduct.strategy_id == strategy_id)
    if delivers_to_uae is not None:
        q = q.where(DiscoveredProduct.delivers_to_uae == delivers_to_uae)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [DiscoveredProductResponse.model_validate(r) for r in rows]


@router.get("/{product_id}", response_model=DiscoveredProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single discovered product by id."""
    result = await db.execute(select(DiscoveredProduct).where(DiscoveredProduct.id == product_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return DiscoveredProductResponse.model_validate(row)
