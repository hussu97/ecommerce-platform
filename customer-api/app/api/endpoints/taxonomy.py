from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.taxonomy import Taxonomy
from app.models.language import Language
from app.schemas.taxonomy import TaxonomyResponse
from app.core.language import resolve_language
from app.services.i18n import build_taxonomy_response

router = APIRouter()


@router.get("/", response_model=List[TaxonomyResponse])
async def list_taxonomies(
    db: AsyncSession = Depends(get_db),
    language: Language = Depends(resolve_language),
    section: Optional[str] = Query(None, description="Filter by section"),
):
    """List all taxonomies (categories). Returns translated content based on language."""
    query = select(Taxonomy).where(Taxonomy.is_active == True).order_by(Taxonomy.sort_order, Taxonomy.name)
    if section:
        query = query.where(Taxonomy.section == section)
    result = await db.execute(query)
    taxonomies = result.scalars().all()
    return [TaxonomyResponse(**await build_taxonomy_response(db, t, language.id)) for t in taxonomies]
