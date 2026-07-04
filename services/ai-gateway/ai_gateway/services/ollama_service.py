"""Ollama client service interface.

Provides wrapper functions for interaction with the Ollama local API.
"""

from __future__ import annotations

from typing import Any, AsyncIterator
import httpx

from taro_common.logging import get_logger

logger = get_logger(__name__)


class OllamaService:
    """Service wrapper for interacting with the local Ollama daemon."""

    def __init__(
        self,
        base_url: str,
        timeout: int,
        default_chat_model: str,
        default_embedding_model: str,
    ) -> None:
        """Initialize the Ollama client."""
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.default_chat_model = default_chat_model
        self.default_embedding_model = default_embedding_model
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)
        logger.info(
            "ollama_service_initialised",
            base_url=self.base_url,
            chat_model=default_chat_model,
            embed_model=default_embedding_model,
        )

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Send a chat completion request to Ollama."""
        model_name = model or self.default_chat_model
        payload: dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "stream": False,
        }

        options: dict[str, Any] = {}
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        if options:
            payload["options"] = options

        response = await self.client.post("/api/chat", json=payload)
        response.raise_for_status()
        return response.json()

    async def chat_completion_stream(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield SSE-friendly response chunks from a streaming chat request."""
        model_name = model or self.default_chat_model
        payload: dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "stream": True,
        }

        options: dict[str, Any] = {}
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        if options:
            payload["options"] = options

        async with self.client.stream("POST", "/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = response.json() if hasattr(response, "json") else httpx.Response(200, content=line).json()
                    # But line is a raw json string, so:
                    import json
                    chunk = json.loads(line)
                    yield chunk
                except Exception as exc:
                    logger.error("error_parsing_ollama_stream_line", line=line, error=str(exc))
                    raise

    async def generate_embedding(self, text: str, model: str | None = None) -> dict[str, Any]:
        """Generate vector embeddings for a given piece of text."""
        model_name = model or self.default_embedding_model
        payload = {
            "model": model_name,
            "prompt": text,
        }
        response = await self.client.post("/api/embeddings", json=payload)
        response.raise_for_status()
        return response.json()

    async def list_models(self) -> list[dict[str, Any]]:
        """List locally pulled models currently available on Ollama."""
        response = await self.client.get("/api/tags")
        response.raise_for_status()
        data = response.json()
        return data.get("models", [])

    async def close(self) -> None:
        """Close the underlying client connection pool."""
        await self.client.aclose()
        logger.info("ollama_service_closed")
