"""Service to manage User profiles, credentials, and settings CRUD operations."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from taro_api.db.models import User, UserProfile
from taro_api.auth.security import hash_password, verify_password


class UserService:
    """Manages user registration, profile updates, and authentication checks."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize user service with database session."""
        self.db = db

    async def get_user_by_id(self, user_id: str) -> User | None:
        """Fetch user by primary key."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_user_by_username(self, username: str) -> User | None:
        """Fetch user by unique username."""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalars().first()

    async def create_user(self, username: str, password_raw: str, email: str | None = None) -> User:
        """Register a new user account with hashed password."""
        hashed_pwd = hash_password(password_raw)
        user = User(
            username=username,
            email=email,
            password_hash=hashed_pwd,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate_user(self, username: str, password_raw: str) -> User | None:
        """Validate user credentials."""
        user = await self.get_user_by_username(username)
        if not user:
            return None
        if not verify_password(password_raw, user.password_hash):
            return None
        return user

    async def save_profile(
        self,
        user_id: str,
        display_name: str,
        preferred_language: str,
        timezone: str,
        country: str,
        occupation: str,
        professional_status: str,
    ) -> UserProfile:
        """Upsert user profile details."""
        result = await self.db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
        profile = result.scalars().first()

        if not profile:
            profile = UserProfile(user_id=user_id)
            self.db.add(profile)

        profile.display_name = display_name
        profile.preferred_language = preferred_language
        profile.timezone = timezone
        profile.country = country
        profile.occupation = occupation
        profile.professional_status = professional_status

        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def mark_onboarding_complete(self, user_id: str) -> bool:
        """Set user onboarding status to True."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        user.is_onboarded = True
        await self.db.commit()
        return True
