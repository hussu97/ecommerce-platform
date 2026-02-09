from pydantic import BaseModel, Field
from typing import Optional, List

SINGLE_SIZE_VALUE = "single_size"


class ProductChildCreate(BaseModel):
    size_value: str = Field(..., max_length=64)
    barcode: Optional[str] = Field(None, max_length=128)
    stock_quantity: int = Field(0, ge=0)


class ProductChildUpdate(BaseModel):
    barcode: Optional[str] = Field(None, max_length=128)
    size_value: Optional[str] = Field(None, max_length=64)
    stock_quantity: Optional[int] = Field(None, ge=0)


class ProductChildResponse(BaseModel):
    id: int
    product_id: str
    code: str
    barcode: Optional[str] = None
    size_value: str
    stock_quantity: int = 0
    stock_reserved: int = 0
    stock_net: int = 0

    class Config:
        from_attributes = True


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
    translations: Optional[dict[str, ProductTranslationInput]] = None
    # At least one child required. Single-size: set is_single_size=True and single_size_barcode (optional stock).
    is_single_size: bool = Field(False, description="If True, create one child with size_value single_size")
    single_size_barcode: Optional[str] = Field(None, max_length=128)
    single_size_stock: int = Field(0, ge=0)
    # Multi-size: list of children (size_value, barcode, stock_quantity). Used when is_single_size=False.
    children: List[ProductChildCreate] = Field(default_factory=list)


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
    code: Optional[str] = None
    category_path: Optional[str] = None
    brand_name: Optional[str] = None
    attributes: List[ProductAttributeResponse] = []
    children: List[ProductChildResponse] = []

    class Config:
        from_attributes = True
