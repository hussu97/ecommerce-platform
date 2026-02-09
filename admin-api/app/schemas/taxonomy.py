from pydantic import BaseModel, Field
from typing import Dict, Optional


class TaxonomyTranslationInput(BaseModel):
    name: str = Field(..., max_length=255)


class TaxonomyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    section: Optional[str] = Field(None, max_length=100)
    sort_order: int = Field(0, ge=0)
    translations: Optional[Dict[str, TaxonomyTranslationInput]] = None


class TaxonomyUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    section: Optional[str] = Field(None, max_length=100)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    translations: Optional[Dict[str, TaxonomyTranslationInput]] = None


class TaxonomyResponse(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    section: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


# Taxonomy attributes (select type with options)
class OptionCreate(BaseModel):
    value: str = Field(..., max_length=255)


class OptionUpdate(BaseModel):
    value: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class AttributeCreate(BaseModel):
    taxonomy_id: int
    name: str = Field(..., max_length=255)
    sort_order: int = Field(0, ge=0)
    options: Optional[list[OptionCreate]] = None


class AttributeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class TaxonomyAttributeOptionResponse(BaseModel):
    id: int
    value: str
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class TaxonomyAttributeResponse(BaseModel):
    id: int
    taxonomy_id: int
    name: str
    type_: str = "select"
    sort_order: int = 0
    is_active: bool = True
    options: list["TaxonomyAttributeOptionResponse"] = []

    class Config:
        from_attributes = True


TaxonomyAttributeResponse.model_rebuild()
