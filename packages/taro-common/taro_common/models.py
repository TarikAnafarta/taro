"""Shared Pydantic models used across multiple Taro services.

These models are *not* ORM models — they are pure data-transfer objects
for API requests/responses and inter-service communication.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────

class HealthStatus(StrEnum):
    """Possible service health states."""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


class GoalStatus(StrEnum):
    """Status values for learning / career goals."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"


# ── Agent ──────────────────────────────────────────────────────────────

class AgentManifest(BaseModel):
    """Declarative manifest describing an agent's identity and capabilities.

    Agents publish their manifest on registration so the runtime and UI
    can discover what they do and how to invoke them.
    """

    name: str
    description: str = ""
    version: str = "0.1.0"
    capabilities: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


# ── Service health ────────────────────────────────────────────────────

class ServiceHealth(BaseModel):
    """Health-check response returned by every Taro micro-service.

    Attributes:
        name: Canonical service name (e.g. ``ai-gateway``).
        status: Aggregate health status.
        latency_ms: Round-trip latency of the check in milliseconds.
        details: Optional free-form details (dependency statuses, etc.).
    """

    name: str
    status: HealthStatus = HealthStatus.HEALTHY
    latency_ms: float = 0.0
    details: dict[str, Any] = Field(default_factory=dict)


# ── User / Profile ────────────────────────────────────────────────────

class UserProfile(BaseModel):
    """Serialisable representation of a user's profile data."""

    display_name: str = ""
    preferred_language: str = "en"
    timezone: str = "UTC"
    country: str = ""
    occupation: str = ""
    professional_status: str = ""


class InterestTopic(BaseModel):
    """A topic the user has expressed interest in."""

    category: str
    topic: str
    is_custom: bool = False
    priority: int = 0


# ── Briefing ──────────────────────────────────────────────────────────

class BriefingItem(BaseModel):
    """A single item within a daily briefing."""

    category: str
    title: str
    summary: str = ""
    source_url: str | None = None
    source_name: str | None = None
    relevance_score: float = 0.0


# ── Chat ───────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """Single message in a chat conversation."""

    role: str  # "system" | "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    """Inbound chat-completion request."""

    messages: list[ChatMessage]
    model: str = ""
    temperature: float = 0.7
    max_tokens: int | None = None
    stream: bool = False
    conversation_id: str | None = None


class ChatChoice(BaseModel):
    """A single choice returned by the LLM."""

    index: int = 0
    message: ChatMessage
    finish_reason: str = "stop"


class ChatResponse(BaseModel):
    """Chat-completion response (OpenAI-compatible shape)."""

    id: str = ""
    model: str = ""
    choices: list[ChatChoice] = Field(default_factory=list)
    usage: dict[str, int] = Field(default_factory=dict)
    created: int = 0


# ── Embedding ──────────────────────────────────────────────────────────

class EmbeddingRequest(BaseModel):
    """Request to generate embeddings for one or more texts."""

    input: str | list[str]
    model: str = ""


class EmbeddingData(BaseModel):
    """A single embedding vector."""

    index: int = 0
    embedding: list[float] = Field(default_factory=list)
    object: str = "embedding"


class EmbeddingResponse(BaseModel):
    """Embedding generation response."""

    model: str = ""
    data: list[EmbeddingData] = Field(default_factory=list)
    usage: dict[str, int] = Field(default_factory=dict)


# ── Memory ─────────────────────────────────────────────────────────────

class MemoryStoreRequest(BaseModel):
    """Request to store a text chunk in vector memory."""

    collection: str = "default"
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemorySearchRequest(BaseModel):
    """Semantic search query against a memory collection."""

    collection: str = "default"
    query: str
    limit: int = 5
    filters: dict[str, Any] = Field(default_factory=dict)


class MemorySearchResult(BaseModel):
    """A single semantic search result."""

    id: str
    text: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)
