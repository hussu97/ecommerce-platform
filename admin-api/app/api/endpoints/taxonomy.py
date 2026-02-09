from typing import Dict, List, Optional
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.models.taxonomy import Taxonomy
from app.models.taxonomy_translation import TaxonomyTranslation
from app.models.language import Language
from app.models.user import User
from app.schemas.taxonomy import (
    TaxonomyCreate,
    TaxonomyResponse,
    TaxonomyUpdate,
    TaxonomyTranslationInput,
)
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request

router = APIRouter()


def _slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "taxonomy"


@router.get("/", response_model=List[TaxonomyResponse])
async def list_taxonomies(
    db: AsyncSession = Depends(get_db),
    section: Optional[str] = Query(None),
    current_user: User = Depends(get_current_admin_user),
):
    query = select(Taxonomy).order_by(Taxonomy.sort_order, Taxonomy.name)
    if section:
        query = query.where(Taxonomy.section == section)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TaxonomyResponse, status_code=status.HTTP_201_CREATED)
async def create_taxonomy(
    taxonomy_in: TaxonomyCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    data = taxonomy_in.model_dump(exclude={"translations"})
    slug = data.get("slug") or _slugify(data.get("name") or "taxonomy")
    base_slug = slug
    n = 1
    while True:
        r = await db.execute(select(Taxonomy.id).where(Taxonomy.slug == slug))
        if r.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{n}"
        n += 1
    data["slug"] = slug
    new_taxonomy = Taxonomy(**data)
    db.add(new_taxonomy)
    await db.flush()
    if taxonomy_in.translations:
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in taxonomy_in.translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(TaxonomyTranslation(taxonomy_id=new_taxonomy.id, language_id=lang.id, name=t.name))
    await db.commit()
    await db.refresh(new_taxonomy)
    await log_audit_from_request(db, request, "taxonomy.create", "taxonomy", str(new_taxonomy.id), current_user.id, 201)
    await db.commit()
    return new_taxonomy


@router.put("/{id}", response_model=TaxonomyResponse)
async def update_taxonomy(
    id: int,
    taxonomy_update: TaxonomyUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Taxonomy).where(Taxonomy.id == id))
    taxonomy = result.scalar_one_or_none()
    if not taxonomy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    update_data = taxonomy_update.model_dump(exclude_unset=True)
    translations = update_data.pop("translations", None)
    if "name" in update_data and not update_data.get("slug"):
        update_data["slug"] = _slugify(update_data["name"] or taxonomy.name)
    elif "slug" in update_data and update_data.get("slug"):
        base_slug = update_data["slug"]
        slug = base_slug
        n = 1
        while True:
            r = await db.execute(select(Taxonomy.id).where(Taxonomy.slug == slug).where(Taxonomy.id != taxonomy.id))
            if r.scalar_one_or_none() is None:
                break
            slug = f"{base_slug}-{n}"
            n += 1
        update_data["slug"] = slug
    for field, value in update_data.items():
        setattr(taxonomy, field, value)
    if translations is not None:
        await db.execute(delete(TaxonomyTranslation).where(TaxonomyTranslation.taxonomy_id == taxonomy.id))
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(TaxonomyTranslation(taxonomy_id=taxonomy.id, language_id=lang.id, name=t.name))
    await db.commit()
    await db.refresh(taxonomy)
    await log_audit_from_request(db, request, "taxonomy.update", "taxonomy", str(id), current_user.id, 200)
    await db.commit()
    return taxonomy


@router.delete("/{id}", response_model=TaxonomyResponse)
async def deactivate_taxonomy(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Deactivate taxonomy (soft delete)."""
    result = await db.execute(select(Taxonomy).where(Taxonomy.id == id))
    taxonomy = result.scalar_one_or_none()
    if not taxonomy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    taxonomy.is_active = False
    await db.commit()
    await db.refresh(taxonomy)
    await log_audit_from_request(db, request, "taxonomy.deactivate", "taxonomy", str(id), current_user.id, 200)
    await db.commit()
    return taxonomy


@router.patch("/{id}/activate", response_model=TaxonomyResponse)
async def activate_taxonomy(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Reactivate taxonomy."""
    result = await db.execute(select(Taxonomy).where(Taxonomy.id == id))
    taxonomy = result.scalar_one_or_none()
    if not taxonomy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    taxonomy.is_active = True
    await db.commit()
    await db.refresh(taxonomy)
    await log_audit_from_request(db, request, "taxonomy.activate", "taxonomy", str(id), current_user.id, 200)
    await db.commit()
    return taxonomy


@router.get("/{id}/translations")
async def get_taxonomy_translations(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get translations for a taxonomy. Returns { lang_code: { name } }."""
    result = await db.execute(
        select(TaxonomyTranslation, Language.code)
        .join(Language, TaxonomyTranslation.language_id == Language.id)
        .where(TaxonomyTranslation.taxonomy_id == id)
    )
    out = {}
    for row in result.all():
        trans, code = row
        out[code] = {"name": trans.name}
    return out


class TaxonomyTranslationsBody(BaseModel):
    translations: Dict[str, TaxonomyTranslationInput]


@router.put("/{id}/translations")
async def update_taxonomy_translations(
    id: int,
    body: TaxonomyTranslationsBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update taxonomy translations. Body: { "ar": { "name": "..." } }."""
    r = await db.execute(select(Taxonomy).where(Taxonomy.id == id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    await db.execute(delete(TaxonomyTranslation).where(TaxonomyTranslation.taxonomy_id == id))
    result = await db.execute(select(Language))
    langs = {l.code: l for l in result.scalars().all()}
    for code, t in body.translations.items():
        lang = langs.get(code.lower())
        if lang:
            db.add(TaxonomyTranslation(taxonomy_id=id, language_id=lang.id, name=t.name))
    await log_audit_from_request(db, request, "taxonomy.translations_update", "taxonomy", str(id), current_user.id, 200)
    await db.commit()
    return {"ok": True}
