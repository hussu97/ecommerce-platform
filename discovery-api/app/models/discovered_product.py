from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base


class DiscoveredProduct(Base):
    __tablename__ = "discovered_products"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(String(64), nullable=False, index=True)
    brand = Column(String(255), nullable=True)
    title = Column(String(512), nullable=False)
    image_url = Column(String(2048), nullable=True)
    source_url = Column(String(2048), nullable=False)
    price = Column(Float, nullable=True)
    currency = Column(String(8), nullable=True)
    delivers_to_uae = Column(Boolean, nullable=True)
    raw_payload = Column(Text, nullable=True)  # JSON string
    discovered_at = Column(DateTime(timezone=True), server_default=func.now())
    run_id = Column(String(64), nullable=True, index=True)
