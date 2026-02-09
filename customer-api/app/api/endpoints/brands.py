"""Public brands endpoint for customer app."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.brand import Brand
from app.models.language import Language
from app.schemas.brand import BrandResponse
from app.core.language import resolve_language
from app.services.i18n import build_brand_response

router = APIRouter()


@router.get("/", response_model=List[BrandResponse])
async def list_brands(
    db: AsyncSession = Depends(get_db),
    language: Language = Depends(resolve_language),
):
    """List all brands. Returns translated content based on language."""
    result = await db.execute(select(Brand).order_by(Brand.name))
    brands = result.scalars().all()
    return [BrandResponse(**await build_brand_response(db, b, language.id)) for b in brands]
