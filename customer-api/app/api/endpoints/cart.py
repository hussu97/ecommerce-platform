from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import (
    CartItemAdd,
    CartItemUpdate,
    CartItemResponse,
    CartMergeResponse,
)
from app.core.deps import get_current_active_user
from app.core.security import verify_token
from app.models.user import User

router = APIRouter()

# Optional bearer - doesn't raise 401 when missing
optional_oauth2 = HTTPBearer(auto_error=False)


async def get_cart_owner(
    credential: Optional[HTTPAuthorizationCredentials] = Depends(optional_oauth2),
    x_visitor_id: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Tuple[Optional[str], Optional[int]]:
    """
    Resolve cart owner: (visitor_id, user_id).
    For guests: visitor_id set, user_id None.
    For logged-in: user_id set, visitor_id None.
    """
    # Try authenticated user first
    if credential and credential.credentials:
        payload = verify_token(credential.credentials)
        if payload:
            email = payload.get("sub")
            if email:
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalar_one_or_none()
                if user and user.is_active:
                    return (None, user.id)

    # Fall back to visitor
    if x_visitor_id and x_visitor_id.strip():
        return (x_visitor_id.strip(), None)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Provide Authorization header (logged-in) or X-Visitor-ID header (guest)",
    )


@router.get("/", response_model=List[CartItemResponse])
async def get_cart(
    owner: Tuple[Optional[str], Optional[int]] = Depends(get_cart_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get current cart items."""
    visitor_id, user_id = owner
    query = select(CartItem).options(
        selectinload(CartItem.product).selectinload(Product.category_rel)
    )
    if user_id is not None:
        query = query.where(CartItem.user_id == user_id)
    else:
        query = query.where(CartItem.visitor_id == visitor_id)

    result = await db.execute(query)
    items = result.scalars().all()
    # Build response with product nested - CartItemResponse expects 'product' attr
    return [
        CartItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            product=item.product,
        )
        for item in items
    ]


@router.post("/items", response_model=CartItemResponse)
async def add_cart_item(
    item_in: CartItemAdd,
    owner: Tuple[Optional[str], Optional[int]] = Depends(get_cart_owner),
    db: AsyncSession = Depends(get_db),
):
    """Add or update cart item."""
    visitor_id, user_id = owner

    # Resolve product by slug
    result = await db.execute(
        select(Product).where(Product.slug == item_in.product_slug.lower(), Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if item_in.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    stock_net = product.stock_quantity - (product.stock_reserved or 0)
    if stock_net < item_in.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {stock_net}",
        )

    # Check for existing item
    if user_id is not None:
        existing = await db.execute(
            select(CartItem)
            .where(CartItem.user_id == user_id, CartItem.product_id == product.id)
        )
    else:
        existing = await db.execute(
            select(CartItem)
            .where(
                CartItem.visitor_id == visitor_id,
                CartItem.product_id == product.id,
            )
        )
    cart_item = existing.scalar_one_or_none()

    if cart_item:
        new_qty = cart_item.quantity + item_in.quantity
        stock_net = product.stock_quantity - (product.stock_reserved or 0)
        if stock_net < new_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {stock_net}",
            )
        cart_item.quantity = new_qty
        await db.commit()
        await db.refresh(cart_item)
        product_result = await db.execute(
            select(Product)
            .where(Product.id == cart_item.product_id)
            .options(selectinload(Product.category_rel))
        )
        product = product_result.scalar_one_or_none()
        return CartItemResponse(
            id=cart_item.id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            product=product or cart_item.product,
        )

    cart_item = CartItem(
        visitor_id=visitor_id,
        user_id=user_id,
        product_id=product.id,
        quantity=item_in.quantity,
    )
    db.add(cart_item)
    await db.commit()
    await db.refresh(cart_item)
    product_result = await db.execute(
        select(Product)
        .where(Product.id == cart_item.product_id)
        .options(selectinload(Product.category_rel))
    )
    product = product_result.scalar_one_or_none()
    return CartItemResponse(
        id=cart_item.id,
        product_id=cart_item.product_id,
        quantity=cart_item.quantity,
        product=product or cart_item.product,
    )


@router.put("/items/{product_slug}", response_model=CartItemResponse)
async def update_cart_item(
    product_slug: str,
    item_update: CartItemUpdate,
    owner: Tuple[Optional[str], Optional[int]] = Depends(get_cart_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update cart item quantity. product_slug identifies the product."""
    visitor_id, user_id = owner
    if item_update.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    # Resolve product by slug
    prod_res = await db.execute(select(Product).where(Product.slug == product_slug.lower()))
    product = prod_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if user_id is not None:
        result = await db.execute(
            select(CartItem)
            .options(selectinload(CartItem.product))
            .where(CartItem.user_id == user_id, CartItem.product_id == product.id)
        )
    else:
        result = await db.execute(
            select(CartItem)
            .options(selectinload(CartItem.product))
            .where(
                CartItem.visitor_id == visitor_id,
                CartItem.product_id == product.id,
            )
        )
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    stock_net = cart_item.product.stock_quantity - (cart_item.product.stock_reserved or 0)
    if stock_net < item_update.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {stock_net}",
        )

    cart_item.quantity = item_update.quantity
    await db.commit()
    await db.refresh(cart_item)
    product_result = await db.execute(
        select(Product)
        .where(Product.id == cart_item.product_id)
        .options(selectinload(Product.category_rel))
    )
    product = product_result.scalar_one_or_none()
    return CartItemResponse(
        id=cart_item.id,
        product_id=cart_item.product_id,
        quantity=cart_item.quantity,
        product=product or cart_item.product,
    )


@router.delete("/items/{product_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cart_item(
    product_slug: str,
    owner: Tuple[Optional[str], Optional[int]] = Depends(get_cart_owner),
    db: AsyncSession = Depends(get_db),
):
    """Remove item from cart. product_slug identifies the product."""
    visitor_id, user_id = owner

    # Resolve product by slug
    prod_res = await db.execute(select(Product).where(Product.slug == product_slug.lower()))
    product = prod_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if user_id is not None:
        result = await db.execute(
            select(CartItem).where(
                CartItem.user_id == user_id, CartItem.product_id == product.id
            )
        )
    else:
        result = await db.execute(
            select(CartItem).where(
                CartItem.visitor_id == visitor_id,
                CartItem.product_id == product.id,
            )
        )
    cart_item = result.scalar_one_or_none()
    if cart_item:
        await db.delete(cart_item)
        await db.commit()


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    owner: Tuple[Optional[str], Optional[int]] = Depends(get_cart_owner),
    db: AsyncSession = Depends(get_db),
):
    """Clear all cart items."""
    visitor_id, user_id = owner
    if user_id is not None:
        result = await db.execute(select(CartItem).where(CartItem.user_id == user_id))
    else:
        result = await db.execute(
            select(CartItem).where(CartItem.visitor_id == visitor_id)
        )
    items = result.scalars().all()
    for item in items:
        await db.delete(item)
    await db.commit()


@router.post("/merge", response_model=CartMergeResponse)
async def merge_cart(
    x_visitor_id: Optional[str] = Header(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Merge guest cart (visitor_id) into logged-in user cart.
    Call this after login to transfer guest cart to user.
    """
    if not x_visitor_id or not x_visitor_id.strip():
        return CartMergeResponse(merged=0, message="No visitor cart to merge")

    visitor_id = x_visitor_id.strip()
    result = await db.execute(
        select(CartItem).where(CartItem.visitor_id == visitor_id)
    )
    guest_items = result.scalars().all()
    merged = 0

    for item in guest_items:
        existing = await db.execute(
            select(CartItem).where(
                CartItem.user_id == current_user.id,
                CartItem.product_id == item.product_id,
            )
        )
        existing_item = existing.scalar_one_or_none()
        if existing_item:
            existing_item.quantity += item.quantity
            await db.delete(item)
            merged += 1
        else:
            item.visitor_id = None
            item.user_id = current_user.id
            merged += 1

    await db.commit()
    return CartMergeResponse(
        merged=merged,
        message=f"Merged {merged} item(s) from guest cart",
    )
