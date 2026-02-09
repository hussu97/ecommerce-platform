from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# SQLite: busy timeout; PostgreSQL: set connection_timeout/command_timeout in connect_args when using asyncpg
_connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    _connect_args["timeout"] = settings.DB_CONNECT_TIMEOUT

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args=_connect_args if _connect_args else {},
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
