"""Discovery API configuration."""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    APP_NAME: str = "Discovery API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./discovery.db"
    DB_CONNECT_TIMEOUT: int = 30

    # SerpApi (Google Shopping, Google Trends)
    SERPAPI_API_KEY: Optional[str] = None
    # RapidAPI (AliExpress)
    RAPIDAPI_KEY: Optional[str] = None
    RAPIDAPI_ALIEXPRESS_HOST: Optional[str] = None

    # Discovery filters and query source
    DISCOVERY_MAX_ASP_AED: float = 500.0
    DISCOVERY_QUERY_LIST: Optional[str] = None  # comma-separated or path to file
    DISCOVERY_TRENDS_GEO: str = "ae"
    DISCOVERY_QUERY_SOURCE: str = "static"  # "static" | "trending"

    # USD to AED for AliExpress (approximate)
    USD_TO_AED: float = 3.67


settings = Settings()
