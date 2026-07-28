"""
Async database engine and session factory for the ML service.

Uses SQLAlchemy 2.x async API with aiomysql driver.
Tables are created and migrated by the Node.js backend — this service only reads/writes.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings

_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def _build_dsn() -> str:
    settings = get_settings()
    return (
        f"mysql+aiomysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )


async def init_db() -> bool:
    """
    Initialize the async engine and session factory.
    Returns True on success, False if the database is unreachable.
    The ML service continues operating without DB if this fails.
    """
    global _engine, _async_session_factory

    try:
        dsn = _build_dsn()
        _engine = create_async_engine(
            dsn,
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600,  # Prevents stale connections when DB closes idle connections
            pool_pre_ping=True,  # Tests connection health before using it from the pool
            echo=False,
        )

        # Verify connectivity
        async with _engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))

        _async_session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        print("✅ Database connection established.")
        return True

    except Exception as e:
        print(f"⚠️  Database unavailable — inference will still work, but results won't be persisted. Error: {e}")
        _engine = None
        _async_session_factory = None
        return False


async def close_db() -> None:
    """Dispose the async engine on shutdown."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        print("👋 Database connection closed.")


def get_session_factory() -> async_sessionmaker[AsyncSession] | None:
    """Returns the session factory, or None if DB is not available."""
    return _async_session_factory


async def get_db_session() -> AsyncSession:  # type: ignore[return]
    """
    FastAPI dependency that yields an AsyncSession per request.
    
    This implements the async SQLAlchemy transaction pattern. The `async with`
    context manager ensures that the session is properly closed and returned 
    to the connection pool after the request completes, preventing connection leaks.
    It automatically commits on success or rolls back on exception.
    """
    factory = get_session_factory()
    if factory is None:
        # Should never happen — lifespan aborts if DB is unavailable
        raise RuntimeError("Database session factory is not initialized.")

    async with factory() as session:
        yield session
