"""i18n service: resolve language and fetch translations with fallback to English."""
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.language import Language
from app.models.product_translation import ProductTranslation
from app.models.taxonomy_translation import TaxonomyTranslation
from app.models.brand_translation import BrandTranslation
from app.models.taxonomy_attribute_translation import (
    TaxonomyAttributeTranslation,
    TaxonomyAttributeOptionTranslation,
)
from app.models.ui_string import UIString


async def get_language_by_code(db: AsyncSession, code: str) -> Optional[Language]:
    result = await db.execute(select(Language).where(Language.code == code.lower()))
    return result.scalar_one_or_none()


async def get_default_language(db: AsyncSession) -> Optional[Language]:
    result = await db.execute(select(Language).where(Language.is_default == True))
    lang = result.scalar_one_or_none()
    if lang:
        return lang
    result = await db.execute(select(Language).order_by(Language.sort_order).limit(1))
    return result.scalar_one_or_none()


async def get_product_translated(
    db: AsyncSession, product_id: str, language_id: int
) -> Optional[dict]:
    """Returns {name, description} for product in language, or None if use base."""
    result = await db.execute(
        select(ProductTranslation.name, ProductTranslation.description)
        .where(ProductTranslation.product_id == product_id)
        .where(ProductTranslation.language_id == language_id)
    )
    row = result.first()
    return {"name": row[0], "description": row[1]} if row else None


async def get_taxonomy_translated(
    db: AsyncSession, taxonomy_id: int, language_id: int
) -> Optional[str]:
    result = await db.execute(
        select(TaxonomyTranslation.name)
        .where(TaxonomyTranslation.taxonomy_id == taxonomy_id)
        .where(TaxonomyTranslation.language_id == language_id)
    )
    row = result.first()
    return row[0] if row else None


async def get_brand_translated(
    db: AsyncSession, brand_id: int, language_id: int
) -> Optional[str]:
    result = await db.execute(
        select(BrandTranslation.name)
        .where(BrandTranslation.brand_id == brand_id)
        .where(BrandTranslation.language_id == language_id)
    )
    row = result.first()
    return row[0] if row else None


async def get_attribute_translated(
    db: AsyncSession, attribute_id: int, language_id: int
) -> Optional[str]:
    result = await db.execute(
        select(TaxonomyAttributeTranslation.name)
        .where(TaxonomyAttributeTranslation.attribute_id == attribute_id)
        .where(TaxonomyAttributeTranslation.language_id == language_id)
    )
    row = result.first()
    return row[0] if row else None


async def get_option_translated(
    db: AsyncSession, option_id: int, language_id: int
) -> Optional[str]:
    result = await db.execute(
        select(TaxonomyAttributeOptionTranslation.value)
        .where(TaxonomyAttributeOptionTranslation.option_id == option_id)
        .where(TaxonomyAttributeOptionTranslation.language_id == language_id)
    )
    row = result.first()
    return row[0] if row else None


async def build_taxonomy_response(db: AsyncSession, taxonomy: Any, language_id: int) -> dict[str, Any]:
    """Build TaxonomyResponse dict with translated name."""
    t = await get_taxonomy_translated(db, taxonomy.id, language_id)
    name = t if t else taxonomy.name
    return {
        "id": taxonomy.id,
        "slug": getattr(taxonomy, "slug", None),
        "name": name,
        "section": taxonomy.section,
        "sort_order": taxonomy.sort_order or 0,
    }


async def build_brand_response(db: AsyncSession, brand: Any, language_id: int) -> dict[str, Any]:
    """Build BrandResponse dict with translated name."""
    bt = await get_brand_translated(db, brand.id, language_id)
    name = bt if bt else brand.name
    return {
        "id": brand.id,
        "name": name,
        "slug": brand.slug,
        "logo_url": brand.logo_url,
    }


