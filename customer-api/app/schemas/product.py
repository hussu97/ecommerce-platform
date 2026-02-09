from pydantic import BaseModel, computed_field
from typing import Optional, List

SINGLE_SIZE_VALUE = "single_size"


class ProductChildResponse(BaseModel):
    """One variant/size for PDP and cart."""
    id: int
    code: str
    barcode: Optional[str] = None
    size_value: str  # e.g. "S", "M", "L", or "single_size" (may be omitted in response when single_sized)
    stock_quantity: int = 0
    stock_reserved: int = 0
    stock_net: int = 0

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock_quantity: int = 0
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    """Schema for product creation"""
    pass


class ProductUpdate(BaseModel):
    """Schema for product update (all fields optional)"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductAttributeResponse(BaseModel):
    attribute_name: str
    value: str


class ProductResponse(ProductBase):
    """Schema for product response. Stock from children; children list for PDP."""
    id: str
    slug: Optional[str] = None
    code: Optional[str] = None
    category_path: Optional[str] = None
    brand_name: Optional[str] = None
    attributes: List[ProductAttributeResponse] = []
    stock_reserved: int = 0
    stock_net: int = 0  # aggregated from children
    children: List[ProductChildResponse] = []
    single_sized: bool = False  # true when exactly one child with size_value == SINGLE_SIZE_VALUE
    avg_rating: Optional[float] = None
    rating_count: int = 0

    class Config:
        from_attributes = True
