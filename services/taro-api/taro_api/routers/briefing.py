"""Daily briefing router endpoints."""

from __future__ import annotations

from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from taro_api.db.database import get_db
from taro_api.db.models import User, DailyBriefing, BriefingItem
from taro_api.auth.security import get_current_user
from taro_api.services.briefing_service import BriefingService

router = APIRouter()


class BriefingItemModel(BaseModel):
    """Briefing item data model."""
    id: str
    category: str
    title: str
    summary: str = ""
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    relevance_score: float = 0.0
    sort_order: int = 0


class DailyBriefingModel(BaseModel):
    """Daily briefing data model."""
    id: str
    date: str
    generated_at: str
    status: str
    items: List[BriefingItemModel]


@router.get("/briefing/today", response_model=DailyBriefingModel)
async def get_today_briefing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyBriefingModel:
    """Retrieve or generate today's briefing."""
    today = datetime.date.today()
    briefing_svc = BriefingService(db)
    briefing = await briefing_svc.get_or_create_briefing(current_user.id, today)

    # Re-fetch with items to ensure we have them all
    res = await db.execute(
        select(DailyBriefing)
        .where(DailyBriefing.id == briefing.id)
        .options(selectinload(DailyBriefing.items))
    )
    briefing = res.scalars().first()
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    return DailyBriefingModel(
        id=briefing.id,
        date=briefing.date.isoformat(),
        generated_at=briefing.generated_at.isoformat(),
        status=briefing.status,
        items=[
            BriefingItemModel(
                id=item.id,
                category=item.category,
                title=item.title,
                summary=item.summary or "",
                source_url=item.source_url,
                source_name=item.source_name,
                relevance_score=item.relevance_score,
                sort_order=item.sort_order,
            )
            for item in sorted(briefing.items, key=lambda x: x.sort_order)
        ],
    )


@router.get("/briefing/{target_date}", response_model=DailyBriefingModel)
async def get_briefing_by_date(
    target_date: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyBriefingModel:
    """Retrieve daily briefing by date."""
    try:
        target_dt = datetime.datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format, use YYYY-MM-DD",
        ) from exc

    briefing_svc = BriefingService(db)
    briefing = await briefing_svc.get_or_create_briefing(current_user.id, target_dt)

    # Re-fetch
    res = await db.execute(
        select(DailyBriefing)
        .where(DailyBriefing.id == briefing.id)
        .options(selectinload(DailyBriefing.items))
    )
    briefing = res.scalars().first()
    if not briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")

    return DailyBriefingModel(
        id=briefing.id,
        date=briefing.date.isoformat(),
        generated_at=briefing.generated_at.isoformat(),
        status=briefing.status,
        items=[
            BriefingItemModel(
                id=item.id,
                category=item.category,
                title=item.title,
                summary=item.summary or "",
                source_url=item.source_url,
                source_name=item.source_name,
                relevance_score=item.relevance_score,
                sort_order=item.sort_order,
            )
            for item in sorted(briefing.items, key=lambda x: x.sort_order)
        ],
    )


@router.get("/briefing/history", response_model=List[DailyBriefingModel])
async def get_briefing_history(
    limit: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DailyBriefingModel]:
    """Retrieve history of daily briefings."""
    res = await db.execute(
        select(DailyBriefing)
        .where(DailyBriefing.user_id == current_user.id)
        .order_by(DailyBriefing.date.desc())
        .limit(limit)
        .options(selectinload(DailyBriefing.items))
    )
    briefings = res.scalars().all()

    return [
        DailyBriefingModel(
            id=b.id,
            date=b.date.isoformat(),
            generated_at=b.generated_at.isoformat(),
            status=b.status,
            items=[
                BriefingItemModel(
                    id=item.id,
                    category=item.category,
                    title=item.title,
                    summary=item.summary or "",
                    source_url=item.source_url,
                    source_name=item.source_name,
                    relevance_score=item.relevance_score,
                    sort_order=item.sort_order,
                )
                for item in sorted(b.items, key=lambda x: x.sort_order)
            ],
        )
        for b in briefings
    ]


@router.post("/briefing/generate", response_model=DailyBriefingModel)
async def generate_briefing(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyBriefingModel:
    """Generate a new daily briefing for today (overwriting if exists)."""
    today = datetime.date.today()
    briefing_svc = BriefingService(db)
    
    # Delete existing for today
    from sqlalchemy import delete
    await db.execute(
        delete(DailyBriefing)
        .where(DailyBriefing.user_id == current_user.id, DailyBriefing.date == today)
    )
    
    briefing = await briefing_svc.generate_mock_briefing(current_user.id, today)

    # Re-fetch
    res = await db.execute(
        select(DailyBriefing)
        .where(DailyBriefing.id == briefing.id)
        .options(selectinload(DailyBriefing.items))
    )
    briefing = res.scalars().first()
    if not briefing:
        raise HTTPException(status_code=500, detail="Failed to retrieve generated briefing")

    return DailyBriefingModel(
        id=briefing.id,
        date=briefing.date.isoformat(),
        generated_at=briefing.generated_at.isoformat(),
        status=briefing.status,
        items=[
            BriefingItemModel(
                id=item.id,
                category=item.category,
                title=item.title,
                summary=item.summary or "",
                source_url=item.source_url,
                source_name=item.source_name,
                relevance_score=item.relevance_score,
                sort_order=item.sort_order,
            )
            for item in sorted(briefing.items, key=lambda x: x.sort_order)
        ],
    )
