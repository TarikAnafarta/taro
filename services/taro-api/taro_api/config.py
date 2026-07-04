"""Core API configuration module.

Extends shared TaroSettings with API-specific configurations.
"""

from functools import lru_cache
from taro_common.config import TaroSettings


class ApiSettings(TaroSettings):
    """Configuration settings for the Core API service."""

    # API binding
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000


@lru_cache
def get_settings() -> ApiSettings:
    """Return a cached ApiSettings instance."""
    return ApiSettings()
