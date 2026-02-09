from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "E-commerce API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./ecommerce.db"
    # For PostgreSQL, use: postgresql+asyncpg://user:password@localhost/dbname
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS (allow localhost and 127.0.0.1 - browsers treat these as different origins)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # Stripe
    STRIPE_SECRET_KEY: str = "sk_test_4eC39HqLyjWDarjtT1zdp7dc" # Placeholder test key
    
    # Security headers
    FORCE_HTTPS_REDIRECT: bool = False
    SECURITY_HEADERS_CSP: Optional[str] = None  # e.g. "default-src 'self'"

    # Product/parent-child code generation
    PARENT_CODE_PREFIX: str = "P-"
    PARENT_CODE_SUFFIX: str = ""
    CHILD_CODE_PREFIX: str = "C-"
    CHILD_CODE_SUFFIX: str = ""
    SINGLE_SIZE_VALUE: str = "single_size"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
