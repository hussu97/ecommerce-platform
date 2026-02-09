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
    user, product, product_child, order, taxonomy, stock_reservation, brand, taxonomy_attribute,
    product_attribute_value, language, product_translation, taxonomy_translation,
    brand_translation, taxonomy_attribute_translation, ui_string, visitor_preference,
    audit_log, product_bulk_upload,
)
from app.api.endpoints import auth, products, orders, taxonomy as taxonomy_endpoints, brands, taxonomy_attributes, i18n as i18n_endpoints

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Admin API for e-commerce: products, orders, taxonomies.",
    debug=settings.DEBUG,
)

app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware, csp=settings.SECURITY_HEADERS_CSP)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ADMIN_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(get_https_redirect_middleware(settings.FORCE_HTTPS_REDIRECT))

# Include routers under /v1 (keep /health and / at root)
v1_prefix = "/v1"
app.include_router(auth.router, prefix=f"{v1_prefix}/auth", tags=["Auth"])
app.include_router(products.router, prefix=f"{v1_prefix}/products", tags=["Products"])
app.include_router(orders.router, prefix=f"{v1_prefix}/orders", tags=["Orders"])
app.include_router(taxonomy_endpoints.router, prefix=f"{v1_prefix}/taxonomies", tags=["Taxonomies"])
app.include_router(brands.router, prefix=f"{v1_prefix}/brands", tags=["Brands"])
app.include_router(taxonomy_attributes.router, prefix=f"{v1_prefix}/taxonomy-attributes", tags=["Taxonomy Attributes"])
app.include_router(i18n_endpoints.router, prefix=f"{v1_prefix}/i18n", tags=["i18n"])


@app.on_event("startup")
async def startup_event():
    setup_structlog()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        if "already exists" not in str(e).lower():
            raise
        # Shared DB (e.g. Docker): customer-api or init may have created tables first


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
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": checks,
    }


@app.get("/")
async def root():
    return {"message": "Admin API", "docs": "/docs"}
