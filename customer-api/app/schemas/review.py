from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)


class ReviewResponse(BaseModel):
    id: int
    order_item_id: int
    product_id: str
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewWithUser(BaseModel):
    id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    order_item_number: Optional[int] = None
    purchased_at: Optional[datetime] = None

    class Config:
        from_attributes = True
