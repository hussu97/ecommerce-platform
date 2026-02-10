from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String(512), nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
