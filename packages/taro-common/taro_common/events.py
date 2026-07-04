"""Typed event definitions for NATS-based inter-service messaging.

Every message flowing through NATS is wrapped in a :class:`TaroEvent`
envelope that carries correlation IDs, timestamps, and the typed payload.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


# ── NATS subject constants ─────────────────────────────────────────────

class Subjects:
    """NATS subject hierarchy used across Taro services."""

    # Chat
    CHAT_MESSAGE_RECEIVED = "taro.chat.message.received"
    CHAT_RESPONSE_GENERATED = "taro.chat.response.generated"

    # Agent
    AGENT_EXECUTE_REQUEST = "taro.agent.execute.request"
    AGENT_EXECUTE_RESULT = "taro.agent.execute.result"

    # Task / scheduler
    TASK_TRIGGERED = "taro.task.triggered"

    # Memory
    MEMORY_STORED = "taro.memory.stored"

    # System
    SYSTEM_HEALTH_CHECK = "taro.system.health.check"
    SYSTEM_HEALTH_REPORT = "taro.system.health.report"


# ── Event type enum ────────────────────────────────────────────────────

class EventType(StrEnum):
    """Enumeration of all known Taro event types."""

    CHAT_MESSAGE_RECEIVED = "chat.message.received"
    CHAT_RESPONSE_GENERATED = "chat.response.generated"
    AGENT_EXECUTE_REQUEST = "agent.execute.request"
    AGENT_EXECUTE_RESULT = "agent.execute.result"
    TASK_TRIGGERED = "task.triggered"
    MEMORY_STORED = "memory.stored"
    SYSTEM_HEALTH_CHECK = "system.health.check"


# ── Base event envelope ────────────────────────────────────────────────

class TaroEvent(BaseModel):
    """Base envelope for every event published over NATS.

    Attributes:
        event_type: Discriminator tag for the payload.
        timestamp: UTC instant when the event was created.
        source: Originating service name.
        correlation_id: End-to-end request/trace identifier.
        payload: Arbitrary, event-specific data dictionary.
    """

    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = ""
    correlation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payload: dict[str, Any] = Field(default_factory=dict)


# ── Concrete event types ───────────────────────────────────────────────

class ChatMessageReceived(TaroEvent):
    """A new chat message from the user has arrived."""

    event_type: str = EventType.CHAT_MESSAGE_RECEIVED
    user_id: str = ""
    conversation_id: str = ""
    content: str = ""
    model: str = ""


class ChatResponseGenerated(TaroEvent):
    """The AI has produced a response to a chat message."""

    event_type: str = EventType.CHAT_RESPONSE_GENERATED
    user_id: str = ""
    conversation_id: str = ""
    content: str = ""
    model: str = ""
    tokens_used: int = 0


class AgentExecuteRequest(TaroEvent):
    """Request for an agent to execute a task."""

    event_type: str = EventType.AGENT_EXECUTE_REQUEST
    agent_id: str = ""
    task_id: str = ""
    params: dict[str, Any] = Field(default_factory=dict)


class AgentExecuteResult(TaroEvent):
    """Result produced by an agent execution."""

    event_type: str = EventType.AGENT_EXECUTE_RESULT
    agent_id: str = ""
    task_id: str = ""
    status: str = "completed"  # completed | failed
    result: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    duration_ms: int = 0


class TaskTriggered(TaroEvent):
    """The scheduler has fired a task trigger."""

    event_type: str = EventType.TASK_TRIGGERED
    task_id: str = ""
    task_name: str = ""
    agent_id: str = ""
    schedule_type: str = ""  # cron | interval | once


class MemoryStored(TaroEvent):
    """A piece of information has been stored in long-term memory."""

    event_type: str = EventType.MEMORY_STORED
    collection: str = ""
    document_id: str = ""
    text_preview: str = ""


class SystemHealthCheck(TaroEvent):
    """Periodic system-wide health check request or report."""

    event_type: str = EventType.SYSTEM_HEALTH_CHECK
    services: dict[str, Any] = Field(default_factory=dict)
