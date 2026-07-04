"""Service to generate mock and personalized daily briefings."""

from __future__ import annotations

import random
from datetime import date
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from taro_api.db.models import DailyBriefing, BriefingItem, User, UserInterest, LearningGoal, CareerGoal, NewsPreference


class BriefingService:
    """Handles generation and retrieval of daily briefings."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize the briefing service with a database session."""
        self.db = db

    async def get_or_create_briefing(self, user_id: str, target_date: date) -> DailyBriefing:
        """Fetch briefing for a given date, or generate a personalized mock one if not present."""
        result = await self.db.execute(
            select(DailyBriefing)
            .where(DailyBriefing.user_id == user_id, DailyBriefing.date == target_date)
            .options(selectinload(DailyBriefing.items))
        )
        briefing = result.scalars().first()

        if briefing:
            return briefing

        # Generate a new one
        return await self.generate_mock_briefing(user_id, target_date)

    async def generate_mock_briefing(self, user_id: str, target_date: date) -> DailyBriefing:
        """Generate a personalized mock briefing based on user preferences and goals."""
        # Create briefing container
        briefing = DailyBriefing(
            user_id=user_id,
            date=target_date,
            status="ready",
        )
        self.db.add(briefing)
        await self.db.flush()  # populate briefing.id

        # Query user profile details
        user_res = await self.db.execute(
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.interests),
                selectinload(User.learning_goals),
                selectinload(User.career_goals),
                selectinload(User.news_preferences),
            )
        )
        user = user_res.scalars().first()
        if not user:
            raise ValueError("User not found")

        interests: Sequence[UserInterest] = user.interests
        learning_goals: Sequence[LearningGoal] = user.learning_goals
        career_goals: Sequence[CareerGoal] = user.career_goals
        news_prefs: Sequence[NewsPreference] = user.news_preferences

        items: list[BriefingItem] = []
        sort_order = 0

        # ── 1. Focus Item ─────────────────────────────────────────────────────
        focus_title = "Focus on foundation building"
        focus_summary = "Today, spend some time organizing your local workspace and verifying Taro connectivity."
        if learning_goals:
            active_goals = [g for g in learning_goals if g.status == "active"]
            if active_goals:
                g = random.choice(active_goals)
                focus_title = f"Deep dive into {g.topic}"
                focus_summary = f"Dedicate 45 minutes today to studying {g.topic}. Read core documentation or write a small test script to cement your learning."
        elif career_goals:
            active_careers = [c for c in career_goals if c.status == "active"]
            if active_careers:
                c = random.choice(active_careers)
                focus_title = f"Advance career goal: {c.goal}"
                focus_summary = f"Take one actionable step today toward: '{c.goal}'. Draft a task breakdown or research key skills required."

        items.append(
            BriefingItem(
                briefing_id=briefing.id,
                category="focus",
                title=focus_title,
                summary=focus_summary,
                relevance_score=0.99,
                sort_order=sort_order,
            )
        )
        sort_order += 1

        # ── 2. AI & Tech News ──────────────────────────────────────────────────
        tech_interests = [i for i in interests if i.category.lower() in ("technology", "science", "programming", "cyber security", "devops")]
        ai_topics = [i.topic for i in tech_interests]
        
        # Fallback topics if empty
        if not ai_topics:
            ai_topics = ["Artificial Intelligence", "Python", "Software Engineering"]

        news_templates = [
            ("Breakthrough in {topic} Agentic Workflows", "Researchers published a paper detailing new agentic loops that reduce hallucination by 34% in local deployments."),
            ("Next-gen Local LLMs for {topic} Released", "A lightweight model optimized for local inference of {topic} is dominating the open-source benchmarks this week."),
            ("Security Vulnerability Found in {topic} Frameworks", "A zero-day exploit was disclosed affecting popular orchestration libraries. Security advisories recommend upgrading immediately."),
            ("The Rise of Devin-like tools in {topic}", "How autonomous agent systems are reshaping code development, build setups, and continuous integration pipelines."),
        ]

        # Generate 2-3 news items
        selected_topics = random.sample(ai_topics, min(len(ai_topics), 3))
        for topic in selected_topics:
            tmpl_title, tmpl_summary = random.choice(news_templates)
            items.append(
                BriefingItem(
                    briefing_id=briefing.id,
                    category="news",
                    title=tmpl_title.format(topic=topic),
                    summary=tmpl_summary.format(topic=topic),
                    source_name="Taro AI Crawler (Mock)",
                    source_url="https://github.com/topics/" + topic.lower().replace(" ", "-"),
                    relevance_score=round(random.uniform(0.75, 0.95), 2),
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        # ── 3. GitHub Trending ───────────────────────────────────────────────
        github_repos = [
            ("ollama/ollama", "Run Llama 3, Mistral, and other large language models locally.", "Go"),
            ("qdrant/qdrant", "Vector Database for the next generation of AI applications.", "Rust"),
            ("fastapi/fastapi", "Modern, fast (high-performance), web framework for building APIs.", "Python"),
            ("nextjs/next.js", "The React Framework for the Web.", "TypeScript"),
            ("microsoft/autogen", "A framework that enables the development of LLM applications using multiple agents.", "Python"),
        ]
        
        # If user has specific language interests, prioritize them
        prog_interests = [i.topic.lower() for i in interests if i.category.lower() == "programming"]
        for repo_path, desc, lang in github_repos:
            # Add anyway, score higher if matching lang
            rel = 0.7
            if lang.lower() in prog_interests:
                rel = 0.95
            items.append(
                BriefingItem(
                    briefing_id=briefing.id,
                    category="github",
                    title=f"Trending: {repo_path} ({lang})",
                    summary=desc,
                    source_name="GitHub Trending",
                    source_url=f"https://github.com/{repo_path}",
                    relevance_score=rel,
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        # ── 4. Learning recommendation ───────────────────────────────────────
        if learning_goals:
            goal = random.choice(learning_goals)
            items.append(
                BriefingItem(
                    briefing_id=briefing.id,
                    category="learning",
                    title=f"Learning Resource: {goal.topic}",
                    summary=f"Here is a recommended study outline for {goal.topic}: 1. Review architecture fundamentals. 2. Build a local playground container. 3. Hook up health probes. Check GitHub for starter templates.",
                    source_name="Taro Coach",
                    relevance_score=0.9,
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        # ── 5. Career opportunity ──────────────────────────────────────────
        career_focus = "General Engineering"
        if career_goals:
            career_focus = random.choice(career_goals).goal
        
        items.append(
            BriefingItem(
                briefing_id=briefing.id,
                category="career",
                title=f"Career Growth Strategy for: '{career_focus}'",
                summary="Build a public GitHub repository demonstrating this skill. Write a clean README detailing your design choices, and share the post on your professional network.",
                source_name="Taro Career Advisor",
                relevance_score=0.85,
                sort_order=sort_order,
            )
        )
        sort_order += 1

        # ── 6. Fitness / Health (if interest exists) ──────────────────────────
        fitness_interests = [i for i in interests if i.category.lower() in ("health", "fitness")]
        if fitness_interests:
            fit_topics = [f.topic for f in fitness_interests]
            fit_text = "Focus on a balanced workout today. Target a 30-minute high-intensity cardio session followed by recovery stretching."
            if "Nutrition" in fit_topics:
                fit_text += " Hydrate well (at least 3L of water) and prioritize protein synthesis."
            items.append(
                BriefingItem(
                    briefing_id=briefing.id,
                    category="fitness",
                    title="Daily Physical Conditioning Advice",
                    summary=fit_text,
                    source_name="Taro Health Agent",
                    relevance_score=0.8,
                    sort_order=sort_order,
                )
            )
            sort_order += 1

        # Save items to database
        for item in items:
            self.db.add(item)
        
        await self.db.commit()
        await self.db.refresh(briefing)

        return briefing
