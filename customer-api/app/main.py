from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging_config import setup_structlog
from app.core.middleware.security import (
    get_https_redirect_middleware,
    SecurityHeadersMiddleware,
    RequestIdMiddleware,
)
from app.core.middleware.logging_middleware import StructuredLoggingMiddleware
from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base
from app.models import (
    user, product, order, cart, taxonomy, stock_reservation, brand,
    taxonomy_attribute, product_attribute_value, language, product_translation,
    taxonomy_translation, brand_translation, taxonomy_attribute_translation,
    ui_string, visitor_preference, product_review, customer_address, audit_log,
)
from app.api.endpoints import auth, users, products, orders, cart as cart_endpoints, taxonomy as taxonomy_endpoints, brands as brands_endpoints, taxonomy_attributes as taxonomy_attributes_endpoints, i18n as i18n_endpoints, addresses as addresses_endpoints

OPENAPI_TAGS = [
    {"name": "Authentication", "description": "Sign up, login, and token management."},
    {"name": "Users", "description": "User profile and account operations. Requires authentication."},
    {"name": "Addresses", "description": "Saved delivery addresses. Requires authentication."},
    {"name": "Products", "description": "Product catalog. Public read only."},
    {"name": "Orders", "description": "Order creation, payment intents, and user order history."},
    {"name": "Cart", "description": "Shopping cart. Works for guests (via X-Visitor-ID) and logged-in users (via Bearer token)."},
]

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Customer-facing E-commerce API: auth, products, cart, orders.",
    openapi_tags=OPENAPI_TAGS,
    debug=settings.DEBUG,
)

# Middleware order: last added runs first. HTTPS redirect -> CORS -> Security headers -> Request ID -> Logging
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware, csp=settings.SECURITY_HEADERS_CSP)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(get_https_redirect_middleware(settings.FORCE_HTTPS_REDIRECT))

# Include routers under /v1 (keep /health and / at root)
v1_prefix = "/v1"
app.include_router(auth.router, prefix=f"{v1_prefix}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{v1_prefix}/users", tags=["Users"])
app.include_router(products.router, prefix=f"{v1_prefix}/products", tags=["Products"])
app.include_router(taxonomy_endpoints.router, prefix=f"{v1_prefix}/taxonomies", tags=["Taxonomies"])
app.include_router(brands_endpoints.router, prefix=f"{v1_prefix}/brands", tags=["Brands"])
app.include_router(taxonomy_attributes_endpoints.router, prefix=f"{v1_prefix}/taxonomy-attributes", tags=["Taxonomy Attributes"])
app.include_router(i18n_endpoints.router, prefix=f"{v1_prefix}/i18n", tags=["i18n"])
app.include_router(addresses_endpoints.router, prefix=f"{v1_prefix}/addresses", tags=["Addresses"])
app.include_router(orders.router, prefix=f"{v1_prefix}/orders", tags=["Orders"])
app.include_router(cart_endpoints.router, prefix=f"{v1_prefix}/cart", tags=["Cart"])


@app.on_event("startup")
async def startup_event():
    """Create database tables and configure logging on startup"""
    setup_structlog()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health_check():
    """Health check endpoint with DB connectivity."""
    checks = {}
    db_ok = False
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    status = "healthy" if db_ok else "unhealthy"
    return {
        "status": status,
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": checks,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to the E-commerce API",
        "docs": "/docs"
    }
