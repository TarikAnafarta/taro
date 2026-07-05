"""Taro Core API Service FastAPI application.

Mounts routers, manages connections to NATS, Redis, and PostgreSQL.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from taro_common.logging import setup_logging, get_logger
from taro_common.models import ServiceHealth, HealthStatus
from taro_common.nats_client import TaroNatsClient

from taro_api.config import get_settings
from taro_api.db.database import engine, init_db
from taro_api.routers import auth, onboarding, profile, briefing, agents, chat, system

logger = get_logger(__name__)

# ── Global client connections ──────────────────────────────────────────
nats_client: TaroNatsClient | None = None
redis_client: Redis | None = None
_start_time: float = 0.0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup and shutdown lifecycle manager."""
    global nats_client, redis_client, _start_time
    settings = get_settings()

    setup_logging("taro-api", settings.LOG_LEVEL)
    _start_time = time.time()

    # Create tables (simple SQLite / Postgres initialize fallback)
    try:
        await init_db()
        logger.info("database_tables_initialised")
    except Exception as exc:
        logger.error("database_tables_init_failed", error=str(exc))

    # Initialize Redis
    try:
        redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("redis_connected")
    except Exception as exc:
        logger.warning("redis_connection_failed_continuing_without", error=str(exc))

    # Initialize NATS
    nats_client = TaroNatsClient(url=settings.NATS_URL, service_name="taro-api")
    try:
        await nats_client.connect()
        logger.info("nats_connected")
    except Exception as exc:
        logger.warning("nats_connection_failed_continuing_without", error=str(exc))

    logger.info("taro_api_started", port=settings.API_PORT)
    yield

    # Shutdown
    if nats_client and nats_client.is_connected:
        await nats_client.disconnect()
    if redis_client:
        await redis_client.close()
    await engine.dispose()
    logger.info("taro_api_stopped")


# ── FastAPI Application ────────────────────────────────────────────────

app = FastAPI(
    title="Taro Core API",
    description="Backend services, user profiles, daily briefings, and agent registry",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for LAN accessibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount sub-routers under /api prefix
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(onboarding.router, prefix="/api", tags=["Onboarding"])
app.include_router(profile.router, prefix="/api", tags=["Profile"])
app.include_router(briefing.router, prefix="/api", tags=["Daily Briefing"])
app.include_router(agents.router, prefix="/api", tags=["Agent Registry"])
app.include_router(chat.router, prefix="/api", tags=["Conversational Chat"])
app.include_router(system.router, prefix="/api", tags=["System Control"])


@app.get("/health", tags=["System"])
async def health() -> ServiceHealth:
    """Core API service basic ping health endpoint."""
    return ServiceHealth(
        name="taro-api",
        status=HealthStatus.HEALTHY,
        latency_ms=round((time.time() - _start_time) * 1000, 2) if _start_time else 0.0,
    )
