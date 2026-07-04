"""Vector memory endpoints — store, search, and manage embeddings in Qdrant."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from taro_common.logging import get_logger
from taro_common.models import MemoryStoreRequest, MemorySearchRequest, MemorySearchResult

from ai_gateway import main as app_state

logger = get_logger(__name__)
router = APIRouter()


class MemoryStoreResponse(BaseModel):
    """Response after storing a memory entry."""
    id: str
    collection: str
    status: str = "stored"


class CollectionInfo(BaseModel):
    """Information about a Qdrant collection."""
    name: str
    vectors_count: int = 0
    status: str = "ok"


@router.post("/memory/store", response_model=MemoryStoreResponse)
async def store_memory(request: MemoryStoreRequest) -> MemoryStoreResponse:
    """Store text with its embedding in a Qdrant collection.

    The text is first embedded via Ollama, then the vector and metadata
    are persisted in Qdrant.
    """
    ollama = app_state.ollama_service
    qdrant = app_state.qdrant_service
    if ollama is None or qdrant is None:
        raise HTTPException(status_code=503, detail="Required services not available")

    settings = app_state.get_settings()

    try:
        # Generate embedding
        result = await ollama.generate_embedding(
            text=request.text,
            model=settings.TARO_EMBEDDING_MODEL,
        )
        embedding = result.get("embedding", [])
        if not embedding:
            raise ValueError("Empty embedding returned from Ollama")

        # Ensure collection exists
        await qdrant.ensure_collection(
            name=request.collection,
            vector_size=len(embedding),
        )

        # Store in Qdrant
        doc_id = await qdrant.store_memory(
            collection=request.collection,
            text=request.text,
            embedding=embedding,
            metadata=request.metadata,
        )

        # Publish NATS event
        if app_state.nats_client and app_state.nats_client.is_connected:
            from taro_common.events import MemoryStored, Subjects

            event = MemoryStored(
                source="ai-gateway",
                collection=request.collection,
                document_id=doc_id,
                text_preview=request.text[:100],
            )
            try:
                await app_state.nats_client.publish_event(Subjects.MEMORY_STORED, event)
            except Exception:
                pass

        return MemoryStoreResponse(id=doc_id, collection=request.collection)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("memory_store_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to store memory: {exc}") from exc


@router.post("/memory/search", response_model=list[MemorySearchResult])
async def search_memory(request: MemorySearchRequest) -> list[MemorySearchResult]:
    """Perform semantic search against a Qdrant collection.

    The query text is embedded and used to find the nearest vectors.
    """
    ollama = app_state.ollama_service
    qdrant = app_state.qdrant_service
    if ollama is None or qdrant is None:
        raise HTTPException(status_code=503, detail="Required services not available")

    settings = app_state.get_settings()

    try:
        # Embed the query
        result = await ollama.generate_embedding(
            text=request.query,
            model=settings.TARO_EMBEDDING_MODEL,
        )
        query_embedding = result.get("embedding", [])
        if not query_embedding:
            raise ValueError("Empty embedding returned from Ollama")

        # Search Qdrant
        results = await qdrant.search_memory(
            collection=request.collection,
            query_embedding=query_embedding,
            limit=request.limit,
            filters=request.filters,
        )
        return results

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("memory_search_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}") from exc


@router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str, collection: str = "taro_memory") -> dict[str, str]:
    """Delete a specific memory entry by ID from a collection."""
    qdrant = app_state.qdrant_service
    if qdrant is None:
        raise HTTPException(status_code=503, detail="Qdrant service not available")

    try:
        await qdrant.delete_memory(collection=collection, memory_id=memory_id)
        return {"status": "deleted", "id": memory_id}
    except Exception as exc:
        logger.error("memory_delete_failed", id=memory_id, error=str(exc))
        raise HTTPException(status_code=500, detail=f"Delete failed: {exc}") from exc


@router.get("/memory/collections", response_model=list[CollectionInfo])
async def list_collections() -> list[CollectionInfo]:
    """List all Qdrant collections used for memory storage."""
    qdrant = app_state.qdrant_service
    if qdrant is None:
        raise HTTPException(status_code=503, detail="Qdrant service not available")

    try:
        collections = await qdrant.list_collections()
        return [
            CollectionInfo(
                name=c.get("name", ""),
                vectors_count=c.get("vectors_count", 0),
                status=c.get("status", "ok"),
            )
            for c in collections
        ]
    except Exception as exc:
        logger.error("collections_list_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to list collections: {exc}") from exc
