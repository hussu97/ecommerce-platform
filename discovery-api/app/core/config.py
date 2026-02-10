"""Discovery API configuration."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings. Loads from environment and from .env in the current working directory."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "Discovery API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./discovery.db"
    DB_CONNECT_TIMEOUT: int = 30

    # SerpApi (Google Shopping, Google Trends)
    SERPAPI_API_KEY: Optional[str] = None
    # RapidAPI (AliExpress True API v2.1.0 – /hot-products)
    RAPIDAPI_KEY: Optional[str] = None
    RAPIDAPI_ALIEXPRESS_HOST: str = "aliexpress-true-api.p.rapidapi.com"
    DISCOVERY_ALIEXPRESS_SHIP_COUNTRY: str = "AE"  # UAE
    DISCOVERY_ALIEXPRESS_LANGUAGE: str = "EN"

    # Discovery filters and query source (Phase 1: static/category-based lists preferred)
    DISCOVERY_MAX_ASP_AED: float = 500.0
    DISCOVERY_QUERY_LIST: Optional[str] = None  # comma-separated or path to file (one query per line)
    DISCOVERY_TRENDS_GEO: str = "ae"
    DISCOVERY_QUERY_SOURCE: str = "static"  # "static" = use QUERY_LIST/file/default; "trending" = Google Trends (for manual research)

    # USD to AED for AliExpress (approximate)
    USD_TO_AED: float = 3.67

    # Phase 2: Amazon best-seller (SellerMagnet)
    SELLERMAGNET_API_KEY: Optional[str] = None
    AMAZON_MARKETPLACE_ID: str = "ATVPDKIKX0DER"  # US
    AMAZON_CATEGORY_IDS: Optional[str] = None  # comma-separated, e.g. 12419321031
    AMAZON_DOMAIN: str = "amazon.com"  # for product URL (amazon.ae, amazon.com, etc.)

    # Phase 2: Reddit as query source (optional)
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    REDDIT_SUBREDDITS: str = "BuyItForLife,Frugal,GiftIdeas"  # comma-separated

    # Phase 2: TokInsight TikTok (optional query source; get key from tokinsight.com or RapidAPI)
    TOKINSIGHT_API_KEY: Optional[str] = None
    RAPIDAPI_TOKINSIGHT_HOST: Optional[str] = None  # if using via RapidAPI

settings = Settings()
