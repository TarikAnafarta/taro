"""Client to communicate with the AI Gateway service on Node 1."""

from __future__ import annotations

from typing import Any, AsyncIterator
import httpx

from taro_common.logging import get_logger
from taro_api.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class AIClient:
    """HTTP client wrapper for the Node 1 AI Gateway service."""

    def __init__(self, base_url: str | None = None) -> None:
        """Initialize the client."""
        self.base_url = (base_url or settings.NODE1_AI_GATEWAY_URL).rstrip("/")
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=None)
        logger.info("ai_client_initialised", base_url=self.base_url)

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Request a chat completion from the AI Gateway."""
        payload = {
            "messages": messages,
            "model": model or settings.TARO_CHAT_MODEL,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        response = await self.client.post("/v1/chat/completions", json=payload)
        response.raise_for_status()
        return response.json()

    async def chat_completion_stream(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncIterator[bytes]:
        """Stream chunks of chat completion response from the AI Gateway."""
        payload = {
            "messages": messages,
            "model": model or settings.TARO_CHAT_MODEL,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        async with self.client.stream("POST", "/v1/chat/completions/stream", json=payload) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes():
                yield chunk

    async def generate_embedding(self, text: str | list[str], model: str | None = None) -> list[list[float]]:
        """Request text embedding vector generation from the AI Gateway."""
        payload = {
            "input": text,
            "model": model or settings.TARO_EMBEDDING_MODEL,
        }
        response = await self.client.post("/v1/embeddings", json=payload)
        response.raise_for_status()
        data = response.json()
        return [item["embedding"] for item in data.get("data", [])]

    async def health_check(self) -> dict[str, Any]:
        """Verify the health status of the AI Gateway."""
        try:
            response = await self.client.get("/health", timeout=5.0)
            if response.status_code == 200:
                return response.json()
            return {"status": "unhealthy", "error": f"HTTP status {response.status_code}"}
        except Exception as exc:
            return {"status": "unhealthy", "error": str(exc)}

    async def close(self) -> None:
        """Close connection pools."""
        await self.client.aclose()
