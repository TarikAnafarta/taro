"""Discovers and instantiates available agents in the runtime environment."""

from __future__ import annotations

from typing import Dict
from taro_common.logging import get_logger

from agent_runtime.base_agent import BaseAgent
from agent_runtime.built_in.system_agent import SystemAgent

logger = get_logger(__name__)


class AgentLoader:
    """Discovers agents on local disk or built-in modules."""

    def __init__(self) -> None:
        """Initialize loader."""
        self.agents: Dict[str, BaseAgent] = {}

    def discover_agents(self) -> Dict[str, BaseAgent]:
        """Scan and register built-in agents."""
        logger.info("discovering_agents")
        # For Phase 1, we register the built-in system agent
        sys_agent = SystemAgent()
        self.agents[sys_agent.manifest.name] = sys_agent
        logger.info("agent_discovered", name=sys_agent.manifest.name)
        return self.agents
