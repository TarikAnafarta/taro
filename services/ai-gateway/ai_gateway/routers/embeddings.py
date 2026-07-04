"""Embedding generation endpoints — proxy to Ollama embeddings API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from taro_common.logging import get_logger
from taro_common.models import EmbeddingRequest, EmbeddingResponse, EmbeddingData

from ai_gateway import main as app_state

logger = get_logger(__name__)
router = APIRouter()


@router.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
    """Generate embeddings for one or more input texts via Ollama.

    Supports both single-string and batch (list of strings) input.
    """
    svc = app_state.ollama_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Ollama service not available")

    model = request.model or svc.default_embedding_model

    # Normalise input to list
    texts = request.input if isinstance(request.input, list) else [request.input]

    embeddings_data: list[EmbeddingData] = []
    total_tokens = 0

    for idx, text in enumerate(texts):
        try:
            result = await svc.generate_embedding(text=text, model=model)
            embedding_vector = result.get("embedding", [])
            embeddings_data.append(
                EmbeddingData(
                    index=idx,
                    embedding=embedding_vector,
                    object="embedding",
                )
            )
            # Ollama doesn't always return token counts; estimate from text length
            total_tokens += result.get("prompt_eval_count", len(text.split()))
        except Exception as exc:
            logger.error("embedding_failed", index=idx, error=str(exc))
            raise HTTPException(
                status_code=502,
                detail=f"Embedding generation failed for input {idx}: {exc}",
            ) from exc

    return EmbeddingResponse(
        model=model,
        data=embeddings_data,
        usage={"prompt_tokens": total_tokens, "total_tokens": total_tokens},
    )
