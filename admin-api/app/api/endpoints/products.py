from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.product import Product
from app.models.product_translation import ProductTranslation
from app.models.product_attribute_value import ProductAttributeValue
from app.models.language import Language
from app.models.taxonomy_attribute import TaxonomyAttributeOption
from app.models.taxonomy_attribute import TaxonomyAttribute
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request

router = APIRouter()


def _slugify(s: str) -> str:
    import re
    s = (s or "").lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "untitled"


def _product_options():
    return (
        selectinload(Product.category_rel),
        selectinload(Product.brand_rel),
        selectinload(Product.attribute_values).selectinload(ProductAttributeValue.option_rel).selectinload(TaxonomyAttributeOption.attribute),
    )


@router.get("/", response_model=List[ProductResponse])
async def list_all_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).order_by(Product.id).options(*_product_options())
    )
    return result.scalars().all()


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    data = product_in.model_dump(exclude={"attribute_option_ids", "translations"})
    base_slug = _slugify(data.get("name") or "product")
    slug = base_slug
    n = 1
    while True:
        r = await db.execute(select(Product.id).where(Product.slug == slug))
        if r.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{n}"
        n += 1
    data["slug"] = slug
    new_product = Product(**data)
    db.add(new_product)
    await db.flush()
    for opt_id in product_in.attribute_option_ids or []:
        db.add(ProductAttributeValue(product_id=new_product.id, option_id=opt_id))
    if product_in.translations:
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in product_in.translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(ProductTranslation(product_id=new_product.id, language_id=lang.id, name=t.name, description=t.description))
    await db.commit()
    await db.refresh(new_product)
    await log_audit_from_request(db, request, "product.create", "product", str(new_product.id), current_user.id, 201)
    await db.commit()
    result = await db.execute(
        select(Product).where(Product.id == new_product.id).options(*_product_options())
    )
    return result.scalar_one_or_none()


@router.put("/{id}", response_model=ProductResponse)
async def update_product(
    id: str,
    product_update: ProductUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).where(Product.id == id).options(*_product_options())
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    update_data = product_update.model_dump(exclude_unset=True)
    attr_ids = update_data.pop("attribute_option_ids", None)
    if "name" in update_data:
        base_slug = _slugify(update_data.get("name") or "product")
        slug = base_slug
        n = 1
        while True:
            r = await db.execute(select(Product.id).where(Product.slug == slug).where(Product.id != product.id))
            if r.scalar_one_or_none() is None:
                break
            slug = f"{base_slug}-{n}"
            n += 1
        update_data["slug"] = slug
    for field, value in update_data.items():
        setattr(product, field, value)
    if attr_ids is not None:
        from sqlalchemy import delete
        await db.execute(delete(ProductAttributeValue).where(ProductAttributeValue.product_id == product.id))
        for opt_id in attr_ids:
            db.add(ProductAttributeValue(product_id=product.id, option_id=opt_id))
    if product_update.translations is not None:
        from sqlalchemy import delete
        await db.execute(delete(ProductTranslation).where(ProductTranslation.product_id == product.id))
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in product_update.translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(ProductTranslation(product_id=product.id, language_id=lang.id, name=t.name, description=t.description))
    await db.commit()
    await db.refresh(product)
    await log_audit_from_request(db, request, "product.update", "product", id, current_user.id, 200)
    await db.commit()
    result = await db.execute(
        select(Product).where(Product.id == product.id).options(*_product_options())
    )
    return result.scalar_one_or_none()


@router.get("/{id}/translations")
async def get_product_translations(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get translations for a product. Returns { lang_code: { name, description } }."""
    result = await db.execute(
        select(ProductTranslation, Language.code)
        .join(Language, ProductTranslation.language_id == Language.id)
        .where(ProductTranslation.product_id == id)
    )
    out = {}
    for row in result.all():
        trans, code = row
        out[code] = {"name": trans.name, "description": trans.description}
    return out


@router.delete("/{id}", response_model=ProductResponse)
async def delete_product(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).where(Product.id == id).options(*_product_options())
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product.is_active = False
    await db.commit()
    await db.refresh(product)
    await log_audit_from_request(db, request, "product.delete", "product", id, current_user.id, 200)
    await db.commit()
    result = await db.execute(
        select(Product).where(Product.id == product.id).options(*_product_options())
    )
    return result.scalar_one_or_none()
