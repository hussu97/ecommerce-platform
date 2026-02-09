from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.product_child import ProductChild
from app.models.stock_reservation import StockReservation
from app.models.user import User
from app.schemas.order import OrderResponse
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request

router = APIRouter()


@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
    skip: int = 0,
    limit: int = 100,
):
    query = select(Order).offset(skip).limit(limit).order_by(Order.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    request: Request,
    order_status: str = Query(..., alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    new_status = order_status.lower()
    prev_status = order.status.lower() if order.status else ""

    # Shipped: deactivate reservations; decrement child's stock_quantity and stock_reserved
    if new_status == "shipped":
        reservations = await db.execute(
            select(StockReservation).where(
                StockReservation.order_id == order_id,
                StockReservation.status == "active",
            )
        )
        for res in reservations.scalars().all():
            res.status = "shipped"
            child_result = await db.execute(select(ProductChild).where(ProductChild.id == res.product_child_id))
            child = child_result.scalar_one_or_none()
            if child:
                child.stock_quantity = max(0, child.stock_quantity - res.quantity)
                child.stock_reserved = max(0, (child.stock_reserved or 0) - res.quantity)

    # Cancelled: deactivate reservations; decrement child's stock_reserved only
    elif new_status == "cancelled":
        reservations = await db.execute(
            select(StockReservation).where(
                StockReservation.order_id == order_id,
                StockReservation.status == "active",
            )
        )
        for res in reservations.scalars().all():
            res.status = "cancelled"
            child_result = await db.execute(select(ProductChild).where(ProductChild.id == res.product_child_id))
            child = child_result.scalar_one_or_none()
            if child:
                child.stock_reserved = max(0, (child.stock_reserved or 0) - res.quantity)

    order.status = new_status
    await db.commit()
    await db.refresh(order)
    await log_audit_from_request(db, request, "order.status_update", "order", str(order_id), current_user.id, 200)
    await db.commit()
    return order


@router.put("/{order_id}/items/{order_item_id}/status")
async def update_order_item_status(
    order_id: int,
    order_item_id: int,
    request: Request,
    item_status: str = Query(..., description="pending, shipped, delivered"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update delivery status of an order item."""
    result = await db.execute(
        select(OrderItem).where(
            OrderItem.id == order_item_id,
            OrderItem.order_id == order_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found")

    new_status = item_status.lower()
    if new_status not in ("pending", "shipped", "delivered"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be pending, shipped, or delivered")

    if new_status == "shipped":
        res = await db.execute(
            select(StockReservation).where(
                StockReservation.order_item_id == order_item_id,
                StockReservation.status == "active",
            )
        )
        for reservation in res.scalars().all():
            reservation.status = "shipped"
            child_result = await db.execute(select(ProductChild).where(ProductChild.id == reservation.product_child_id))
            child = child_result.scalar_one_or_none()
            if child:
                child.stock_quantity = max(0, child.stock_quantity - reservation.quantity)
                child.stock_reserved = max(0, (child.stock_reserved or 0) - reservation.quantity)

    item.status = new_status
    await db.commit()
    await db.refresh(item)
    await log_audit_from_request(db, request, "order_item.status_update", "order_item", str(order_item_id), current_user.id, 200)
    await db.commit()
    return {"id": item.id, "order_item_number": item.order_item_number, "status": item.status}
