"""Brand translations. Base column (name) = English fallback."""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.db.base import Base


class BrandTranslation(Base):
    __tablename__ = "brand_translations"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("brand_id", "language_id", name="uq_brand_language"),)
