"""Service to generate real and personalized daily briefings via RSS scraping."""

from __future__ import annotations

import random
import urllib.request
import xml.etree.ElementTree as ET
import re
from datetime import date, datetime
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from taro_api.db.models import DailyBriefing, BriefingItem, User, UserInterest, LearningGoal, CareerGoal

def clean_html(raw_html: str | None) -> str:
    """HTML etiketlerini temizler."""
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    # Satır sonu ve fazla boşlukları temizle
    cleantext = re.sub(r'\s+', ' ', cleantext)
    return cleantext.strip()

def fetch_rss_feed(url: str, category: str) -> list[dict]:
    """Belirtilen RSS beslemesinden haberleri çeker."""
    items = []
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = response.read()
            try:
                xml_str = data.decode("utf-8")
            except UnicodeDecodeError:
                xml_str = data.decode("iso-8859-9", errors="ignore")
            
            # XML parsing
            root = ET.fromstring(xml_str)
            channel = root.find('channel')
            if channel is not None:
                for item in channel.findall('item')[:10]:
                    title_elem = item.find('title')
                    desc_elem = item.find('description')
                    link_elem = item.find('link')
                    
                    title = title_elem.text if title_elem is not None else ""
                    desc = clean_html(desc_elem.text) if desc_elem is not None else ""
                    link = link_elem.text if link_elem is not None else ""
                    
                    if title:
                        items.append({
                            "title": title.strip(),
                            "summary": desc[:250] + "..." if len(desc) > 250 else desc,
                            "source_url": link.strip(),
                            "source_name": "TRT Haber" if "trthaber" in url else "BBC Türkçe",
                            "category": category
                        })
    except Exception:
        # Hata durumunda boş liste dön, sistem çökmesin
        pass
    return items


