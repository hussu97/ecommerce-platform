from pydantic import BaseModel, Field
from typing import Optional


class CartItemAdd(BaseModel):
    product_slug: str = Field(..., max_length=255)
    quantity: int = Field(1, ge=1, le=100)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1, le=100)


class CartItemProduct(BaseModel):
    id: str
    slug: Optional[str] = None
    name: str
    price: float
    image_url: Optional[str] = None
    category_path: Optional[str] = None
    stock_quantity: int

    class Config:
        from_attributes = True


class CartItemResponse(BaseModel):
    id: int
    product_id: str
    quantity: int
    product: CartItemProduct

    class Config:
        from_attributes = True


class CartMergeResponse(BaseModel):
    merged: int
    message: str
