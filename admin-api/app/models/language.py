from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base


class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
