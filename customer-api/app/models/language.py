"""Supported languages. New languages added here are supported across admin + customer apps."""
from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base


class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), nullable=False, unique=True, index=True)  # en, ar, zh
    name = Column(String(100), nullable=False)  # native name: English, العربية, 中文
    is_default = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
