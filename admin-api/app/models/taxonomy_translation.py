from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.db.base import Base


class TaxonomyTranslation(Base):
    __tablename__ = "taxonomy_translations"

    id = Column(Integer, primary_key=True, index=True)
    taxonomy_id = Column(Integer, ForeignKey("taxonomies.id", ondelete="CASCADE"), nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("taxonomy_id", "language_id", name="uq_taxonomy_language"),)
