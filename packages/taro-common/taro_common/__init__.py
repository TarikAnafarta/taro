"""Taro Common — shared library for the Taro personal AI operating system.

Provides configuration, event definitions, NATS client, shared models,
and structured logging utilities used across all Taro services.
"""

from taro_common.config import TaroSettings
from taro_common.events import (
    AgentExecuteRequest,
    AgentExecuteResult,
    ChatMessageReceived,
    ChatResponseGenerated,
    MemoryStored,
    SystemHealthCheck,
    TaroEvent,
    TaskTriggered,
)
from taro_common.logging import get_logger, setup_logging
from taro_common.models import (
    AgentManifest,
    BriefingItem,
    InterestTopic,
    ServiceHealth,
    UserProfile,
)
from taro_common.nats_client import TaroNatsClient

__all__ = [
    "TaroSettings",
    "TaroEvent",
    "ChatMessageReceived",
    "ChatResponseGenerated",
    "AgentExecuteRequest",
    "AgentExecuteResult",
    "TaskTriggered",
    "MemoryStored",
    "SystemHealthCheck",
    "TaroNatsClient",
    "AgentManifest",
    "ServiceHealth",
    "UserProfile",
    "InterestTopic",
    "BriefingItem",
    "setup_logging",
    "get_logger",
]
