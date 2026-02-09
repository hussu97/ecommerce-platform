import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Float, DateTime
from datetime import datetime
from app.db.base import Base


class CustomerAddress(Base):
    """Saved address for a customer. API uses address_code (UUID), not id."""
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    address_code = Column(String(36), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    contact_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address_type = Column(String(20), nullable=False)  # home, office, other
    street = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=True)
    state_province = Column(String(100), nullable=True)
    # Type-specific optional fields
    label = Column(String(255), nullable=True)  # for "other"
    company_name = Column(String(255), nullable=True)  # for "office"
    building_name = Column(String(255), nullable=True)
    floor_office = Column(String(100), nullable=True)  # e.g. "Level 15", "Apt 104"
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        if not kwargs.get("address_code"):
            kwargs["address_code"] = str(uuid.uuid4())
        super().__init__(**kwargs)

    def to_shipping_string(self) -> str:
        parts = [self.street, self.city]
        if self.state_province:
            parts.append(self.state_province)
        if self.postal_code:
            parts.append(self.postal_code)
        parts.append(self.country)
        return ", ".join(p for p in parts if p)
