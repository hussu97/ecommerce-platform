import uuid
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)  # codified from name
    description = Column(String)
    price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0)  # gross
    stock_reserved = Column(Integer, default=0)  # reserved by active orders
    image_url = Column(String)
    category_id = Column(Integer, ForeignKey("taxonomies.id"), index=True, nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), index=True, nullable=True)
    is_active = Column(Boolean, default=True)

    @property
    def brand_name(self):
        return self.brand_rel.name if self.brand_rel else None

    @property
    def attributes(self):
        return [
            {"attribute_name": av.option_rel.attribute.name, "value": av.option_rel.value}
            for av in (self.attribute_values or [])
            if av.option_rel and av.option_rel.attribute
        ]

    category_rel = relationship("Taxonomy", backref="products", foreign_keys=[category_id])
    brand_rel = relationship("Brand", backref="products", foreign_keys=[brand_id])
    attribute_values = relationship(
        "ProductAttributeValue",
        backref="product",
        cascade="all, delete-orphan",
    )

    @property
    def category_path(self) -> Optional[str]:
        return self.category_rel.path if self.category_rel else None

    @property
    def stock_net(self) -> int:
        """Available stock = gross - reserved."""
        return max(0, self.stock_quantity - self.stock_reserved)
