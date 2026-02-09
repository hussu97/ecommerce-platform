from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.product import Product
from app.models.product_attribute_value import ProductAttributeValue
from app.models.taxonomy_attribute import TaxonomyAttributeOption
from app.models.language import Language
from app.schemas.product import ProductResponse
from app.schemas.product_list import ProductListResponse, ProductListFilters
from app.core.language import resolve_language
from app.services.i18n import build_product_response
from app.services.product_list import list_products_with_filters

router = APIRouter()


def _product_options():
    return (
        selectinload(Product.category_rel),
        selectinload(Product.brand_rel),
        selectinload(Product.attribute_values).selectinload(ProductAttributeValue.option_rel).selectinload(TaxonomyAttributeOption.attribute),
    )


def _parse_option_ids(option_ids: Optional[str]) -> List[int]:
    if not option_ids:
        return []
    return [int(x.strip()) for x in option_ids.split(",") if x.strip()]


@router.get("/", response_model=ProductListResponse)
async def list_products(
    db: AsyncSession = Depends(get_db),
    language: Language = Depends(resolve_language),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by product name"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    brand_slug: Optional[str] = Query(None, description="Filter by brand slug"),
    option_ids: Optional[str] = Query(None, description="Comma-separated attribute option IDs (all must match)"),
    min_price: Optional[float] = Query(None, description="Minimum price (AED)"),
    max_price: Optional[float] = Query(None, description="Maximum price (AED)"),
    sort: Optional[str] = Query(
        None,
        description="Sort order: featured (default), newest, price_asc, price_desc",
    ),
):
    """
    List products with embedded filters. Returns products + filters (categories, brands, attributes)
    with counts. Filters reflect available options based on products matching current selection.
    """
    opt_ids = _parse_option_ids(option_ids)
    data = await list_products_with_filters(
        db,
        language.id,
        search,
        category_slug,
        brand_slug,
        opt_ids or None,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        skip=skip,
        limit=limit,
    )
    return ProductListResponse(
        products=data["products"],
        filters=ProductListFilters(**data["filters"]),
    )


@router.get("/{slug}/reviews")
async def get_product_reviews(
    slug: str,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """Get reviews for a product."""
    from app.models.product_review import ProductReview
    from app.models.order import Order, OrderItem

    prod = await db.execute(select(Product).where(Product.slug == slug.lower()))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    result = await db.execute(
        select(ProductReview, OrderItem, Order)
        .join(OrderItem, ProductReview.order_item_id == OrderItem.id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(ProductReview.product_id == product.id)
        .order_by(ProductReview.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "order_item_number": oi.order_item_number,
            "purchased_at": order.created_at.isoformat() if order.created_at else None,
        }
        for r, oi, order in rows
    ]


@router.get("/{slug}", response_model=ProductResponse)
async def get_product(
    slug: str,
    db: AsyncSession = Depends(get_db),
    language: Language = Depends(resolve_language),
):
    """Get single product by slug. Returns translated content based on language."""
    query = select(Product).where(Product.slug == slug.lower())
    result = await db.execute(query.options(*_product_options()))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return ProductResponse(**await build_product_response(db, product, language.id))
