from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class OrderResponse(BaseModel):
    id: int
    user_id: int
    status: str
    total_amount: float
    created_at: datetime
    shipping_address: Optional[str] = None

    class Config:
        from_attributes = True
