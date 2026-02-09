from pydantic import BaseModel, Field
from typing import Optional, Dict


class BrandBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: Optional[str] = Field(None, max_length=255)  # auto from name if empty
    logo_url: Optional[str] = Field(None, max_length=2000)


class BrandTranslationInput(BaseModel):
    name: str = Field(..., max_length=255)


class BrandCreate(BrandBase):
    translations: Optional[Dict[str, BrandTranslationInput]] = None  # {"ar": {name: "..."}}


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=2000)
    translations: Optional[Dict[str, BrandTranslationInput]] = None


class BrandResponse(BrandBase):
    id: int

    class Config:
        from_attributes = True
