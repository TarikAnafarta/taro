"""System monitoring and health router endpoints."""

from __future__ import annotations

import time
from typing import List, Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from taro_api.db.database import get_db
from taro_api.auth.security import get_current_user
from taro_api.services.ai_client import AIClient
from taro_api.config import get_settings
import taro_api.main as app_state

router = APIRouter()

_settings = get_settings()


class ServiceHealthResponse(BaseModel):
    """Status details for an individual service dependency."""
    name: str
    status: str
    latency_ms: Optional[float] = None
    details: Optional[dict[str, Any]] = None


class SystemHealthResponse(BaseModel):
    """Aggregate health status of core services."""
    status: str
    services: List[ServiceHealthResponse]


class NodeStatusResponse(BaseModel):
    """Health indicator of a cluster node."""
    node_id: str
    host: str
    services: List[ServiceHealthResponse]


class SystemInfoResponse(BaseModel):
    """System metadata and statistics."""
    version: str
    uptime: str
    active_models: List[str] = []


@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    db: AsyncSession = Depends(get_db),
) -> SystemHealthResponse:
    """Check health of all dependencies (DB, Redis, NATS, AI Gateway)."""
    services = []

    # 1. PostgreSQL kontrolü
    db_start = time.time()
    try:
        await db.execute(select(1))
        services.append(
            ServiceHealthResponse(
                name="postgres",
                status="healthy",
                latency_ms=round((time.time() - db_start) * 1000, 2),
            )
        )
    except Exception as exc:
        services.append(
            ServiceHealthResponse(
                name="postgres",
                status="unhealthy",
                details={"error": str(exc)},
            )
        )

    # 2. Redis kontrolü
    if app_state.redis_client:
        redis_start = time.time()
        try:
            await app_state.redis_client.ping()
            services.append(
                ServiceHealthResponse(
                    name="redis",
                    status="healthy",
                    latency_ms=round((time.time() - redis_start) * 1000, 2),
                )
            )
        except Exception as exc:
            services.append(
                ServiceHealthResponse(
                    name="redis",
                    status="unhealthy",
                    details={"error": str(exc)},
                )
            )
    else:
        services.append(
            ServiceHealthResponse(
                name="redis",
                status="unhealthy",
                details={"error": "Redis bağlantısı başlatılamadı"},
            )
        )

    # 3. NATS kontrolü
    if app_state.nats_client and app_state.nats_client.is_connected:
        services.append(ServiceHealthResponse(name="nats", status="healthy"))
    else:
        services.append(
            ServiceHealthResponse(
                name="nats",
                status="unhealthy",
                details={"error": "NATS bağlantısı yok"},
            )
        )

    # 4. AI Gateway kontrolü (bağlanamazsa graceful degraded)
    ai = AIClient()
    ai_health = await ai.health_check()
    services.append(
        ServiceHealthResponse(
            name="ai-gateway",
            status=ai_health.get("status", "unhealthy"),
            details=ai_health,
        )
    )

    unhealthy = any(s.status == "unhealthy" for s in services)
    overall_status = "degraded" if unhealthy else "healthy"

    return SystemHealthResponse(status=overall_status, services=services)


@router.get("/system/nodes", response_model=List[NodeStatusResponse])
async def get_node_statuses(
    db: AsyncSession = Depends(get_db),
) -> List[NodeStatusResponse]:
    """Retrieve node-level stats for both LAN machines."""
    # DÜZELTME: nats_client.settings yok — config'den al
    node1_host = _settings.NODE1_HOST
    node2_host = _settings.NODE2_HOST

    # AI Gateway sağlık kontrolü
    ai = AIClient()
    ai_health = await ai.health_check()
    ollama_details = ai_health.get("details", {}).get("ollama", "bağlantı yok")

    node1_services = [
        ServiceHealthResponse(
            name="ai-gateway",
            status=ai_health.get("status", "unhealthy"),
            details=ai_health,
        ),
        ServiceHealthResponse(
            name="ollama",
            status="healthy" if "ok" in str(ollama_details) else "unhealthy",
            details={"models": str(ollama_details)},
        ),
        ServiceHealthResponse(
            name="qdrant",
            status="healthy" if ai_health.get("details", {}).get("qdrant") != "error" else "unhealthy",
        ),
    ]

    # Node 2 servisler
    health_agg = await get_system_health(db)
    node2_services = [
        s for s in health_agg.services if s.name in ("postgres", "redis", "nats")
    ]
    node2_services.append(ServiceHealthResponse(name="taro-api", status="healthy"))
    node2_services.append(ServiceHealthResponse(name="dashboard", status="healthy"))

    return [
        NodeStatusResponse(
            node_id="node1-ai-compute",
            host=node1_host,
            services=node1_services,
        ),
        NodeStatusResponse(
            node_id="node2-core-services",
            host=node2_host,
            services=node2_services,
        ),
    ]


@router.get("/system/info", response_model=SystemInfoResponse)
async def get_system_info() -> SystemInfoResponse:
    """Retrieve general details and active models list."""
    uptime_sec = int(time.time() - app_state._start_time) if app_state._start_time else 0
    days, remainder = divmod(uptime_sec, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime_str = f"{days}g {hours}s {minutes}d {seconds}sn"

    active_models: List[str] = []
    ai = AIClient()
    try:
        gw_health = await ai.health_check()
        if gw_health.get("status") == "healthy":
            active_models = [_settings.TARO_CHAT_MODEL, _settings.TARO_EMBEDDING_MODEL]
    except Exception:
        pass

    return SystemInfoResponse(
        version="0.1.0",
        uptime=uptime_str,
        active_models=active_models,
    )
