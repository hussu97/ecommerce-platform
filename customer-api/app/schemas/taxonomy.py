from pydantic import BaseModel
from typing import Optional


class TaxonomyBase(BaseModel):
    name: str
    section: Optional[str] = None
    sort_order: int = 0


class TaxonomyResponse(TaxonomyBase):
    id: int
    slug: Optional[str] = None

    class Config:
        from_attributes = True
