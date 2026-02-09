"""Wishlist: parent-product only; logged-in users. Move-to-cart adds to cart and removes from wishlist."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.wishlist import WishlistItem
from app.models.cart import CartItem
from app.models.product import Product
from app.models.product_child import ProductChild
from app.models.user import User
from app.schemas.wishlist import WishlistAdd, WishlistMoveToCart
from app.schemas.cart import CartItemResponse
from app.core.deps import get_current_active_user
from app.core.language import resolve_language
from app.models.language import Language
from app.models.product_attribute_value import ProductAttributeValue
from app.models.taxonomy_attribute import TaxonomyAttributeOption
from app.services.i18n import build_product_response

router = APIRouter()


def _wishlist_product_options():
    return (
        selectinload(WishlistItem.product).selectinload(Product.children),
        selectinload(WishlistItem.product).selectinload(Product.category_rel),
        selectinload(WishlistItem.product).selectinload(Product.brand_rel),
        selectinload(WishlistItem.product).selectinload(Product.attribute_values).selectinload(
            ProductAttributeValue.option_rel
        ).selectinload(TaxonomyAttributeOption.attribute),
    )


@router.get("", response_model=List[dict])
async def list_wishlist(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    language: Language = Depends(resolve_language),
):
    """List current user's wishlist. Returns product-shaped items (id, slug, name, price, children, single_sized, etc.)."""
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .options(*_wishlist_product_options())
    )
    items = result.scalars().all()
    out = []
    for wi in items:
        if wi.product and wi.product.is_active:
            d = await build_product_response(db, wi.product, language.id)
            out.append(d)
    return out


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    body: WishlistAdd,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Add product to wishlist by slug. Idempotent if already in wishlist."""
    slug = body.product_slug.strip().lower()
    result = await db.execute(select(Product).where(Product.slug == slug, Product.is_active == True))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already in wishlist"}
    wi = WishlistItem(user_id=current_user.id, product_id=product.id)
    db.add(wi)
    await db.commit()
    return {"message": "Added to wishlist"}


@router.delete("/{product_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_slug: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove product from wishlist by slug."""
    slug = product_slug.strip().lower()
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.execute(
        delete(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
    )
    await db.commit()


@router.post("/{product_slug}/move-to-cart", response_model=CartItemResponse)
async def move_to_cart(
    product_slug: str,
    body: WishlistMoveToCart,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Add item to cart and remove from wishlist in one transaction. Requires child_code for multi-size; optional for single_size."""
    slug = product_slug.strip().lower()
    result = await db.execute(
        select(Product).where(Product.slug == slug, Product.is_active == True).options(selectinload(Product.children))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Ensure product is in wishlist
    wi_result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
    )
    if not wi_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Product not in wishlist")

    children = list(product.children) if product.children else []
    single_sized = (
        len(children) == 1 and getattr(children[0], "size_value", None) == "single_size"
    )

    if body.child_code and body.child_code.strip():
        child_code = body.child_code.strip()
        child_result = await db.execute(
            select(ProductChild).where(
                ProductChild.product_id == product.id,
                ProductChild.code == child_code,
            )
        )
        child = child_result.scalar_one_or_none()
    elif single_sized and children:
        child = children[0]
    else:
        raise HTTPException(status_code=400, detail="child_code required for multi-size product")

    if not child:
        raise HTTPException(status_code=404, detail="Product variant (child) not found")

    quantity = 1
    if child.stock_net < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {child.stock_net}",
        )

    # Add or update cart (user_id only; no visitor_id for move-to-cart)
    existing_cart = await db.execute(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.product_id == product.id,
            CartItem.product_child_id == child.id,
        )
    )
    cart_item = existing_cart.scalar_one_or_none()
    if cart_item:
        new_qty = cart_item.quantity + quantity
        if child.stock_net < new_qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {child.stock_net}")
        cart_item.quantity = new_qty
    else:
        cart_item = CartItem(
            visitor_id=None,
            user_id=current_user.id,
            product_id=product.id,
            product_child_id=child.id,
            quantity=quantity,
        )
        db.add(cart_item)

    # Remove from wishlist
    await db.execute(
        delete(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
    )
    await db.commit()
    await db.refresh(cart_item)

    product_for_resp = (
        await db.execute(
            select(Product).where(Product.id == cart_item.product_id).options(selectinload(Product.category_rel))
        )
    ).scalar_one()
    return CartItemResponse(
        id=cart_item.id,
        product_id=cart_item.product_id,
        product_child_id=cart_item.product_child_id,
        quantity=cart_item.quantity,
        product=product_for_resp,
        child={
            "id": child.id,
            "code": child.code,
            "size_value": child.size_value,
            "stock_net": child.stock_net,
        },
    )
