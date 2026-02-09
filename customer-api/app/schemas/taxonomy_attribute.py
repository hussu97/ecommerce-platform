from pydantic import BaseModel
from typing import List


class TaxonomyAttributeOptionResponse(BaseModel):
    id: int
    value: str
    sort_order: int = 0

    class Config:
        from_attributes = True


class TaxonomyAttributeResponse(BaseModel):
    id: int
    taxonomy_id: int
    name: str
    type_: str = "select"
    sort_order: int = 0
    options: List[TaxonomyAttributeOptionResponse] = []

    class Config:
        from_attributes = True
