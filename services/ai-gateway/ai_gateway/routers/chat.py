"""Chat completion endpoints — proxy requests to Ollama."""

from __future__ import annotations

import json
import uuid
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from taro_common.logging import get_logger
from taro_common.models import ChatRequest, ChatResponse, ChatChoice, ChatMessage

from ai_gateway import main as app_state

logger = get_logger(__name__)
router = APIRouter()


@router.post("/chat/completions", response_model=ChatResponse)
async def chat_completion(request: ChatRequest) -> ChatResponse:
    """Generate a chat completion via Ollama.

    Accepts an OpenAI-compatible messages payload and returns a single
    response. For streaming, use the ``/chat/completions/stream`` endpoint.
    """
    svc = app_state.ollama_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Ollama service not available")

    model = request.model or svc.default_chat_model

    # Ollama üzerinde modelin çekilip çekilmediğini kontrol et
    try:
        models = await svc.list_models()
        model_names = [m.get("name", "") for m in models]
        # Tam veya tag'siz eşleşme kontrolü (örn. qwen2.5:3b ile qwen2.5:3b:latest eşleşmeli)
        model_exists = False
        for name in model_names:
            if model in name or name in model:
                model_exists = True
                break
        
        if not model_exists:
            # model adını temizle veya göster
            raise HTTPException(
                status_code=404,
                detail=f"'{model}' modeli Ollama sunucusunda bulunamadı. Lütfen sunucunuzda 'docker compose exec ollama ollama pull {model}' komutunu çalıştırarak modeli indirin."
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("ollama_model_check_failed", error=str(exc))

    try:
        result = await svc.chat_completion(
            messages=[m.model_dump() for m in request.messages],
            model=model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
    except Exception as exc:
        logger.error("chat_completion_failed", error=str(exc))
        # Eğer Ollama 404 döndüyse model eksik demektir
        err_msg = str(exc)
        if "404" in err_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Ollama sunucusunda '{model}' modeli bulunamadı. Lütfen 'docker compose exec ollama ollama pull {model}' komutuyla modeli indirin."
            ) from exc
        raise HTTPException(status_code=502, detail=f"Ollama hatası: {exc}") from exc

    # Publish event via NATS (fire-and-forget)
    if app_state.nats_client and app_state.nats_client.is_connected:
        from taro_common.events import ChatResponseGenerated, Subjects

        event = ChatResponseGenerated(
            source="ai-gateway",
            content=result.get("message", {}).get("content", ""),
            model=model,
            tokens_used=result.get("eval_count", 0),
        )
        try:
            await app_state.nats_client.publish_event(
                Subjects.CHAT_RESPONSE_GENERATED, event
            )
        except Exception:
            pass

    # Build OpenAI-compatible response
    content = result.get("message", {}).get("content", "")
    return ChatResponse(
        id=f"chatcmpl-{uuid.uuid4().hex[:12]}",
        model=model,
        choices=[
            ChatChoice(
                index=0,
                message=ChatMessage(role="assistant", content=content),
                finish_reason="stop",
            )
        ],
        usage={
            "prompt_tokens": result.get("prompt_eval_count", 0),
            "completion_tokens": result.get("eval_count", 0),
            "total_tokens": result.get("prompt_eval_count", 0) + result.get("eval_count", 0),
        },
        created=int(time.time()),
    )


@router.post("/chat/completions/stream")
async def chat_completion_stream(request: ChatRequest) -> StreamingResponse:
    """Stream a chat completion as Server-Sent Events (SSE).

    Each SSE event contains a JSON delta matching the OpenAI streaming
    format.
    """
    svc = app_state.ollama_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Ollama service not available")

    model = request.model or svc.default_chat_model

    async def event_generator():
        """Yield SSE-formatted chunks from Ollama's streaming response."""
        try:
            async for chunk in svc.chat_completion_stream(
                messages=[m.model_dump() for m in request.messages],
                model=model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            ):
                content = chunk.get("message", {}).get("content", "")
                done = chunk.get("done", False)

                delta: dict[str, Any] = {}
                if content:
                    delta["content"] = content

                data = {
                    "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
                    "object": "chat.completion.chunk",
                    "model": model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": delta,
                            "finish_reason": "stop" if done else None,
                        }
                    ],
                }
                yield f"data: {json.dumps(data)}\n\n"

                if done:
                    yield "data: [DONE]\n\n"
                    break
        except Exception as exc:
            logger.error("stream_error", error=str(exc))
            error_data = {"error": {"message": str(exc), "type": "server_error"}}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
