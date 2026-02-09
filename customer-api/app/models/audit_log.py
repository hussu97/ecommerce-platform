"""Audit log model for compliance."""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base


class AuditLog(Base):
    """Audit log for admin and sensitive customer actions."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g. product.create, order.status_update
    resource_type = Column(String(50), nullable=False)  # e.g. product, order
    resource_id = Column(String(100), nullable=True)
    method = Column(String(10), nullable=True)
    path = Column(String(500), nullable=True)
    status_code = Column(Integer, nullable=True)
    ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_summary = Column(Text, nullable=True)  # JSON, sanitized
