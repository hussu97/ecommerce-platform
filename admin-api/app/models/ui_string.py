from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.db.base import Base


class UIString(Base):
    __tablename__ = "ui_strings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(200), nullable=False, index=True)
    language_id = Column(Integer, ForeignKey("languages.id", ondelete="CASCADE"), nullable=False)
    value = Column(String(500), nullable=False)

    __table_args__ = (UniqueConstraint("key", "language_id", name="uq_ui_string_key_lang"),)
