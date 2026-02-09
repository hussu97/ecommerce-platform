from sqlalchemy import Boolean, Column, Integer, String
from app.db.base import Base


class Taxonomy(Base):
    """
    High-level product categories.
    """
    __tablename__ = "taxonomies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=True)  # codified from name
    section = Column(String, nullable=True, index=True)  # optional grouping
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    @property
    def path(self) -> str:
        """For backward compat with Product.category_path."""
        return self.name
