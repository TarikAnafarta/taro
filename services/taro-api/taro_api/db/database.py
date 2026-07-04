"""Database connection setup and helpers using SQLAlchemy asyncio."""

from __future__ import annotations

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from taro_api.config import get_settings

settings = get_settings()

# Create SQLAlchemy Async Engine
engine = create_async_engine(
    settings.POSTGRES_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

# Async Session Factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to retrieve database session inside route handlers."""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables in the database.

    Useful for simple setups, though migrations should be used in production.
    """
    async with engine.begin() as conn:
        # Import models inside function to prevent circular imports
        from taro_api.db.models import Base as ModelsBase
        await conn.run_sync(ModelsBase.metadata.create_all)
