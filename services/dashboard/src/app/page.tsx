'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { briefing, profile } from '@/lib/api';
import type { DailyBriefing } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <DashboardHome />;
}

// ── Minimalist Landing Page ──────────────────────────────────
function LandingPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#070913',
      color: '#fff',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'var(--font-inter, sans-serif)'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2.5rem 2rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#0d111d',
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 700,
          margin: '0 0 1rem 0',
          letterSpacing: '-0.04em',
          color: '#fff'
        }}>
          Taro
        </h1>
        <p style={{
          fontSize: '0.95rem',
          color: 'var(--color-text-secondary, #9ca3af)',
          lineHeight: 1.6,
          margin: '0 0 2.5rem 0'
        }}>
          İkinci beyniniz. Kişisel yapay zeka asistanı ve ilgi alanlarınıza göre derlenmiş minimalist bilgi merkezi.
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          width: '100%'
        }}>
          <Link href="/login" className="btn" style={{
            background: '#fff',
            color: '#070913',
            fontWeight: 600,
            padding: '12px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            textAlign: 'center'
          }}>
            Giriş Yap
          </Link>
          <Link href="/register" className="btn" style={{
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontWeight: 600,
            padding: '12px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            textAlign: 'center'
          }}>
            Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Authenticated Dashboard Home ─────────────────────────────
function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayBriefing, setTodayBriefing] = useState<DailyBriefing | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'like' | 'dislike'>>({});

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [profData, todayB] = await Promise.all([
          profile.get(),
          briefing.getToday().catch(() => null),
        ]);
        
        setUserProfile(profData);
        setTodayBriefing(todayB);
        
        const newFeedback: Record<string, 'like' | 'dislike'> = {};
        if (todayB?.items) {
          todayB.items.forEach((item: any) => {
            if (item.feedback) {
              newFeedback[item.id] = item.feedback as 'like' | 'dislike';
            }
          });
        }
        setFeedbackSent(newFeedback);
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();

    // 15 Dakikada bir (900000 ms) otomatik yenileme (POST isteği atarak)
    const interval = setInterval(async () => {
      try {
        const res = await briefing.generate();
        setTodayBriefing(res);
        
        const newFeedback: Record<string, 'like' | 'dislike'> = {};
        if (res?.items) {
          res.items.forEach((item: any) => {
            if (item.feedback) {
              newFeedback[item.id] = item.feedback as 'like' | 'dislike';
            }
          });
        }
        setFeedbackSent(newFeedback);
      } catch (err) {
        console.error("Otomatik yenileme başarısız:", err);
      }
    }, 900000);

    return () => clearInterval(interval);
  }, []);

  const handleFeedback = async (itemId: string, type: 'like' | 'dislike') => {
    const currentFeedback = feedbackSent[itemId];
    const newFeedback = currentFeedback === type ? null : type;

    try {
      if (newFeedback) {
        await briefing.sendFeedback(itemId, newFeedback);
        setFeedbackSent(prev => ({ ...prev, [itemId]: newFeedback }));
      } else {
        setFeedbackSent(prev => {
          const updated = { ...prev };
          delete updated[itemId];
          return updated;
        });
      }
    } catch (err) {
      console.error("Feedback güncellenemedi:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const newsItems = todayBriefing?.items.filter(item => item.category !== 'focus') || [];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem',
      maxWidth: '800px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease',
      width: '100%'
    }}>
      {/* Karşılama Başlığı */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Merhaba, {userProfile?.display_name || user?.username || 'Kullanıcı'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>
            İlgi alanlarınıza göre güncellenen en son gelişmeler ve haberler.
          </p>
        </div>
        <Link href="/interests" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
          İlgi Alanlarını Düzenle
        </Link>
      </div>

      {/* Canlı Haber Akışı */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {newsItems.length > 0 ? (
          newsItems.map((item) => {
            const hasLiked = feedbackSent[item.id] === 'like';
            const hasDisliked = feedbackSent[item.id] === 'dislike';
            const isHighlyRelevant = item.relevance_score > 0.8;
            return (
              <div 
                key={item.id} 
                className={`card card-interactive ${isHighlyRelevant ? 'animate-slideUp' : ''}`}
                style={{
                  background: 'var(--bg-card)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: isHighlyRelevant ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  boxShadow: isHighlyRelevant ? 'var(--shadow-glow-primary)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isHighlyRelevant ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: isHighlyRelevant ? 'bold' : 'normal' }}>
                    Eşleşme: {Math.round(item.relevance_score * 100)}%
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.4 }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {item.summary}
                </p>
                
                {/* Geri Bildirim Butonları */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', width: '100%' }}>
                  <button
                    onClick={() => handleFeedback(item.id, 'like')}
                    style={{
                      background: hasLiked ? 'var(--color-primary-light)' : 'transparent',
                      border: `1px solid ${hasLiked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      color: hasLiked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    İlgimi Çekti
                  </button>
                  <button
                    onClick={() => handleFeedback(item.id, 'dislike')}
                    style={{
                      background: hasDisliked ? 'var(--color-danger-light)' : 'transparent',
                      border: `1px solid ${hasDisliked ? 'var(--color-danger)' : 'var(--color-border)'}`,
                      color: hasDisliked ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    İlgimi Çekmedi
                  </button>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        marginLeft: 'auto',
                      }}
                    >
                      Bağlantıyı Aç
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            border: '1px dashed var(--color-border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Haber akışınız henüz hazır değil. İlgi alanlarınıza göre haberleri derlemek için Günlük Özet sayfasını ziyaret edebilir veya ilgi alanlarınızı düzenleyebilirsiniz.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Link href="/briefing" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                Özet Oluştur
              </Link>
              <Link href="/interests" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                İlgi Alanları
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
