from pydantic import BaseModel, computed_field
from typing import Optional, List


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
    """Schema for product response"""
    id: str
    slug: Optional[str] = None
    category_path: Optional[str] = None
    brand_name: Optional[str] = None
    attributes: List[ProductAttributeResponse] = []
    stock_reserved: int = 0
    avg_rating: Optional[float] = None
    rating_count: int = 0

    @computed_field
    @property
    def stock_net(self) -> int:
        """Available stock = gross - reserved."""
        return max(0, self.stock_quantity - (self.stock_reserved or 0))

    class Config:
        from_attributes = True
