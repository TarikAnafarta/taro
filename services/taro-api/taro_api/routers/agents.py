"""Agent registry and execution router endpoints."""

from __future__ import annotations

from typing import List, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from taro_api.db.database import get_db
from taro_api.db.models import User, Agent
from taro_api.auth.security import get_current_user
from taro_api.main import nats_client

router = APIRouter()


class AgentModel(BaseModel):
    """Declarative Agent schema model."""
    id: str
    name: str
    description: Optional[str] = None
    version: Optional[str] = None
    capabilities: List[str] = []
    status: str
    last_executed_at: Optional[str] = None


@router.get("/agents", response_model=List[AgentModel])
async def list_agents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AgentModel]:
    """Retrieve list of all registered agents."""
    res = await db.execute(select(Agent))
    agents = res.scalars().all()
    
    # If no agents, register a default mock system health agent so the list is not empty
    if not agents:
        system_agent = Agent(
            name="system-health",
            description="Built-in agent that monitors system status and network latencies.",
            version="0.1.0",
            capabilities=["monitoring", "health-checks"],
            status="active",
        )
        db.add(system_agent)
        await db.commit()
        
        res = await db.execute(select(Agent))
        agents = res.scalars().all()

    return [
        AgentModel(
            id=a.id,
            name=a.name,
            description=a.description,
            version=a.version,
            capabilities=a.capabilities,
            status=a.status,
            last_executed_at=a.last_executed_at.isoformat() if a.last_executed_at else None,
        )
        for a in agents
    ]


@router.get("/agents/{agent_id}", response_model=AgentModel)
async def get_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentModel:
    """Retrieve details of a specific agent."""
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return AgentModel(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        version=agent.version,
        capabilities=agent.capabilities,
        status=agent.status,
        last_executed_at=agent.last_executed_at.isoformat() if agent.last_executed_at else None,
    )


@router.post("/agents/{agent_id}/execute")
async def execute_agent(
    agent_id: str,
    params: Optional[dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Trigger agent execution by sending an execution request event over NATS."""
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update last executed timestamp
    agent.last_executed_at = datetime.utcnow()
    await db.commit()

    # Publish NATS execute event if NATS client is active
    if nats_client and nats_client.is_connected:
        from taro_common.events import AgentExecuteRequest, Subjects
        event = AgentExecuteRequest(
            source="taro-api",
            agent_id=agent.id,
            config=params or {},
        )
        try:
            await nats_client.publish_event(
                f"{Subjects.AGENT_EXECUTE}.{agent.name}", event
            )
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to publish execution event to NATS: {exc}",
            ) from exc
        return {"status": "triggered", "message": f"Execution request sent for agent {agent.name}"}

    # Fallback response if NATS not connected
    return {
        "status": "mocked",
        "message": f"NATS not connected. Simulating execution triggers for {agent.name}.",
    }
