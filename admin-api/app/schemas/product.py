from pydantic import BaseModel, Field
from typing import Optional, List


class ProductBase(BaseModel):
    name: str = Field(..., max_length=500)
    description: Optional[str] = Field(None, max_length=5000)
    price: float = Field(..., ge=0)
    stock_quantity: int = Field(0, ge=0)
    image_url: Optional[str] = Field(None, max_length=2000)
    category_id: Optional[int] = Field(None, ge=0)
    brand_id: Optional[int] = Field(None, ge=0)
    is_active: bool = True


class ProductTranslationInput(BaseModel):
    name: str = Field(..., max_length=500)
    description: Optional[str] = Field(None, max_length=5000)


class ProductCreate(ProductBase):
    attribute_option_ids: List[int] = Field(default_factory=list)
    translations: Optional[dict[str, ProductTranslationInput]] = None  # {"ar": {...}, "zh": {...}}


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=5000)
    price: Optional[float] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = Field(None, max_length=2000)
    category_id: Optional[int] = Field(None, ge=0)
    brand_id: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    attribute_option_ids: Optional[List[int]] = None
    translations: Optional[dict[str, ProductTranslationInput]] = None


# For response - attribute name -> selected option value
class ProductAttributeResponse(BaseModel):
    attribute_name: str
    value: str


class ProductResponse(ProductBase):
    id: str
    category_path: Optional[str] = None
    brand_name: Optional[str] = None
    attributes: List[ProductAttributeResponse] = []

    class Config:
        from_attributes = True
