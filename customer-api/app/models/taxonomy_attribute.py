"""Attributes for taxonomies - e.g. Size, Color, Material (select type with options)."""
from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class TaxonomyAttribute(Base):
    __tablename__ = "taxonomy_attributes"

    id = Column(Integer, primary_key=True, index=True)
    taxonomy_id = Column(Integer, ForeignKey("taxonomies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    type_ = Column("type", String, default="select")  # select only for now
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    taxonomy = relationship("Taxonomy", backref="attributes")
    options = relationship("TaxonomyAttributeOption", back_populates="attribute", cascade="all, delete-orphan")


class TaxonomyAttributeOption(Base):
    __tablename__ = "taxonomy_attribute_options"

    id = Column(Integer, primary_key=True, index=True)
    attribute_id = Column(Integer, ForeignKey("taxonomy_attributes.id", ondelete="CASCADE"), nullable=False)
    value = Column(String, nullable=False, index=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    attribute = relationship("TaxonomyAttribute", back_populates="options")
