"""BFF configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    APP_NAME: str = "Customer BFF"
    APP_VERSION: str = "1.0.0"
    CUSTOMER_API_URL: str = "http://127.0.0.1:8000"
    RATE_LIMIT_PER_MIN: int = 100


settings = Settings()
