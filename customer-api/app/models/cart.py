from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class CartItem(Base):
    """Cart item - either for a guest (visitor_id) or logged-in user (user_id). Always references a product child."""
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(String(36), nullable=True, index=True)  # UUID for guests
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    product_child_id = Column(Integer, ForeignKey("product_children.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    product = relationship("Product", lazy="selectin")
    product_child = relationship("ProductChild", lazy="selectin", foreign_keys=[product_child_id])
