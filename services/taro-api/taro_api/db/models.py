"""SQLAlchemy ORM models for the Taro Core database schema."""

from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Any

from sqlalchemy import String, Boolean, Integer, Float, ForeignKey, DateTime, Date, JSON, Text, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from taro_api.db.database import Base


def generate_uuid() -> str:
    """Generate a string representation of a UUID4."""
    return str(uuid.uuid4())


# ── Auth & Users ───────────────────────────────────────────────────────

class User(Base):
    """User accounts and credentials."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile: Mapped[UserProfile | None] = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interests: Mapped[list[UserInterest]] = relationship("UserInterest", back_populates="user", cascade="all, delete-orphan")
    news_preferences: Mapped[list[NewsPreference]] = relationship("NewsPreference", back_populates="user", cascade="all, delete-orphan")
    learning_goals: Mapped[list[LearningGoal]] = relationship("LearningGoal", back_populates="user", cascade="all, delete-orphan")
    career_goals: Mapped[list[CareerGoal]] = relationship("CareerGoal", back_populates="user", cascade="all, delete-orphan")
    briefings: Mapped[list[DailyBriefing]] = relationship("DailyBriefing", back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[list[Conversation]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    """User profile attributes, language settings, and demographics."""
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    professional_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="profile")


# ── Interests & Preferences ───────────────────────────────────────────

class UserInterest(Base):
    """Interests that Taro tracks and optimizes search / briefings for."""
    __tablename__ = "user_interests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="interests")


class NewsPreference(Base):
    """News category briefing frequency config."""
    __tablename__ = "news_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), default="daily")  # daily, every_6h, weekly
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="news_preferences")


# ── Goals ─────────────────────────────────────────────────────────────

class LearningGoal(Base):
    """Topics the user is currently learning."""
    __tablename__ = "learning_goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, completed, paused
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="learning_goals")


class CareerGoal(Base):
    """Career achievements the user wants to hit."""
    __tablename__ = "career_goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, completed, paused
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="career_goals")


# ── Daily Briefing ─────────────────────────────────────────────────────

class DailyBriefing(Base):
    """Generated daily news summary and personal briefing."""
    __tablename__ = "daily_briefings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, ready, delivered

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="briefings")
    items: Mapped[list[BriefingItem]] = relationship("BriefingItem", back_populates="briefing", cascade="all, delete-orphan")


class BriefingItem(Base):
    """A single briefing item (news link, task suggestion, trending repo)."""
    __tablename__ = "briefing_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    briefing_id: Mapped[str] = mapped_column(String(36), ForeignKey("daily_briefings.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # news, github, learning, career, fitness, focus
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    metadata_: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    briefing: Mapped[DailyBriefing] = relationship("DailyBriefing", back_populates="items")


# ── Agent Execution ────────────────────────────────────────────────────

class Agent(Base):
    """Registered Taro agents."""
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    config_: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="inactive")  # active, inactive, error, paused
    last_executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    conversations: Mapped[list[Conversation]] = relationship("Conversation", back_populates="agent")
    tasks: Mapped[list[Task]] = relationship("Task", back_populates="agent")
    task_runs: Mapped[list[TaskRun]] = relationship("TaskRun", back_populates="agent")


# ── Conversational Chat ────────────────────────────────────────────────

class Conversation(Base):
    """Chat conversations."""
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    agent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="conversations")
    agent: Mapped[Agent | None] = relationship("Agent", back_populates="conversations")
    messages: Mapped[list[Message]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Messages inside conversations."""
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # system, user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation: Mapped[Conversation] = relationship("Conversation", back_populates="messages")


# ── Task Scheduling & Auditing ──────────────────────────────────────────

class Task(Base):
    """Schedules for firing agents."""
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    schedule_type: Mapped[str] = mapped_column(String(50), nullable=False)  # cron, interval, once
    schedule_value: Mapped[str] = mapped_column(String(255), nullable=False)
    config_: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, paused, completed
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    agent: Mapped[Agent] = relationship("Agent", back_populates="tasks")
    runs: Mapped[list[TaskRun]] = relationship("TaskRun", back_populates="task", cascade="all, delete-orphan")


class TaskRun(Base):
    """Auditing of agent execution runs."""
    __tablename__ = "task_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    task_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # running, completed, failed
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    task: Mapped[Task | None] = relationship("Task", back_populates="runs")
    agent: Mapped[Agent] = relationship("Agent", back_populates="task_runs")


class MemoryCollection(Base):
    """Metadata tracking vector memory spaces stored in Qdrant."""
    __tablename__ = "memory_collections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_model: Mapped[str] = mapped_column(String(255), default="nomic-embed-text")
    document_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """System-wide trace and security logging."""
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped[User | None] = relationship("User", back_populates="audit_logs")
