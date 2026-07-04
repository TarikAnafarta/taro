"""Authentication router endpoints."""

from __future__ import annotations

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from taro_api.db.database import get_db
from taro_api.db.models import User
from taro_api.services.user_service import UserService
from taro_api.auth.security import create_access_token, get_current_user, settings

router = APIRouter()


class LoginPayload(BaseModel):
    """Payload for user logging in."""
    username: str
    password: str


class RegisterPayload(BaseModel):
    """Payload for user registering."""
    username: str
    password: str
    email: str | None = None


class UserResponse(BaseModel):
    """Serialized User details."""
    id: str
    username: str
    email: str | None = None
    is_onboarded: bool


class AuthResponse(BaseModel):
    """Success token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/auth/register", response_model=AuthResponse)
async def register(payload: RegisterPayload, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    """Create a new user account and return a JWT access token."""
    user_svc = UserService(db)
    existing = await user_svc.get_user_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user = await user_svc.create_user(
        username=payload.username,
        password_raw=payload.password,
        email=payload.email,
    )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRY_MINUTES),
    )
    return AuthResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_onboarded=user.is_onboarded,
        ),
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    """Authenticate credentials and return a JWT access token."""
    user_svc = UserService(db)
    user = await user_svc.authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRY_MINUTES),
    )
    return AuthResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_onboarded=user.is_onboarded,
        ),
    )


@router.get("/auth/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Retrieve logged-in user details."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_onboarded=current_user.is_onboarded,
    )
