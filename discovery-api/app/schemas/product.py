from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DiscoveredProductResponse(BaseModel):
    id: int
    strategy_id: str
    brand: Optional[str] = None
    title: str
    image_url: Optional[str] = None
    source_url: str
    price: Optional[float] = None
    currency: Optional[str] = None
    delivers_to_uae: Optional[bool] = None
    discovered_at: datetime
    run_id: Optional[str] = None

    class Config:
        from_attributes = True


class StrategyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    enabled: bool

    class Config:
        from_attributes = True


class RunRequest(BaseModel):
    strategy_id: str  # "mock_trending" or "all"


class RunResponse(BaseModel):
    run_id: str
    count: int
