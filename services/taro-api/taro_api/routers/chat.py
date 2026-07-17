"""Chat router endpoints for managing conversations and exchanging messages."""

from __future__ import annotations

from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from taro_api.db.database import get_db
from taro_api.db.models import User, Conversation, Message, DailyBriefing
from taro_api.auth.security import get_current_user
from taro_api.services.ai_client import AIClient

router = APIRouter()


class MessageModel(BaseModel):
    """Chat message response structure."""
    id: str
    role: str
    content: str
    created_at: str
    model: Optional[str] = None


class ChatRequestModel(BaseModel):
    """Payload for posting a chat message."""
    message: str
    conversation_id: Optional[str] = None
    model: Optional[str] = None


class ChatResponseModel(BaseModel):
    """Response structure for chat sends."""
    message: MessageModel
    conversation_id: str


class ConversationModel(BaseModel):
    """Chat conversation metadata response."""
    id: str
    title: str
    created_at: str
    updated_at: str


@router.post("/chat/send", response_model=ChatResponseModel)
async def send_chat_message(
    payload: ChatRequestModel,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatResponseModel:
    """Send a user message to the AI and receive a structured reply."""
    # ── 1. Find or create conversation ─────────────────────────────────
    conv_id = payload.conversation_id
    conversation = None
    if conv_id:
        res = await db.execute(
            select(Conversation)
            .where(Conversation.id == conv_id, Conversation.user_id == current_user.id)
        )
        conversation = res.scalars().first()

    if not conversation:
        title = payload.message[:50] + "..." if len(payload.message) > 50 else payload.message
        conversation = Conversation(
            user_id=current_user.id,
            title=title,
        )
        db.add(conversation)
        await db.flush()  # populate conversation.id

    # ── 2. Save user message ────────────────────────────────────────────
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    await db.flush()

    # ── 3. Re-fetch conversation history ───────────────────────────────
    hist_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    )
    history = hist_res.scalars().all()

    # ── 4. RAG: Fetch latest user briefing (max 5 items) ───────────────
    briefing_res = await db.execute(
        select(DailyBriefing)
        .where(DailyBriefing.user_id == current_user.id)
        .order_by(DailyBriefing.date.desc())
        .limit(1)
        .options(selectinload(DailyBriefing.items))
    )
    latest_briefing = briefing_res.scalars().first()

    rag_context = ""
    if latest_briefing and latest_briefing.items:
        news_texts = []
        for item in latest_briefing.items:
            if item.category != "focus":
                news_texts.append(f"[{item.category.upper()}] {item.title}: {item.summary}")
                if len(news_texts) >= 5:
                    break
        if news_texts:
            rag_context = (
                "Aşağıdaki haberler kullanıcının ilgi alanlarına göre derlenmiş güncel Türkçe haberlerdir. "
                "Kullanıcı güncel haber sorarsa bu bilgileri baz al:\n" + "\n".join(news_texts)
            )

    # ── 5. Smart web search (only when question needs current data) ─────
    WEB_SEARCH_KEYWORDS = [
        "fiyat", "kaç", "bugün", "şu an", "şu anki", "son dakika", "haber", "neler oldu",
        "ne oldu", "ekonomi", "borsa", "döviz", "euro", "dolar", "altın", "faiz", "enflasyon",
        "hava durumu", "hava", "maç", "sonuç", "skor", "seçim", "gündem", "deprem",
    ]
    msg_lower = payload.message.lower()
    needs_web_search = any(kw in msg_lower for kw in WEB_SEARCH_KEYWORDS)

    web_context = ""
    if needs_web_search:
        from taro_api.services.web_search import perform_web_search
        try:
            web_results = await perform_web_search(payload.message, max_results=3)
            if web_results:
                web_texts = [f"- {r['summary']}" for r in web_results]
                web_context = (
                    "Aşağıdaki bilgiler internetten alınmış güncel arama sonuçlarıdır. "
                    "Kullanıcının sorusunu cevaplarken bu verileri de kullan:\n" + "\n".join(web_texts)
                )
        except Exception:
            pass  # Web search failure must not crash the chat

    # ── 6. Build system prompt ─────────────────────────────────────────
    system_prompt = (
        "Sen Taro'nun Türkçe konuşan AI asistanısın. "
        "MUTLAKA ve SADECE Türkçe cevap ver. Asla başka bir dil kullanma. "
        "Kısa, öz ve doğrudan cevap ver. Gereksiz tekrar etme. "
        "Eğer bir bilgiye sahip değilsen bunu dürüstçe söyle."
    )
    if rag_context:
        system_prompt += "\n\n" + rag_context
    if web_context:
        system_prompt += "\n\n" + web_context

    messages_payload = [{"role": "system", "content": system_prompt}]
    messages_payload.extend([{"role": msg.role, "content": msg.content} for msg in history])

    # ── 7. Call AI Gateway ─────────────────────────────────────────────
    ai = AIClient()
    assistant_content = ""
    ai_model = "qwen2.5:3b"
    tokens = 0
    try:
        completion = await ai.chat_completion(
            messages=messages_payload,
            model=payload.model,
        )
        choices = completion.get("choices", [])
        if not choices:
            raise ValueError("AI Gateway'den yanıt seçeneği dönmedi")
        assistant_content = choices[0].get("message", {}).get("content", "").strip()
        ai_model = completion.get("model", "qwen2.5:3b")
        tokens = completion.get("usage", {}).get("total_tokens", 0)
    except Exception as exc:
        import httpx as _httpx
        error_detail = str(exc)
        if isinstance(exc, _httpx.HTTPStatusError):
            try:
                error_detail = exc.response.json().get("detail", error_detail)
            except Exception:
                pass
        assistant_content = f"Üzgünüm, bir hata nedeniyle yanıt oluşturulamadı: {error_detail}"
        ai_model = "hata"
        tokens = 0
    finally:
        await ai.close()

    # ── 8. Persist assistant reply + commit ────────────────────────────
    asst_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_content,
        model=ai_model,
        tokens_used=tokens,
    )
    db.add(asst_msg)
    conversation.updated_at = datetime.datetime.utcnow()
    await db.commit()

    return ChatResponseModel(
        message=MessageModel(
            id=asst_msg.id,
            role=asst_msg.role,
            content=asst_msg.content,
            created_at=asst_msg.created_at.isoformat(),
            model=asst_msg.model,
        ),
        conversation_id=conversation.id,
    )


@router.get("/chat/conversations", response_model=List[ConversationModel])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationModel]:
    """Retrieve list of chat conversations for the logged in user."""
    res = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = res.scalars().all()
    return [
        ConversationModel(
            id=c.id,
            title=c.title or "Untitled Conversation",
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in conversations
    ]


@router.get("/chat/conversations/{conversation_id}/messages", response_model=List[MessageModel])
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MessageModel]:
    """Retrieve all messages belonging to a conversation."""
    # Check conversation ownership
    res = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = res.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_res.scalars().all()
    return [
        MessageModel(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat(),
            model=m.model,
        )
        for m in messages
    ]


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a chat conversation and all its messages."""
    res = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = res.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"status": "deleted"}
