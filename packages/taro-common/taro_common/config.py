"""Centralized configuration for all Taro services.

Uses Pydantic Settings to load configuration from environment variables
with sensible defaults for local development.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class TaroSettings(BaseSettings):
    """Base settings shared across all Taro services.

    All values are loaded from environment variables. Defaults are provided
    for local development; production deployments should override via env
    or a `.env` file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Node hosts ──────────────────────────────────────────────────────
    NODE1_HOST: str = "localhost"
    NODE2_HOST: str = "localhost"

    # ── Node 1 service URLs (AI / inference) ────────────────────────────
    NODE1_AI_GATEWAY_URL: str = "http://localhost:8100"
    NODE1_OLLAMA_URL: str = "http://localhost:11434"
    NODE1_QDRANT_URL: str = "http://localhost:6333"

    # ── Node 2 service URLs (API / dashboard) ──────────────────────────
    NODE2_API_URL: str = "http://localhost:8200"
    NODE2_DASHBOARD_URL: str = "http://localhost:3000"

    # ── Infrastructure ─────────────────────────────────────────────────
    NATS_URL: str = "nats://localhost:4222"
    POSTGRES_URL: str = "postgresql+asyncpg://taro:taro@localhost:5432/taro"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── AI model defaults ──────────────────────────────────────────────
    TARO_CHAT_MODEL: str = "qwen2.5:3b"
    TARO_EMBEDDING_MODEL: str = "nomic-embed-text"

    # ── Authentication ─────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-string"
    JWT_EXPIRY_MINUTES: int = 60

    # ── Logging ────────────────────────────────────────────────────────
    LOG_LEVEL: str = "info"
