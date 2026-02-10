from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.models import DiscoveredProduct, Strategy
from app.api.endpoints import products, strategies, runs

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Product discovery pipeline API.",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/v1/products", tags=["Products"])
app.include_router(strategies.router, prefix="/v1/strategies", tags=["Strategies"])
app.include_router(runs.router, prefix="/v1/runs", tags=["Runs"])


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
