"""Execution context provided to agents during execution."""

from __future__ import annotations

from typing import Any
from taro_common.nats_client import TaroNatsClient


class AgentContext:
    """Provides agents with access to LLM gateway, logs, config, and NATS."""

    def __init__(
        self,
        ai_client: Any,
        nats_client: TaroNatsClient,
        logger: Any,
        config: dict[str, Any],
    ) -> None:
        """Initialize the agent context."""
        self.ai = ai_client
        self.events = nats_client
        self.logger = logger
        self.config = config
