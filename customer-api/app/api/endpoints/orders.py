import stripe
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.db.session import get_db
from app.core.config import settings
from app.core.deps import get_current_active_user
from app.core.audit import log_audit_from_request
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.customer_address import CustomerAddress
from app.models.stock_reservation import StockReservation
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse, OrderItemProductSchema, OrderItemReviewSchema, PaymentIntentCreate
from app.schemas.review import ReviewCreate, ReviewResponse

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/create-payment-intent")
async def create_payment_intent(
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a Stripe Payment Intent."""
    try:
        if payment_data.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        if settings.STRIPE_SECRET_KEY.startswith("sk_test_4eC39") or "placeholder" in settings.STRIPE_SECRET_KEY:
            return {"client_secret": "mock_secret_for_testing"}

        intent = stripe.PaymentIntent.create(
            amount=int(payment_data.amount * 100),
            currency="usd",
            automatic_payment_methods={"enabled": True},
            metadata={"user_id": current_user.id, "email": current_user.email}
        )
        return {"client_secret": intent.client_secret}
    except Exception as e:
        print(f"Stripe Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_in: OrderCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new order and reserve stock."""
    # 1. Resolve slugs to products and validate
    slugs = list({item.product_slug.lower() for item in order_in.items})
    result = await db.execute(
        select(Product).where(Product.slug.in_(slugs)).with_for_update()
    )
    products_by_slug = {p.slug: p for p in result.scalars().all()}

    for item in order_in.items:
        product = products_by_slug.get(item.product_slug.lower())
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail=f"Product {item.product_slug} not found")
        stock_net = product.stock_quantity - (product.stock_reserved or 0)
        if stock_net < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {product.name}. Available: {stock_net}",
            )

    # 2. Resolve shipping address string (saved address by address_code or inline)
    shipping_str: str
    if order_in.address_code:
        addr_result = await db.execute(
            select(CustomerAddress).where(
                CustomerAddress.address_code == order_in.address_code,
                CustomerAddress.user_id == current_user.id,
            )
        )
        saved_addr = addr_result.scalar_one_or_none()
        if not saved_addr:
            raise HTTPException(status_code=404, detail="Address not found")
        shipping_str = saved_addr.to_shipping_string()
    elif order_in.shipping_address:
        address_in = order_in.shipping_address
        parts = [address_in.street, address_in.city]
        if address_in.state_province:
            parts.append(address_in.state_province)
        parts.extend([address_in.postal_code or "", address_in.country])
        shipping_str = ", ".join(p for p in parts if p)
    else:
        raise HTTPException(status_code=400, detail="Provide address_code or shipping_address")

    new_order = Order(
        user_id=current_user.id,
        status="paid",
        total_amount=order_in.total_amount,
        shipping_address=shipping_str
    )
    db.add(new_order)
    await db.flush()
    new_order.order_number = f"ORD-{new_order.id:06d}"
    await db.flush()

    # 3. Create order items and stock reservations
    for idx, item in enumerate(order_in.items, start=1):
        product = products_by_slug[item.product_slug.lower()]
        new_item = OrderItem(
            order_id=new_order.id,
            order_item_number=idx,
            product_id=product.id,
            quantity=item.quantity,
            price_at_purchase=item.price_at_purchase,
            status="pending",
        )
        db.add(new_item)
        await db.flush()

        # Create reservation and increment product.stock_reserved
        reservation = StockReservation(
            order_id=new_order.id,
            order_item_id=new_item.id,
            product_id=product.id,
            quantity=item.quantity,
            status="active",
        )
        db.add(reservation)
        product.stock_reserved = (product.stock_reserved or 0) + item.quantity

    await log_audit_from_request(db, request, "order.create", "order", str(new_order.id), current_user.id, 201)
    await db.commit()
    # Re-fetch with relationships loaded so response serialization doesn't trigger lazy load
    from app.models.product_review import ProductReview
    result = await db.execute(
        select(Order)
        .where(Order.id == new_order.id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.category_rel),
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.brand_rel),
        )
    )
    order = result.scalar_one()
    items_with_product = {order.id: [(oi, oi.product) for oi in (order.items or [])]}
    oi_ids = [oi.id for oi in (order.items or [])]
    reviews_result = await db.execute(
        select(ProductReview).where(ProductReview.order_item_id.in_(oi_ids))
    )
    review_map = {r.order_item_id: r for r in reviews_result.scalars().all()}
    return _build_order_response(order, items_with_product, review_map)


