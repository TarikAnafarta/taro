"""AI Gateway configuration.

Extends :class:`TaroSettings` with gateway-specific knobs.
"""

from functools import lru_cache

from taro_common.config import TaroSettings


class AIGatewaySettings(TaroSettings):
    """Settings for the AI Gateway service.

    Inherits all base Taro settings and adds gateway-specific values.
    """

    # Ollama connection
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_TIMEOUT: int = 120  # seconds

    # Qdrant connection
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_TIMEOUT: int = 30

    # Embedding defaults
    EMBEDDING_VECTOR_SIZE: int = 768  # nomic-embed-text dimension
    DEFAULT_COLLECTION: str = "taro_memory"

    # Service binding
    HOST: str = "0.0.0.0"
    PORT: int = 8100


@lru_cache
def get_settings() -> AIGatewaySettings:
    """Return cached settings instance."""
    return AIGatewaySettings()
