import ssl as _ssl

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

_connect_args: dict = {}
if "sqlite" in settings.DATABASE_URL:
    _connect_args["timeout"] = settings.DB_CONNECT_TIMEOUT
elif "postgresql" in settings.DATABASE_URL:
    # Neon and most cloud PostgreSQL providers require SSL
    _connect_args["ssl"] = _ssl.create_default_context()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args=_connect_args,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db():
    """Dependency for getting async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
