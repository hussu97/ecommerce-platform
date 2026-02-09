from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_db
from app.models.brand import Brand
from app.models.brand_translation import BrandTranslation
from app.models.language import Language
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request

router = APIRouter()


@router.get("/", response_model=List[BrandResponse])
async def list_brands(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Brand).order_by(Brand.name))
    return result.scalars().all()


def _slugify(s: str) -> str:
    import re
    s = (s or "").lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "brand"


@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    brand_in: BrandCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    data = brand_in.model_dump(exclude={"translations"})
    slug = data.get("slug") or _slugify(data.get("name") or "brand")
    base_slug = slug
    n = 1
    while True:
        r = await db.execute(select(Brand.id).where(Brand.slug == slug))
        if r.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{n}"
        n += 1
    data["slug"] = slug
    new_brand = Brand(**data)
    db.add(new_brand)
    await db.flush()
    if brand_in.translations:
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in brand_in.translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(BrandTranslation(brand_id=new_brand.id, language_id=lang.id, name=t.name))
    await db.commit()
    await db.refresh(new_brand)
    await log_audit_from_request(db, request, "brand.create", "brand", str(new_brand.id), current_user.id, 201)
    await db.commit()
    return new_brand


@router.put("/{id}", response_model=BrandResponse)
async def update_brand(
    id: int,
    brand_update: BrandUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Brand).where(Brand.id == id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    update_data = brand_update.model_dump(exclude_unset=True)
    translations = update_data.pop("translations", None)
    if "name" in update_data and not update_data.get("slug"):
        update_data["slug"] = _slugify(update_data["name"] or brand.name)
    elif "slug" in update_data and update_data["slug"]:
        base_slug = update_data["slug"]
        slug = base_slug
        n = 1
        while True:
            r = await db.execute(select(Brand.id).where(Brand.slug == slug).where(Brand.id != brand.id))
            if r.scalar_one_or_none() is None:
                break
            slug = f"{base_slug}-{n}"
            n += 1
        update_data["slug"] = slug
    for field, value in update_data.items():
        setattr(brand, field, value)
    if translations is not None:
        await db.execute(delete(BrandTranslation).where(BrandTranslation.brand_id == brand.id))
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(BrandTranslation(brand_id=brand.id, language_id=lang.id, name=t.name))
    await db.commit()
    await db.refresh(brand)
    await log_audit_from_request(db, request, "brand.update", "brand", str(id), current_user.id, 200)
    await db.commit()
    return brand


@router.get("/{id}/translations")
async def get_brand_translations(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get translations for a brand. Returns { lang_code: { name } }."""
    result = await db.execute(
        select(BrandTranslation, Language.code)
        .join(Language, BrandTranslation.language_id == Language.id)
        .where(BrandTranslation.brand_id == id)
    )
    out = {}
    for row in result.all():
        trans, code = row
        out[code] = {"name": trans.name}
    return out


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Brand).where(Brand.id == id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    await db.delete(brand)
    await log_audit_from_request(db, request, "brand.delete", "brand", str(id), current_user.id, 204)
    await db.commit()
