"""Product attribute values - links product to attribute option."""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class ProductAttributeValue(Base):
    __tablename__ = "product_attribute_values"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(Integer, ForeignKey("taxonomy_attribute_options.id", ondelete="CASCADE"), nullable=False)

    option_rel = relationship("TaxonomyAttributeOption", backref="product_values", lazy="joined")

    __table_args__ = (UniqueConstraint("product_id", "option_id", name="uq_product_option"),)
