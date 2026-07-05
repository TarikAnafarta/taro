'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { briefing, profile } from '@/lib/api';
import type { DailyBriefing } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [interestsCount, setInterestsCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const [careerCount, setCareerCount] = useState(0);
  const [todayBriefing, setTodayBriefing] = useState<DailyBriefing | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'like' | 'dislike'>>({});

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [profData, ints, learns, careers, todayB] = await Promise.all([
          profile.get(),
          profile.getInterests(),
          profile.getLearningGoals(),
          profile.getCareerGoals(),
          briefing.getToday().catch(() => null),
        ]);
        
        setUserProfile(profData);
        setInterestsCount(ints.length);
        setLearningCount(learns.filter(l => l.status === 'active').length);
        setCareerCount(careers.filter(c => c.status === 'active').length);
        setTodayBriefing(todayB);
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Günaydın';
    if (hrs < 18) return 'İyi Günler';
    return 'İyi Akşamlar';
  };

  const handleFeedback = async (itemId: string, type: 'like' | 'dislike') => {
    try {
      await briefing.sendFeedback(itemId, type);
      setFeedbackSent(prev => ({ ...prev, [itemId]: type }));
    } catch (err) {
      console.error("Feedback gönderilemedi:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const focusItem = todayBriefing?.items.find(item => item.category === 'focus');
  const newsItems = todayBriefing?.items.filter(item => item.category !== 'focus') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Karşılama ve Durum */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#fff' }}>
            {getGreeting()}, {userProfile?.display_name || user?.username || 'Operatör'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            Taro aktif. Kişisel Yapay Zeka Asistanı ve Bilgi Merkezi.
          </p>
        </div>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          Küme Durumu: Sağlıklı
        </div>
      </div>

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--color-primary)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>İlgi Alanları</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{interestsCount}</span>
        </div>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid var(--color-accent)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Aktif Öğrenme</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{learningCount}</span>
        </div>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Kariyer Hedefleri</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{careerCount}</span>
        </div>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ağ Gecikmesi</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>12ms</span>
        </div>
      </div>

      {/* Bugünün Odak Kartı */}
      <div className="card card-glass" style={{ padding: '2rem', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(17, 24, 39, 0.8))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎯 BUGÜNÜN ANA ODAĞI
        </h3>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
          {focusItem?.title || 'Günlük akışınızı yenileyin'}
        </h4>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {focusItem?.summary || 'Canlı haber kaynaklarından bugünün önemli gelişmelerini ve özetlerini getirmek için günlük özet akışınızı yenileyin.'}
        </p>
      </div>

      {/* Yan Yana Grid: Hızlı Menü & Canlı Haber Akışı */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sol Sütun: Hızlı İşlemler */}
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>Hızlı İşlemler</h3>
          <Link href="/briefing" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>Günlük Özete Git</Link>
          <Link href="/chat" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>Taro Asistan'a Sor</Link>
          <Link href="/system" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>Sistem Durumu</Link>
        </div>

        {/* Sağ Sütun: Canlı Haber Akışı */}
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Canlı Haber Akışınız</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>TRT & BBC Haber Kanalları</span>
          </h3>

          {newsItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {newsItems.map((item) => {
                const hasLiked = feedbackSent[item.id] === 'like';
                const hasDisliked = feedbackSent[item.id] === 'dislike';
                return (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Eşleşme: {Math.round(item.relevance_score * 100)}%
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>{item.title}</h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {item.summary}
                    </p>
                    
                    {/* Hızlı Beğeni / Beğenmeme */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleFeedback(item.id, 'like')}
                        disabled={!!feedbackSent[item.id]}
                        style={{
                          background: hasLiked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                          border: hasLiked ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          color: hasLiked ? '#10b981' : 'var(--color-text-muted)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        👍 İlgimi Çekti
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, 'dislike')}
                        disabled={!!feedbackSent[item.id]}
                        style={{
                          background: hasDisliked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                          border: hasDisliked ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                          color: hasDisliked ? '#ef4444' : 'var(--color-text-muted)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        👎 İlgimi Çekmedi
                      </button>
                      {feedbackSent[item.id] && (
                        <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Tercih kaydedildi</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <span style={{ display: 'block', fontSize: '2rem', marginBottom: '0.5rem' }}>📰</span>
              Haber akışı henüz yüklenmemiş.
              <Link href="/briefing" style={{ display: 'block', color: 'var(--color-primary)', marginTop: '0.5rem', textDecoration: 'underline' }}>
                Haberleri almak için tıklayın
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
