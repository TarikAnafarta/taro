"""Built-in system monitoring and health checking agent."""

from __future__ import annotations

from typing import Any
from taro_common.models import AgentManifest
from agent_runtime.base_agent import BaseAgent, AgentResult


class SystemAgent(BaseAgent):
    """Monitors Taro core nodes, reporting services online/offline status."""

    @property
    def manifest(self) -> AgentManifest:
        """Agent declarative metadata details."""
        return AgentManifest(
            name="system-health",
            description="Built-in monitoring agent checking cluster health",
            version="0.1.0",
            capabilities=["monitoring", "health-checks"],
            config={},
        )

    async def execute(self, context: Any) -> AgentResult:
        """Run system connectivity diagnostic checks."""
        context.logger.info("system_health_agent_started")
        
        # Test connection back to node1
        gateway_healthy = False
        try:
            res = await context.ai.health_check()
            gateway_healthy = res.get("status") == "healthy"
        except Exception:
            pass
            
        data = {
            "gateway_connected": gateway_healthy,
            "nats_connected": context.events.is_connected,
        }
        
        msg = "All core systems communicating." if gateway_healthy else "Node 1 Gateway unreachable."
        
        return AgentResult(
            success=gateway_healthy,
            data=data,
            message=msg,
        )
