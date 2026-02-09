from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.db.base import Base


class TaxonomyAttributeTranslation(Base):
    __tablename__ = "taxonomy_attribute_translations"

    id = Column(Integer, primary_key=True, index=True)
    attribute_id = Column(Integer, ForeignKey("taxonomy_attributes.id", ondelete="CASCADE"), nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("attribute_id", "language_id", name="uq_attr_language"),)


class TaxonomyAttributeOptionTranslation(Base):
    __tablename__ = "taxonomy_attribute_option_translations"

    id = Column(Integer, primary_key=True, index=True)
    option_id = Column(Integer, ForeignKey("taxonomy_attribute_options.id", ondelete="CASCADE"), nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    value = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("option_id", "language_id", name="uq_option_language"),)
