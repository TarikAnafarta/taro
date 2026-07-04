"""Qdrant client service interface.

Handles interaction with the vector database.
"""

from __future__ import annotations

import uuid
from typing import Any
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter

from taro_common.logging import get_logger
from taro_common.models import MemorySearchResult

logger = get_logger(__name__)


class QdrantService:
    """Service wrapper for interacting with the Qdrant vector database."""

    def __init__(self, url: str, timeout: int, default_vector_size: int) -> None:
        """Initialize the Qdrant client."""
        self.url = url
        self.timeout = timeout
        self.default_vector_size = default_vector_size
        self.client = AsyncQdrantClient(url=self.url, timeout=self.timeout)
        logger.info(
            "qdrant_service_initialised",
            url=self.url,
            default_vector_size=default_vector_size,
        )

    async def ensure_collection(self, name: str, vector_size: int | None = None) -> None:
        """Ensure a Qdrant collection exists, creating it if necessary."""
        size = vector_size or self.default_vector_size
        try:
            exists = await self.client.collection_exists(collection_name=name)
            if not exists:
                logger.info("creating_qdrant_collection", name=name, size=size)
                await self.client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=size, distance=Distance.COSINE),
                )
        except Exception as exc:
            logger.error("ensure_collection_failed", collection=name, error=str(exc))
            raise

    async def store_memory(
        self,
        collection: str,
        text: str,
        embedding: list[float],
        metadata: dict[str, Any],
    ) -> str:
        """Upsert a text chunk and its embedding to Qdrant."""
        point_id = str(uuid.uuid4())
        payload = {**metadata, "text": text}

        point = PointStruct(
            id=point_id,
            vector=embedding,
            payload=payload,
        )

        await self.client.upsert(
            collection_name=collection,
            wait=True,
            points=[point],
        )
        logger.debug("stored_vector_point", id=point_id, collection=collection)
        return point_id

    async def search_memory(
        self,
        collection: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> list[MemorySearchResult]:
        """Query Qdrant for similar vectors and return results."""
        qdrant_filter = None
        if filters:
            from qdrant_client.models import FieldCondition, MatchValue
            conditions = []
            for k, v in filters.items():
                conditions.append(FieldCondition(key=k, match=MatchValue(value=v)))
            if conditions:
                qdrant_filter = Filter(must=conditions)

        search_results = await self.client.search(
            collection_name=collection,
            query_vector=query_embedding,
            query_filter=qdrant_filter,
            limit=limit,
        )

        results = []
        for item in search_results:
            payload = item.payload or {}
            text = payload.get("text", "")
            # Return metadata minus the text
            meta = {k: v for k, v in payload.items() if k != "text"}
            results.append(
                MemorySearchResult(
                    id=str(item.id),
                    text=text,
                    score=item.score,
                    metadata=meta,
                )
            )
        return results

    async def delete_memory(self, collection: str, memory_id: str) -> None:
        """Delete a vector point from Qdrant by its UUID."""
        # Qdrant delete takes Selector
        from qdrant_client.models import PointIdsList
        await self.client.delete(
            collection_name=collection,
            points_selector=PointIdsList(points=[memory_id]),
        )
        logger.info("deleted_vector_point", id=memory_id, collection=collection)

    async def list_collections(self) -> list[dict[str, Any]]:
        """List all collections and fetch status and count."""
        response = await self.client.get_collections()
        collections_info = []
        for col in response.collections:
            try:
                details = await self.client.get_collection(collection_name=col.name)
                collections_info.append(
                    {
                        "name": col.name,
                        "vectors_count": details.vectors_count or 0,
                        "status": str(details.status),
                    }
                )
            except Exception as exc:
                logger.error("failed_to_fetch_collection_details", name=col.name, error=str(exc))
                collections_info.append(
                    {
                        "name": col.name,
                        "vectors_count": 0,
                        "status": "error",
                    }
                )
        return collections_info

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        # AsyncQdrantClient doesn't require explicit close but we close its underlying REST client if possible
        # Actually it doesn't always have a close() method, but we can call:
        try:
            if hasattr(self.client, "close"):
                await self.client.close()
        except Exception:
            pass
        logger.info("qdrant_service_closed")
