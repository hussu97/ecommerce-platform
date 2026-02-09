"""Product listing with embedded filters and counts."""
from pydantic import BaseModel
from typing import List, Optional


class FilterOptionWithCount(BaseModel):
    id: int
    value: str
    count: int


class FilterAttribute(BaseModel):
    id: int
    name: str
    options: List[FilterOptionWithCount]


class FilterCategory(BaseModel):
    id: int
    name: str
    slug: Optional[str]
    count: int


class FilterBrand(BaseModel):
    id: int
    name: str
    slug: str
    count: int


class ProductListFilters(BaseModel):
    categories: List[FilterCategory] = []
    brands: List[FilterBrand] = []
    attributes: List[FilterAttribute] = []


class ProductListResponse(BaseModel):
    products: List[dict]  # ProductResponse dicts
    filters: ProductListFilters
