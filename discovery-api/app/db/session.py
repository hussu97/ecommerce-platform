import ssl as _ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

_db_url = settings.DATABASE_URL
_connect_args: dict = {}
if "sqlite" in _db_url:
    _connect_args["timeout"] = settings.DB_CONNECT_TIMEOUT
elif "postgresql" in _db_url:
    _connect_args["ssl"] = _ssl.create_default_context()
    _parsed = urlparse(_db_url)
    _qs = parse_qs(_parsed.query)
    _qs.pop("sslmode", None)
    _db_url = urlunparse(_parsed._replace(query=urlencode(_qs, doseq=True)))

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    future=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """Dependency for async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