class BriefingService:
    """Handles generation and retrieval of daily briefings using live news."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize the briefing service with a database session."""
        self.db = db

    async def get_or_create_briefing(self, user_id: str, target_date: date) -> DailyBriefing:
        """Fetch briefing for a given date, or generate a personalized one."""
        result = await self.db.execute(
            select(DailyBriefing)
            .where(DailyBriefing.user_id == user_id, DailyBriefing.date == target_date)
            .options(selectinload(DailyBriefing.items))
        )
        briefing = result.scalars().first()

        if briefing:
            return briefing

        # Gelecek tarihlerin oluşturulmasını engelle (Bugün veya geçmiş olmalı)
        if target_date > date.today():
            raise ValueError("Gelecekteki günlerin özeti henüz oluşturulamaz.")

        # Yeni bir gerçek özet oluştur
        return await self.generate_live_briefing(user_id, target_date)

    async def generate_live_briefing(self, user_id: str, target_date: date) -> DailyBriefing:
        """RSS feed'lerinden gerçek haberleri toplayıp ilgi alanlarına göre puanlar."""
        # Container oluştur
        briefing = DailyBriefing(
            user_id=user_id,
            date=target_date,
            status="ready",
        )
        self.db.add(briefing)
        await self.db.flush()

        # Kullanıcı verilerini çek
        user_res = await self.db.execute(
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.interests),
                selectinload(User.learning_goals),
                selectinload(User.career_goals),
            )
        )
        user = user_res.scalars().first()
        if not user:
            raise ValueError("User not found")

        interests: Sequence[UserInterest] = user.interests
        learning_goals: Sequence[LearningGoal] = user.learning_goals
        career_goals: Sequence[CareerGoal] = user.career_goals

        # ── 1. RSS HABERLERİNİ ÇEK ──
        rss_feeds = [
            ("https://www.trthaber.com/gundem_articles.rss", "gündem"),
            ("https://www.trthaber.com/ekonomi_articles.rss", "ekonomi"),
            ("https://www.trthaber.com/bilim_teknoloji_articles.rss", "teknoloji"),
            ("https://www.trthaber.com/saglik_articles.rss", "sağlık"),
            ("https://www.trthaber.com/spor_articles.rss", "spor"),
        ]

        all_news = []
        for url, category in rss_feeds:
            news_items = fetch_rss_feed(url, category)
            all_news.extend(news_items)

        # Haber bulunamazsa acil durum fallback'i (boş kalmasın)
        if not all_news:
            all_news = [
                {
                    "title": "Taro Haber Servisi Başlatıldı",
                    "summary": "Canlı haber kaynaklarına şu an ulaşılamıyor. Haber akışınızı ve internet bağlantınızı kontrol edin.",
                    "source_url": "https://github.com/TarikAnafarta/taro",
                    "source_name": "Sistem",
                    "category": "gündem"
                }
            ]

        # ── 2. KİŞİSELLEŞTİRİLMİŞ PUANLAMA ALGORİTMASI ──
        scored_news = []
        for news in all_news:
            # Başlangıç skoru
            score = 0.50
            
            # Kategori eşleşmesi (+0.15)
            user_categories = [i.category.lower() for i in interests]
            if news["category"] in user_categories:
                score += 0.15

            # Anahtar kelime / konu eşleşmesi
            for interest in interests:
                topic = interest.topic.lower()
                # Haber başlığında veya özetinde kelime geçiyor mu?
                if topic in news["title"].lower() or topic in news["summary"].lower():
                    # Öncelik değerini de hesaba kat (+0.25 taban + priority puanı)
                    bonus = 0.20 + (interest.priority * 0.05)
                    score += bonus

            # Maksimum 1.00 ile sınırla
            news["relevance_score"] = min(round(score, 2), 1.00)
            scored_news.append(news)

        # Skorlarına göre azalan sırada sırala
        scored_news.sort(key=lambda x: x["relevance_score"], reverse=True)

        items_to_add: list[BriefingItem] = []
        sort_order = 0

        # ── 3. GÜNÜN ODAĞI OLUŞTUR (İlgi & Hedeflere göre) ──
        focus_title = "Günlük Plan ve Odaklanma"
        focus_summary = "Bugün kişisel ilgi alanlarınızı gözden geçirebilir ve Taro Asistan ile günün planını yapabilirsiniz."
        
        if learning_goals:
            active_goals = [g for g in learning_goals if g.status == "active"]
            if active_goals:
                g = random.choice(active_goals)
                focus_title = f"Öğrenme Odağı: {g.topic}"
                focus_summary = f"Bugün '{g.topic}' hedefinize 30 dakika zaman ayırın. Araştırma yapabilir veya asistanınızdan bir çalışma planı isteyebilirsiniz."
        elif career_goals:
            active_careers = [c for c in career_goals if c.status == "active"]
            if active_careers:
                c = random.choice(active_careers)
                focus_title = f"Kariyer Hedefi: {c.goal}"
                focus_summary = f"'{c.goal}' hedefinize ulaşmak için bugün küçük bir adım atın. Yol haritası çıkarmasını Taro Asistan'dan isteyebilirsiniz."

        items_to_add.append(
            BriefingItem(
                briefing_id=briefing.id,
                category="focus",
                title=focus_title,
                summary=focus_summary,
                relevance_score=1.00,
                sort_order=sort_order,
            )
        )
        sort_order += 1

        # ── 4. EN YÜKSEK PUANLI HABERLERİ EKLE (Maksimum 5 adet) ──
        # Aynı başlıkta mükerrer haberlerin eklenmesini engelle
        seen_titles = set()
        added_count = 0
        for news in scored_news:
            if added_count >= 5:
                break
            
            clean_title = news["title"].lower().strip()
            if clean_title in seen_titles:
                continue
            
            seen_titles.add(clean_title)
            items_to_add.append(
                BriefingItem(
                    briefing_id=briefing.id,
                    category=news["category"],
                    title=news["title"],
                    summary=news["summary"],
                    source_name=news["source_name"],
                    source_url=news["source_url"],
                    relevance_score=news["relevance_score"],
                    sort_order=sort_order,
                )
            )
            sort_order += 1
            added_count += 1

        # DB'ye ekle
        for item in items_to_add:
            self.db.add(item)
        
        await self.db.commit()
        await self.db.refresh(briefing)

        return briefing
