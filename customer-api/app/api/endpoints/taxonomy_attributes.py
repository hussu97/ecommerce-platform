"""Public taxonomy attributes endpoint for customer app (filtering)."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.taxonomy_attribute import TaxonomyAttribute
from app.models.language import Language
from app.schemas.taxonomy_attribute import TaxonomyAttributeResponse
from app.core.language import resolve_language
from app.services.i18n import build_attribute_response

router = APIRouter()


@router.get("/by-taxonomy/{slug}", response_model=List[TaxonomyAttributeResponse])
async def list_attributes_by_taxonomy(
    slug: str,
    db: AsyncSession = Depends(get_db),
    language: Language = Depends(resolve_language),
):
    """List taxonomy attributes by taxonomy slug. Returns translated content based on language."""
    from app.models.taxonomy import Taxonomy
    res = await db.execute(select(Taxonomy.id).where(Taxonomy.slug == slug.lower(), Taxonomy.is_active == True))
    row = res.first()
    if not row:
        return []
    taxonomy_id = row[0]

    result = await db.execute(
        select(TaxonomyAttribute)
        .where(TaxonomyAttribute.taxonomy_id == taxonomy_id, TaxonomyAttribute.is_active == True)
        .order_by(TaxonomyAttribute.sort_order, TaxonomyAttribute.name)
        .options(selectinload(TaxonomyAttribute.options))
    )
    attrs = result.scalars().all()
    return [TaxonomyAttributeResponse(**await build_attribute_response(db, a, language.id)) for a in attrs]
