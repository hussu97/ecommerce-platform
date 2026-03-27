import ssl as _ssl

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.db.base import Base

_connect_args: dict = {}
if "sqlite" in settings.DATABASE_URL:
    _connect_args["timeout"] = getattr(settings, "DB_CONNECT_TIMEOUT", 30)
elif "postgresql" in settings.DATABASE_URL:
    _connect_args["ssl"] = _ssl.create_default_context()

engine = create_async_engine(
    settings.DATABASE_URL,
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
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
