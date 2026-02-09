from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class OrderItemSchema(BaseModel):
    product_slug: str = Field(..., max_length=255)
    quantity: int = Field(..., ge=1, le=100)
    price_at_purchase: float = Field(..., ge=0)


class AddressSchema(BaseModel):
    street: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    country: str = Field(..., max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    state_province: Optional[str] = Field(None, max_length=100)


class OrderCreate(BaseModel):
    items: List[OrderItemSchema]
    total_amount: float = Field(..., ge=0)
    address_code: Optional[str] = Field(None, max_length=36)  # use saved address (preferred)
    shipping_address: Optional[AddressSchema] = None  # inline address when no saved address


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
    shipping_address: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True
