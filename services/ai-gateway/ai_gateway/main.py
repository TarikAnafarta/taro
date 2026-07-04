"""AI Gateway FastAPI application entry point.

Handles startup/shutdown lifecycle (NATS connection, service clients)
and mounts all routers.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from taro_common.logging import setup_logging, get_logger
from taro_common.models import ServiceHealth, HealthStatus
from taro_common.nats_client import TaroNatsClient

from ai_gateway.config import get_settings
from ai_gateway.routers import chat, embeddings, memory
from ai_gateway.services.ollama_service import OllamaService
from ai_gateway.services.qdrant_service import QdrantService

logger = get_logger(__name__)

# ── Shared state ───────────────────────────────────────────────────────
nats_client: TaroNatsClient | None = None
ollama_service: OllamaService | None = None
qdrant_service: QdrantService | None = None
_start_time: float = 0.0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage startup and shutdown of shared resources."""
    global nats_client, ollama_service, qdrant_service, _start_time
    settings = get_settings()

    setup_logging("ai-gateway", settings.LOG_LEVEL)
    _start_time = time.time()

    # Initialise Ollama client
    ollama_service = OllamaService(
        base_url=settings.OLLAMA_URL,
        timeout=settings.OLLAMA_TIMEOUT,
        default_chat_model=settings.TARO_CHAT_MODEL,
        default_embedding_model=settings.TARO_EMBEDDING_MODEL,
    )

    # Initialise Qdrant client
    qdrant_service = QdrantService(
        url=settings.QDRANT_URL,
        timeout=settings.QDRANT_TIMEOUT,
        default_vector_size=settings.EMBEDDING_VECTOR_SIZE,
    )

    # Connect to NATS (best-effort — gateway works without it)
    nats_client = TaroNatsClient(url=settings.NATS_URL, service_name="ai-gateway")
    try:
        await nats_client.connect()
    except Exception:
        logger.warning("nats_not_available_continuing_without")

    logger.info("ai_gateway_started", port=settings.PORT)
    yield

    # Shutdown
    if nats_client and nats_client.is_connected:
        await nats_client.disconnect()
    if ollama_service:
        await ollama_service.close()
    if qdrant_service:
        await qdrant_service.close()
    logger.info("ai_gateway_stopped")


# ── FastAPI application ────────────────────────────────────────────────

app = FastAPI(
    title="Taro AI Gateway",
    description="Unified API for LLM inference, embeddings, and vector memory",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for LAN usage
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(chat.router, prefix="/v1", tags=["Chat"])
app.include_router(embeddings.router, prefix="/v1", tags=["Embeddings"])
app.include_router(memory.router, prefix="/v1", tags=["Memory"])


@app.get("/health", tags=["System"])
async def health() -> ServiceHealth:
    """Return the health status of the AI Gateway and its dependencies."""
    details: dict[str, str] = {}

    # Check Ollama
    if ollama_service:
        try:
            models = await ollama_service.list_models()
            details["ollama"] = f"ok ({len(models)} models)"
        except Exception as exc:
            details["ollama"] = f"error: {exc}"
    else:
        details["ollama"] = "not initialised"

    # Check NATS
    if nats_client and nats_client.is_connected:
        details["nats"] = "connected"
    else:
        details["nats"] = "disconnected"

    # Determine overall status
    has_ollama = "ok" in details.get("ollama", "")
    status = HealthStatus.HEALTHY if has_ollama else HealthStatus.DEGRADED

    return ServiceHealth(
        name="ai-gateway",
        status=status,
        latency_ms=round((time.time() - _start_time) * 1000, 2) if _start_time else 0,
        details=details,
    )
