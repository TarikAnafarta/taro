'use client';

import React, { useEffect, useState } from 'react';
import { briefing as briefingApi } from '@/lib/api';
import type { DailyBriefing, BriefingItem } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DailyBriefingPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'like' | 'dislike'>>({});

  const formatDateString = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const loadBriefing = async (d: Date) => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = formatDateString(d);
      const res = await briefingApi.getByDate(dateStr);
      setBriefing(res);
      
      const newFeedback: Record<string, 'like' | 'dislike'> = {};
      if (res.items) {
        res.items.forEach((item: any) => {
          if (item.feedback) {
            newFeedback[item.id] = item.feedback as 'like' | 'dislike';
          }
        });
      }
      setFeedbackSent(newFeedback);
    } catch (err: any) {
      if (err.status === 404) {
        setBriefing(null);
      } else {
        setError(err.detail || 'Günlük özet alınamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing(currentDate);
  }, [currentDate]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await briefingApi.generate();
      setBriefing(res);
      
      const newFeedback: Record<string, 'like' | 'dislike'> = {};
      if (res.items) {
        res.items.forEach((item: any) => {
          if (item.feedback) {
            newFeedback[item.id] = item.feedback as 'like' | 'dislike';
          }
        });
      }
      setFeedbackSent(newFeedback);
    } catch (err: any) {
      setError(err.detail || 'Özet oluşturulamadı');
    } finally {
      setGenerating(false);
    }
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const navigateDay = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    
    // Gelecek tarih engelleme kontrolü
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(newDate);
    target.setHours(0, 0, 0, 0);

    if (target > today) {
      return; 
    }
    setCurrentDate(newDate);
  };

  const handleFeedback = async (itemId: string, type: 'like' | 'dislike') => {
    try {
      await briefingApi.sendFeedback(itemId, type);
      setFeedbackSent(prev => ({ ...prev, [itemId]: type }));
    } catch (err: any) {
      console.error("Geri bildirim gönderilemedi:", err);
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'focus':
        return { icon: '🎯', label: 'Bugünün Odağı', color: 'var(--color-accent, #8b5cf6)' };
      case 'gündem':
        return { icon: '📰', label: 'Gündem', color: 'var(--color-primary, #3b82f6)' };
      case 'teknoloji':
        return { icon: '💻', label: 'Teknoloji & Bilim', color: '#00d2ff' };
      case 'ekonomi':
        return { icon: '💰', label: 'Ekonomi & Finans', color: '#10b981' };
      case 'sağlık':
        return { icon: '🥦', label: 'Sağlık & Yaşam', color: '#ec4899' };
      case 'spor':
        return { icon: '⚽', label: 'Spor', color: '#f59e0b' };
      default:
        return { icon: '💡', label: category, color: 'var(--color-text-secondary)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Sayfa Başlığı ve Kontroller */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigateDay(-1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>◀</button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
            {currentDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          <button 
            onClick={() => navigateDay(1)} 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px' }}
            disabled={isToday(currentDate)}
          >
            ▶
          </button>
        </div>

        <button
          onClick={handleGenerate}
          className="btn btn-primary"
          disabled={generating}
          id="generate-briefing-btn"
        >
          {generating ? 'Haberler Alınıyor...' : '🔄 Haberleri Yenile'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--color-danger, #ef4444)',
          padding: '1rem',
          borderRadius: '12px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', height: '40vh', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : briefing && briefing.items.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* Diğer kategoriler */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {briefing.items.filter(i => i.category !== 'focus').map((item) => {
              const theme = getCategoryTheme(item.category);
              const hasLiked = feedbackSent[item.id] === 'like';
              const hasDisliked = feedbackSent[item.id] === 'dislike';
              
              return (
                <div
                  key={item.id}
                  className="card card-glass"
                  style={{
                    padding: '1.5rem',
                    borderTop: `3px solid ${theme.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '220px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ color: theme.color, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {theme.icon} {theme.label}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        color: 'var(--color-text-secondary)'
                      }}>
                        Eşleşme: {Math.round(item.relevance_score * 100)}%
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
                      {item.title}
                    </h3>
                    <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {item.summary}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
                    {/* Like / Dislike Butonları */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <button
                        onClick={() => handleFeedback(item.id, 'like')}
                        disabled={!!feedbackSent[item.id]}
                        style={{
                          background: hasLiked ? 'var(--color-success-light)' : 'var(--bg-input)',
                          border: hasLiked ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                          color: hasLiked ? 'var(--color-success)' : 'var(--color-text-secondary)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          opacity: (feedbackSent[item.id] && !hasLiked) ? 0.5 : 1
                        }}
                      >
                        👍 İlgimi Çekti
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, 'dislike')}
                        disabled={!!feedbackSent[item.id]}
                        style={{
                          background: hasDisliked ? 'var(--color-danger-light)' : 'var(--bg-input)',
                          border: hasDisliked ? '1px solid var(--color-danger)' : '1px solid var(--color-border)',
                          color: hasDisliked ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          opacity: (feedbackSent[item.id] && !hasDisliked) ? 0.5 : 1
                        }}
                      >
                        👎 İlgimi Çekmedi
                      </button>
                      {feedbackSent[item.id] && (
                         <span style={{ fontSize: '0.75rem', color: '#10b981', alignSelf: 'center', marginLeft: 'auto' }}>
                           Kaydedildi!
                         </span>
                      )}
                    </div>

                    {item.source_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Kaynak: {item.source_name || 'Web'}
                        </span>
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-primary)' }}
                        >
                          Bağlantıyı Aç ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card card-glass" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>📭</span>
          <h3 style={{ margin: 0, color: '#fff' }}>Bugün için özet bulunamadı</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: '400px', fontSize: '0.95rem' }}>
            Güncel haber kaynaklarından canlı haberleri çekip kişiselleştirilmiş özetinizi oluşturmak için aşağıdaki butona tıklayın.
          </p>
          <button onClick={handleGenerate} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Haberleri Getir & Özetle
          </button>
        </div>
      )}
    </div>
  );
}
