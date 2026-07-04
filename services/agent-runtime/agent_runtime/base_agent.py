"""Abstract base class interface that all Taro Agents implement."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel

from taro_common.models import AgentManifest


class AgentResult(BaseModel):
    """The result model returned by an agent execution."""
    success: bool
    data: dict[str, Any] = {}
    message: str = ""


class BaseAgent(ABC):
    """Abstract Base Class for all Taro Agents."""

    @property
    @abstractmethod
    def manifest(self) -> AgentManifest:
        """Declarative agent metadata (name, version, configs)."""
        pass

    @abstractmethod
    async def execute(self, context: Any) -> AgentResult:
        """Run the primary agent execution logic."""
        pass

    async def on_event(self, event: Any) -> None:
        """Optional hook to react to NATS pub-sub events."""
        pass
