"""Visitor language preference for anonymous users. Persisted by X-Visitor-ID."""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class VisitorPreference(Base):
    __tablename__ = "visitor_preferences"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(String(100), nullable=False, unique=True, index=True)
    language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