async def build_attribute_response(db: AsyncSession, attr: Any, language_id: int) -> dict[str, Any]:
    """Build TaxonomyAttributeResponse with translated name and options. Excludes inactive options."""
    at = await get_attribute_translated(db, attr.id, language_id)
    name = at if at else attr.name
    options = []
    for opt in attr.options or []:
        if getattr(opt, "is_active", True) is False:
            continue
        ot = await get_option_translated(db, opt.id, language_id)
        options.append({
            "id": opt.id,
            "value": ot if ot else opt.value,
            "sort_order": opt.sort_order or 0,
        })
    return {
        "id": attr.id,
        "taxonomy_id": attr.taxonomy_id,
        "name": name,
        "type_": attr.type_ or "select",
        "sort_order": attr.sort_order or 0,
        "options": options,
    }


async def get_ui_strings(db: AsyncSession, language_id: int) -> dict[str, str]:
    """Returns {key: value} for all UI strings in language. Falls back to English if missing."""
    result = await db.execute(
        select(UIString.key, UIString.value).where(UIString.language_id == language_id)
    )
    return {row[0]: row[1] for row in result.all()}


async def _get_product_ratings(db: AsyncSession, product_id: str) -> tuple[Optional[float], int]:
    """Return (avg_rating, rating_count) for product. Ratings come from ProductReview."""
    from sqlalchemy import func
    from app.models.product_review import ProductReview
    r = await db.execute(
        select(func.avg(ProductReview.rating), func.count(ProductReview.id))
        .where(ProductReview.product_id == product_id)
    )
    row = r.first()
    avg = float(row[0]) if row and row[0] is not None else None
    cnt = int(row[1] or 0) if row else 0
    return (round(avg, 1) if avg is not None else None, cnt)


async def build_product_response(
    db: AsyncSession, product: Any, language_id: int
) -> dict[str, Any]:
    """
    Build ProductResponse dict with translated name, description, category_path, brand_name, attributes.
    Falls back to base (English) when translation missing. Includes avg_rating and rating_count.
    """
    trans = await get_product_translated(db, product.id, language_id)
    name = trans["name"] if trans else product.name
    description = trans["description"] if trans and trans.get("description") else product.description

    category_path = None
    if product.category_rel:
        ct = await get_taxonomy_translated(db, product.category_rel.id, language_id)
        category_path = ct if ct else product.category_rel.name

    brand_name = None
    if product.brand_rel:
        bt = await get_brand_translated(db, product.brand_rel.id, language_id)
        brand_name = bt if bt else product.brand_rel.name

    attributes = []
    for av in product.attribute_values or []:
        if not av.option_rel or not av.option_rel.attribute:
            continue
        attr = av.option_rel.attribute
        opt = av.option_rel
        at = await get_attribute_translated(db, attr.id, language_id)
        ot = await get_option_translated(db, opt.id, language_id)
        attributes.append({
            "attribute_name": at if at else attr.name,
            "value": ot if ot else opt.value,
        })

    # Stock and children: aggregate from product.children; single_sized when one child with size_value "single_size"
    children = getattr(product, "children", None) or []
    stock_net = sum(c.stock_net for c in children) if children else 0
    single_sized = (
        len(children) == 1
        and getattr(children[0], "size_value", None) == "single_size"
    )
    child_list = [
        {
            "id": c.id,
            "code": c.code,
            "barcode": c.barcode,
            "size_value": c.size_value if not single_sized else c.size_value,  # can mask for display
            "stock_quantity": c.stock_quantity,
            "stock_reserved": c.stock_reserved,
            "stock_net": c.stock_net,
        }
        for c in sorted(children, key=lambda x: (x.size_value or ""))
    ]
    avg_rating, rating_count = await _get_product_ratings(db, product.id)
    return {
        "id": product.id,
        "slug": getattr(product, "slug", None),
        "code": getattr(product, "code", None),
        "name": name,
        "description": description,
        "price": product.price,
        "stock_quantity": sum(c.stock_quantity for c in children) if children else 0,
        "stock_reserved": product.stock_reserved or 0,
        "stock_net": stock_net,
        "image_url": product.image_url,
        "category_id": product.category_id,
        "category_path": category_path,
        "brand_name": brand_name,
        "attributes": attributes,
        "is_active": product.is_active,
        "children": child_list,
        "single_sized": single_sized,
        "avg_rating": avg_rating,
        "rating_count": rating_count,
    }
