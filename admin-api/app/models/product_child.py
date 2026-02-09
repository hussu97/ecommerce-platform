"""Product child (variant/size): code, barcode, size_value, stock. Every product has at least one."""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class ProductChild(Base):
    __tablename__ = "product_children"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    barcode = Column(String(128), nullable=True)
    size_value = Column(String(64), nullable=False)  # e.g. "S", "M", "L", or "single_size"
    stock_quantity = Column(Integer, default=0)
    stock_reserved = Column(Integer, default=0)

    __table_args__ = (UniqueConstraint("product_id", "size_value", name="uq_product_children_product_size"),)

    product = relationship("Product", back_populates="children", foreign_keys=[product_id])

    @property
    def stock_net(self) -> int:
        return max(0, self.stock_quantity - self.stock_reserved)
