from pydantic import BaseModel, Field
from typing import Optional


class WishlistAdd(BaseModel):
    product_slug: str = Field(..., max_length=255)


class WishlistMoveToCart(BaseModel):
    """child_code optional for single_size products; required for multi-size."""
    child_code: Optional[str] = Field(None, max_length=64)
