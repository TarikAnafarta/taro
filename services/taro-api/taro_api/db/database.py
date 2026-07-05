"""Database connection setup and helpers using SQLAlchemy asyncio."""

from __future__ import annotations

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from fastapi import HTTPException, status

from taro_api.config import get_settings

settings = get_settings()


def _create_engine(url: str):
    """URL tipine göre uygun SQLAlchemy engine oluştur."""
    if url.startswith("sqlite"):
        return create_async_engine(
            url,
            echo=False,
            connect_args={"check_same_thread": False},
        )
    else:
        return create_async_engine(
            url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,  # Bağlantı sağlığını kontrol et
            pool_recycle=3600,   # 1 saatte bir bağlantıları yenile
        )


engine = _create_engine(settings.POSTGRES_URL)

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
    try:
        async with SessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    except Exception as exc:
        # Veritabanı bağlantı hatası için anlaşılır mesaj
        error_msg = str(exc)
        if "connect" in error_msg.lower() or "connection" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Veritabanı bağlantısı kurulamadı. Lütfen sistem yöneticisine başvurun.",
            )
        raise


async def init_db() -> None:
    """Create all tables in the database.

    Useful for simple setups, though migrations should be used in production.
    """
    async with engine.begin() as conn:
        # Import models inside function to prevent circular imports
        from taro_api.db.models import Base as ModelsBase
        await conn.run_sync(ModelsBase.metadata.create_all)
