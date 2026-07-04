"""Onboarding router endpoints."""

from __future__ import annotations

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from taro_api.db.database import get_db
from taro_api.db.models import User, UserProfile, UserInterest, NewsPreference, LearningGoal, CareerGoal
from taro_api.auth.security import get_current_user
from taro_api.services.user_service import UserService
from taro_api.services.briefing_service import BriefingService

router = APIRouter()


class OnboardingProfilePayload(BaseModel):
    """Profile payload for onboarding."""
    display_name: str
    preferred_language: str = "en"
    timezone: str = "UTC"
    country: str = ""
    occupation: str = ""
    professional_status: str = ""


class OnboardingInterestPayload(BaseModel):
    """Interest payload for onboarding."""
    category: str
    topic: str
    is_custom: bool = False
    priority: int = 0


class OnboardingNewsPayload(BaseModel):
    """News preference payload for onboarding."""
    topic: str
    frequency: str = "daily"
    is_active: bool = True


class OnboardingLearningPayload(BaseModel):
    """Learning goal payload for onboarding."""
    topic: str
    status: str = "active"
    notes: Optional[str] = None


class OnboardingCareerPayload(BaseModel):
    """Career goal payload for onboarding."""
    goal: str
    status: str = "active"
    target_date: Optional[str] = None  # YYYY-MM-DD
    notes: Optional[str] = None


class OnboardingStatusResponse(BaseModel):
    """Onboarding completion status."""
    is_onboarded: bool
    completed_steps: List[str]


class OnboardingData(BaseModel):
    """Full onboarding package payload."""
    profile: OnboardingProfilePayload
    interests: List[OnboardingInterestPayload]
    news_preferences: List[OnboardingNewsPayload]
    learning_goals: List[OnboardingLearningPayload]
    career_goals: List[OnboardingCareerPayload]


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingStatusResponse:
    """Return status of onboarding steps."""
    completed = []
    # Check what exists
    res_prof = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if res_prof.scalars().first():
        completed.append("profile")
    res_int = await db.execute(select(UserInterest).where(UserInterest.user_id == current_user.id))
    if res_int.scalars().first():
        completed.append("interests")
    res_news = await db.execute(select(NewsPreference).where(NewsPreference.user_id == current_user.id))
    if res_news.scalars().first():
        completed.append("news_preferences")
    res_learn = await db.execute(select(LearningGoal).where(LearningGoal.user_id == current_user.id))
    if res_learn.scalars().first():
        completed.append("learning_goals")
    res_career = await db.execute(select(CareerGoal).where(CareerGoal.user_id == current_user.id))
    if res_career.scalars().first():
        completed.append("career_goals")

    return OnboardingStatusResponse(
        is_onboarded=current_user.is_onboarded,
        completed_steps=completed,
    )


