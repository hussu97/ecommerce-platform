from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class OrderItemSchema(BaseModel):
    product_slug: str = Field(..., max_length=255)
    child_code: str = Field(..., max_length=64)  # product child code (required)
    quantity: int = Field(..., ge=1, le=100)
    price_at_purchase: float = Field(..., ge=0)


class OrderCreate(BaseModel):
    items: List[OrderItemSchema]
    total_amount: float = Field(..., ge=0)
    address_code: str = Field(..., max_length=36)  # required; must be a saved address for current user


class PaymentIntentCreate(BaseModel):
    amount: float = Field(..., ge=0)


class OrderItemProductSchema(BaseModel):
    id: str
    slug: Optional[str] = None
    name: str
    price: float
    image_url: Optional[str] = None
    brand_name: Optional[str] = None
    category_path: Optional[str] = None

    class Config:
        from_attributes = True


class OrderItemReviewSchema(BaseModel):
    rating: int
    comment: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    order_item_number: int
    product_id: str
    product_child_id: int
    quantity: int
    price_at_purchase: float
    status: str
    product: Optional[OrderItemProductSchema] = None
    can_rate: bool = False
    has_review: bool = False
    review: Optional[OrderItemReviewSchema] = None

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    order_number: Optional[str] = None
    user_id: int
    status: str
    total_amount: float
    address_code: Optional[str] = None
    shipping_address: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True
