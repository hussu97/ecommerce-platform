"""Bulk product upload job tracking."""
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class ProductBulkUpload(Base):
    __tablename__ = "product_bulk_uploads"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    taxonomy_id = Column(Integer, ForeignKey("taxonomies.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, processing, completed, failed
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    error_rows = Column(Integer, default=0)
    error_details = Column(JSON, nullable=True)  # { row_num: "error message" }
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    taxonomy_rel = relationship("Taxonomy", backref="bulk_uploads")
    user_rel = relationship("User", backref="bulk_uploads")
