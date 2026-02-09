"""Product listing service: products + filters with counts."""
from typing import Optional, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.product import Product
from app.models.taxonomy import Taxonomy
from app.models.brand import Brand
from app.models.taxonomy_attribute import TaxonomyAttribute, TaxonomyAttributeOption
from app.models.product_attribute_value import ProductAttributeValue
from app.services.i18n import (
    build_product_response,
    get_taxonomy_translated,
    get_brand_translated,
    get_attribute_translated,
    get_option_translated,
)


def _base_product_query(
    search: Optional[str] = None,
    category_slug: Optional[str] = None,
    brand_slug: Optional[str] = None,
    option_ids: Optional[List[int]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
):
    """Build base product subquery/conditions for filtering."""
    conditions = [Product.is_active == True]
    if search and search.strip():
        conditions.append(Product.name.ilike(f"%{search.strip()}%"))
    if category_slug:
        subq = select(Taxonomy.id).where(Taxonomy.slug == category_slug, Taxonomy.is_active == True)
        conditions.append(Product.category_id.in_(subq))
    if brand_slug:
        subq = select(Brand.id).where(Brand.slug == brand_slug)
        conditions.append(Product.brand_id.in_(subq))
    if option_ids:
        subq = (
            select(ProductAttributeValue.product_id)
            .where(ProductAttributeValue.option_id.in_(option_ids))
            .group_by(ProductAttributeValue.product_id)
            .having(func.count(ProductAttributeValue.product_id) == len(option_ids))
        )
        conditions.append(Product.id.in_(subq))
    if min_price is not None:
        conditions.append(Product.price >= min_price)
    if max_price is not None:
        conditions.append(Product.price <= max_price)
    return and_(*conditions) if conditions else True


# Sort options: featured (default), newest, price_asc, price_desc
def _order_by_clause(sort: Optional[str] = None):
    if sort == "newest":
        return Product.id.desc()
    if sort == "price_asc":
        return Product.price.asc()
    if sort == "price_desc":
        return Product.price.desc()
    return Product.id.asc()  # featured / default


async def list_products_with_filters(
    db: AsyncSession,
    language_id: int,
    search: Optional[str] = None,
    category_slug: Optional[str] = None,
    brand_slug: Optional[str] = None,
    option_ids: Optional[List[int]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """
    Return products and filters. Filters show available options with counts
    based on products matching the *other* filters (dynamic filter refinement).
    """
    base_cond = _base_product_query(
        search, category_slug, brand_slug, option_ids, min_price, max_price
    )
    product_options = (
        selectinload(Product.category_rel),
        selectinload(Product.brand_rel),
        selectinload(Product.attribute_values).selectinload(
            ProductAttributeValue.option_rel
        ).selectinload(TaxonomyAttributeOption.attribute),
    )

    # Products
    order = _order_by_clause(sort)
    query = (
        select(Product)
        .where(base_cond)
        .options(*product_options)
        .order_by(order)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    products_raw = result.scalars().all()
    products = [
        await build_product_response(db, p, language_id) for p in products_raw
    ]

    # Filters: categories (excluding category filter - show all categories with products matching brand/search/options)
    cat_cond = _base_product_query(search, None, brand_slug, option_ids, min_price, max_price)
    cat_subq = (
        select(Product.category_id, func.count(Product.id).label("cnt"))
        .where(cat_cond)
        .where(Product.category_id.isnot(None))
        .group_by(Product.category_id)
    )
    cat_result = await db.execute(cat_subq)
    cat_rows = cat_result.all()
    category_ids = [r[0] for r in cat_rows]
    cat_counts = {r[0]: r[1] for r in cat_rows}

    categories_data = []
    if category_ids:
        tax_result = await db.execute(
            select(Taxonomy).where(Taxonomy.id.in_(category_ids)).order_by(Taxonomy.sort_order, Taxonomy.name)
        )
        taxonomies = tax_result.scalars().all()
        for t in taxonomies:
            name = await get_taxonomy_translated(db, t.id, language_id) or t.name
            categories_data.append({
                "id": t.id,
                "name": name,
                "slug": t.slug,
                "count": cat_counts.get(t.id, 0),
            })

    # Filters: brands (excluding brand filter)
    brand_cond = _base_product_query(search, category_slug, None, option_ids, min_price, max_price)
    brand_subq = (
        select(Product.brand_id, func.count(Product.id).label("cnt"))
        .where(brand_cond)
        .where(Product.brand_id.isnot(None))
        .group_by(Product.brand_id)
    )
    brand_result = await db.execute(brand_subq)
    brand_rows = brand_result.all()
    brand_ids = [r[0] for r in brand_rows]
    brand_counts = {r[0]: r[1] for r in brand_rows}

    brands_data = []
    if brand_ids:
        b_result = await db.execute(
            select(Brand).where(Brand.id.in_(brand_ids)).order_by(Brand.name)
        )
        brands = b_result.scalars().all()
        for b in brands:
            name = await get_brand_translated(db, b.id, language_id) or b.name
            brands_data.append({
                "id": b.id,
                "name": name,
                "slug": b.slug,
                "count": brand_counts.get(b.id, 0),
            })

    # Filters: attributes (only when category selected - attributes are taxonomy-scoped)
    # For each option: count = products matching (base) + (other selected options) + this option
    attributes_data = []
    if category_slug:
        tax_res = await db.execute(
            select(Taxonomy).where(Taxonomy.slug == category_slug, Taxonomy.is_active == True)
        )
        taxonomy = tax_res.scalar_one_or_none()
        if taxonomy:
            attr_res = await db.execute(
                select(TaxonomyAttribute)
                .where(TaxonomyAttribute.taxonomy_id == taxonomy.id, TaxonomyAttribute.is_active == True)
                .order_by(TaxonomyAttribute.sort_order, TaxonomyAttribute.name)
                .options(selectinload(TaxonomyAttribute.options))
            )
            attrs = attr_res.scalars().all()
            for attr in attrs:
                attr_name = await get_attribute_translated(db, attr.id, language_id) or attr.name
                # Options selected from OTHER attributes (not this one)
                other_opt_ids = [oid for oid in (option_ids or []) if oid not in {o.id for o in (attr.options or [])}]
                opts_with_count = []
                for opt in sorted(
                    [o for o in (attr.options or []) if getattr(o, "is_active", True)],
                    key=lambda o: (o.sort_order or 0, o.value),
                ):
                    opt_val = await get_option_translated(db, opt.id, language_id) or opt.value
                    combined_opts = other_opt_ids + [opt.id]
                    opt_cond = _base_product_query(
                        search, category_slug, brand_slug, combined_opts, min_price, max_price
                    )
                    cnt_res = await db.execute(
                        select(func.count(Product.id)).select_from(Product).where(opt_cond)
                    )
                    cnt = cnt_res.scalar() or 0
                    if cnt > 0:
                        opts_with_count.append({
                            "id": opt.id,
                            "value": opt_val,
                            "count": cnt,
                        })
                if opts_with_count:
                    attributes_data.append({
                        "id": attr.id,
                        "name": attr_name,
                        "options": opts_with_count,
                    })

    return {
        "products": products,
        "filters": {
            "categories": categories_data,
            "brands": brands_data,
            "attributes": attributes_data,
        },
    }