def _build_order_response(order, items_with_product, review_map):
    item_responses = []
    for oi, prod in items_with_product.get(order.id, []):
        rev = review_map.get(oi.id)
        is_delivered = (oi.status or "pending").lower() == "delivered"
        item_responses.append(
            OrderItemResponse(
                id=oi.id,
                order_item_number=oi.order_item_number or 1,
                product_id=oi.product_id,
                quantity=oi.quantity,
                price_at_purchase=oi.price_at_purchase,
                status=oi.status or "pending",
                product=OrderItemProductSchema.model_validate(prod) if prod else None,
                can_rate=is_delivered,
                has_review=rev is not None,
                review=OrderItemReviewSchema(rating=rev.rating, comment=rev.comment) if rev else None,
            )
        )
    return OrderResponse(
        id=order.id,
        order_number=order.order_number or f"ORD-{order.id:06d}",
        user_id=order.user_id,
        status=order.status,
        total_amount=order.total_amount,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        items=sorted(item_responses, key=lambda x: x.order_item_number),
    )


@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100
):
    """Get the current user's order history with items."""
    from app.models.product_review import ProductReview
    from sqlalchemy.orm import selectinload

    query = (
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.category_rel),
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.brand_rel),
        )
        .offset(skip)
        .limit(limit)
        .order_by(Order.created_at.desc())
    )
    result = await db.execute(query)
    orders = result.scalars().all()
    if not orders:
        return []

    items_by_order = {}
    oi_ids = []
    for o in orders:
        items_by_order[o.id] = [(oi, oi.product) for oi in (o.items or [])]
        oi_ids.extend([oi.id for oi in (o.items or [])])

    reviews_result = await db.execute(
        select(ProductReview).where(ProductReview.order_item_id.in_(oi_ids))
    )
    review_map = {r.order_item_id: r for r in reviews_result.scalars().all()}

    return [_build_order_response(o, items_by_order, review_map) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single order by id (must belong to current user)."""
    from app.models.product_review import ProductReview

    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.category_rel),
            selectinload(Order.items).selectinload(OrderItem.product).selectinload(Product.brand_rel),
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    items_with_product = {order.id: [(oi, oi.product) for oi in (order.items or [])]}
    oi_ids = [oi.id for oi in (order.items or [])]
    reviews_result = await db.execute(
        select(ProductReview).where(ProductReview.order_item_id.in_(oi_ids))
    )
    review_map = {r.order_item_id: r for r in reviews_result.scalars().all()}
    return _build_order_response(order, items_with_product, review_map)


@router.post("/items/{order_item_id}/review", response_model=ReviewResponse)
async def create_item_review(
    order_item_id: int,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Submit a rating and optional comment for a delivered order item."""
    from app.models.product_review import ProductReview

    result = await db.execute(
        select(OrderItem, Order)
        .join(Order, OrderItem.order_id == Order.id)
        .where(OrderItem.id == order_item_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found")
    oi, order = row
    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")
    if (oi.status or "pending").lower() != "delivered":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item must be delivered to rate")

    existing = await db.execute(select(ProductReview).where(ProductReview.order_item_id == order_item_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already reviewed. Use PUT to update.")

    review = ProductReview(
        order_item_id=order_item_id,
        product_id=oi.product_id,
        user_id=current_user.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.put("/items/{order_item_id}/review", response_model=ReviewResponse)
async def update_item_review(
    order_item_id: int,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing rating/review for a delivered order item."""
    from app.models.product_review import ProductReview

    result = await db.execute(
        select(OrderItem, Order)
        .join(Order, OrderItem.order_id == Order.id)
        .where(OrderItem.id == order_item_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found")
    oi, order = row
    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")
    if (oi.status or "pending").lower() != "delivered":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item must be delivered to rate")

    existing = await db.execute(select(ProductReview).where(ProductReview.order_item_id == order_item_id))
    review = existing.scalar_one_or_none()
    if not review or review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review.rating = data.rating
    review.comment = data.comment
    await db.commit()
    await db.refresh(review)
    return review
