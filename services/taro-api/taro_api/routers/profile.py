"""User profile and settings management router endpoints."""

from __future__ import annotations

from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from taro_api.db.database import get_db
from taro_api.db.models import User, UserProfile, UserInterest, NewsPreference, LearningGoal, CareerGoal
from taro_api.auth.security import get_current_user
from taro_api.services.user_service import UserService

router = APIRouter()


class ProfileResponse(BaseModel):
    """Profile data model response."""
    display_name: str = ""
    preferred_language: str = "en"
    timezone: str = "UTC"
    country: str = ""
    occupation: str = ""
    professional_status: str = ""


class InterestResponse(BaseModel):
    """Interest model response."""
    id: str
    category: str
    topic: str
    is_custom: bool
    priority: int


class NewsPrefResponse(BaseModel):
    """News preference model response."""
    id: str
    topic: str
    frequency: str
    is_active: bool


class LearningGoalResponse(BaseModel):
    """Learning goal model response."""
    id: str
    topic: str
    status: str
    notes: Optional[str] = None


class CareerGoalResponse(BaseModel):
    """Career goal model response."""
    id: str
    goal: str
    status: str
    target_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """Retrieve full details of the current user profile."""
    res = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = res.scalars().first()
    if not profile:
        return ProfileResponse()
    return ProfileResponse(
        display_name=profile.display_name or "",
        preferred_language=profile.preferred_language,
        timezone=profile.timezone,
        country=profile.country or "",
        occupation=profile.occupation or "",
        professional_status=profile.professional_status or "",
    )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileResponse,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """Update profile data."""
    user_svc = UserService(db)
    profile = await user_svc.save_profile(
        user_id=current_user.id,
        display_name=payload.display_name,
        preferred_language=payload.preferred_language,
        timezone=payload.timezone,
        country=payload.country,
        occupation=payload.occupation,
        professional_status=payload.professional_status,
    )
    return ProfileResponse(
        display_name=profile.display_name or "",
        preferred_language=profile.preferred_language,
        timezone=profile.timezone,
        country=profile.country or "",
        occupation=profile.occupation or "",
        professional_status=profile.professional_status or "",
    )


@router.get("/profile/interests", response_model=List[InterestResponse])
async def get_interests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[InterestResponse]:
    """Retrieve user interests."""
    res = await db.execute(select(UserInterest).where(UserInterest.user_id == current_user.id))
    interests = res.scalars().all()
    return [
        InterestResponse(
            id=i.id,
            category=i.category,
            topic=i.topic,
            is_custom=i.is_custom,
            priority=i.priority,
        )
        for i in interests
    ]


@router.put("/profile/interests", response_model=List[InterestResponse])
async def update_interests(
    payload: List[InterestResponse],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[InterestResponse]:
    """Batch update user interests."""
    from sqlalchemy import delete
    await db.execute(delete(UserInterest).where(UserInterest.user_id == current_user.id))
    for item in payload:
        db.add(
            UserInterest(
                user_id=current_user.id,
                category=item.category,
                topic=item.topic,
                is_custom=item.is_custom,
                priority=item.priority,
            )
        )
    await db.commit()
    return await get_interests(current_user, db)


@router.get("/profile/news-preferences", response_model=List[NewsPrefResponse])
async def get_news_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[NewsPrefResponse]:
    """Retrieve news briefing frequencies."""
    res = await db.execute(select(NewsPreference).where(NewsPreference.user_id == current_user.id))
    prefs = res.scalars().all()
    return [
        NewsPrefResponse(
            id=p.id,
            topic=p.topic,
            frequency=p.frequency,
            is_active=p.is_active,
        )
        for p in prefs
    ]


@router.put("/profile/news-preferences", response_model=List[NewsPrefResponse])
async def update_news_preferences(
    payload: List[NewsPrefResponse],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[NewsPrefResponse]:
    """Batch update news briefing preferences."""
    from sqlalchemy import delete
    await db.execute(delete(NewsPreference).where(NewsPreference.user_id == current_user.id))
    for item in payload:
        db.add(
            NewsPreference(
                user_id=current_user.id,
                topic=item.topic,
                frequency=item.frequency,
                is_active=item.is_active,
            )
        )
    await db.commit()
    return await get_news_preferences(current_user, db)


@router.get("/profile/learning-goals", response_model=List[LearningGoalResponse])
async def get_learning_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[LearningGoalResponse]:
    """Retrieve user learning goals."""
    res = await db.execute(select(LearningGoal).where(LearningGoal.user_id == current_user.id))
    goals = res.scalars().all()
    return [
        LearningGoalResponse(
            id=g.id,
            topic=g.topic,
            status=g.status,
            notes=g.notes,
        )
        for g in goals
    ]


@router.put("/profile/learning-goals", response_model=List[LearningGoalResponse])
async def update_learning_goals(
    payload: List[LearningGoalResponse],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[LearningGoalResponse]:
    """Batch update user learning goals."""
    from sqlalchemy import delete
    await db.execute(delete(LearningGoal).where(LearningGoal.user_id == current_user.id))
    for item in payload:
        db.add(
            LearningGoal(
                user_id=current_user.id,
                topic=item.topic,
                status=item.status,
                notes=item.notes,
            )
        )
    await db.commit()
    return await get_learning_goals(current_user, db)


@router.get("/profile/career-goals", response_model=List[CareerGoalResponse])
async def get_career_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CareerGoalResponse]:
    """Retrieve user career goals."""
    res = await db.execute(select(CareerGoal).where(CareerGoal.user_id == current_user.id))
    goals = res.scalars().all()
    return [
        CareerGoalResponse(
            id=g.id,
            goal=g.goal,
            status=g.status,
            target_date=g.target_date.isoformat() if g.target_date else None,
            notes=g.notes,
        )
        for g in goals
    ]


@router.put("/profile/career-goals", response_model=List[CareerGoalResponse])
async def update_career_goals(
    payload: List[CareerGoalResponse],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CareerGoalResponse]:
    """Batch update user career goals."""
    from sqlalchemy import delete
    await db.execute(delete(CareerGoal).where(CareerGoal.user_id == current_user.id))
    for item in payload:
        target_date = None
        if item.target_date:
            try:
                target_date = datetime.datetime.strptime(item.target_date.split("T")[0], "%Y-%m-%d").date()
            except ValueError:
                pass
        db.add(
            CareerGoal(
                user_id=current_user.id,
                goal=item.goal,
                status=item.status,
                target_date=target_date,
                notes=item.notes,
            )
        )
    await db.commit()
    return await get_career_goals(current_user, db)