@router.post("/onboarding/profile")
async def save_profile(
    payload: OnboardingProfilePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Save user profile during onboarding."""
    user_svc = UserService(db)
    await user_svc.save_profile(
        user_id=current_user.id,
        display_name=payload.display_name,
        preferred_language=payload.preferred_language,
        timezone=payload.timezone,
        country=payload.country,
        occupation=payload.occupation,
        professional_status=payload.professional_status,
    )
    return {"status": "success"}


@router.post("/onboarding/interests")
async def save_interests(
    payload: List[OnboardingInterestPayload],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Save user interests during onboarding (overwriting previous interests)."""
    # Delete old
    from sqlalchemy import delete
    await db.execute(delete(UserInterest).where(UserInterest.user_id == current_user.id))

    # Add new
    for item in payload:
        db_item = UserInterest(
            user_id=current_user.id,
            category=item.category,
            topic=item.topic,
            is_custom=item.is_custom,
            priority=item.priority,
        )
        db.add(db_item)
    await db.commit()
    return {"status": "success"}


@router.post("/onboarding/news-preferences")
async def save_news_preferences(
    payload: List[OnboardingNewsPayload],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Save user news briefing preferences (overwriting previous)."""
    from sqlalchemy import delete
    await db.execute(delete(NewsPreference).where(NewsPreference.user_id == current_user.id))

    for item in payload:
        db_item = NewsPreference(
            user_id=current_user.id,
            topic=item.topic,
            frequency=item.frequency,
            is_active=item.is_active,
        )
        db.add(db_item)
    await db.commit()
    return {"status": "success"}


@router.post("/onboarding/learning-goals")
async def save_learning_goals(
    payload: List[OnboardingLearningPayload],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Save user learning goals (overwriting previous)."""
    from sqlalchemy import delete
    await db.execute(delete(LearningGoal).where(LearningGoal.user_id == current_user.id))

    for item in payload:
        db_item = LearningGoal(
            user_id=current_user.id,
            topic=item.topic,
            status=item.status,
            notes=item.notes,
        )
        db.add(db_item)
    await db.commit()
    return {"status": "success"}


@router.post("/onboarding/career-goals")
async def save_career_goals(
    payload: List[OnboardingCareerPayload],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Save user career goals (overwriting previous)."""
    from sqlalchemy import delete
    import datetime
    await db.execute(delete(CareerGoal).where(CareerGoal.user_id == current_user.id))

    for item in payload:
        target_date = None
        if item.target_date:
            try:
                target_date = datetime.datetime.strptime(item.target_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        db_item = CareerGoal(
            user_id=current_user.id,
            goal=item.goal,
            status=item.status,
            target_date=target_date,
            notes=item.notes,
        )
        db.add(db_item)
    await db.commit()
    return {"status": "success"}


@router.post("/onboarding/complete")
async def complete_onboarding(
    payload: OnboardingData,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Commit all onboarding preferences, mark user as onboarded, and pre-generate the first briefing."""
    user_svc = UserService(db)
    
    # 1. Save profile
    await user_svc.save_profile(
        user_id=current_user.id,
        display_name=payload.profile.display_name,
        preferred_language=payload.profile.preferred_language,
        timezone=payload.profile.timezone,
        country=payload.profile.country,
        occupation=payload.profile.occupation,
        professional_status=payload.profile.professional_status,
    )

    # 2. Save interests
    from sqlalchemy import delete
    await db.execute(delete(UserInterest).where(UserInterest.user_id == current_user.id))
    for interest in payload.interests:
        db.add(
            UserInterest(
                user_id=current_user.id,
                category=interest.category,
                topic=interest.topic,
                is_custom=interest.is_custom,
                priority=interest.priority,
            )
        )

    # 3. Save news preferences
    await db.execute(delete(NewsPreference).where(NewsPreference.user_id == current_user.id))
    for np in payload.news_preferences:
        db.add(
            NewsPreference(
                user_id=current_user.id,
                topic=np.topic,
                frequency=np.frequency,
                is_active=np.is_active,
            )
        )

    # 4. Save learning goals
    await db.execute(delete(LearningGoal).where(LearningGoal.user_id == current_user.id))
    for lg in payload.learning_goals:
        db.add(
            LearningGoal(
                user_id=current_user.id,
                topic=lg.topic,
                status=lg.status,
                notes=lg.notes,
            )
        )

    # 5. Save career goals
    await db.execute(delete(CareerGoal).where(CareerGoal.user_id == current_user.id))
    import datetime
    for cg in payload.career_goals:
        target_date = None
        if cg.target_date:
            try:
                target_date = datetime.datetime.strptime(cg.target_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        db.add(
            CareerGoal(
                user_id=current_user.id,
                goal=cg.goal,
                status=cg.status,
                target_date=target_date,
                notes=cg.notes,
            )
        )

    # 6. Mark user onboarded
    await user_svc.mark_onboarding_complete(current_user.id)
    
    # 7. Generate first Daily Briefing
    briefing_svc = BriefingService(db)
    await briefing_svc.generate_mock_briefing(current_user.id, date.today())

    return {"status": "success"}
