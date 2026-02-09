from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(32), unique=True, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, paid (payment status)
    total_amount = Column(Float, nullable=False)
    shipping_address = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("OrderItem", back_populates="order", order_by="OrderItem.order_item_number")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    order_item_number = Column(Integer, default=1, nullable=False)  # 1-based within order
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    product_child_id = Column(Integer, ForeignKey("product_children.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, shipped, delivered

    order = relationship("Order", back_populates="items")
    product = relationship("Product", foreign_keys=[product_id])
    product_child = relationship("ProductChild", foreign_keys=[product_child_id])
