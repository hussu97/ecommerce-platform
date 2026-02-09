from pydantic import BaseModel, Field
from typing import Optional


class CartItemAdd(BaseModel):
    product_slug: str = Field(..., max_length=255)
    child_code: str = Field(..., max_length=64)  # product child code (required; every product has children)
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


class CartItemChildSchema(BaseModel):
    """Child (size) info for cart line."""
    id: int
    code: str
    size_value: Optional[str] = None
    stock_net: int = 0

    class Config:
        from_attributes = True


class CartItemResponse(BaseModel):
    id: int
    product_id: str
    product_child_id: int
    quantity: int
    product: CartItemProduct
    child: Optional[CartItemChildSchema] = None  # code, size_value, stock_net

    class Config:
        from_attributes = True


class CartMergeResponse(BaseModel):
    merged: int
    message: str
