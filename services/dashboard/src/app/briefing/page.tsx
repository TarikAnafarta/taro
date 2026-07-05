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
    } catch (err: any) {
      // If 404, we just set briefing to null rather than showing block error
      if (err.status === 404) {
        setBriefing(null);
      } else {
        setError(err.detail || 'Failed to fetch daily briefing');
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
    } catch (err: any) {
      setError(err.detail || 'Failed to generate briefing');
    } finally {
      setGenerating(false);
    }
  };

  const navigateDay = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    setCurrentDate(newDate);
  };

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'focus':
        return { icon: '🎯', label: 'Today\'s focus', color: 'var(--color-accent, #8b5cf6)', border: '1px solid rgba(139, 92, 246, 0.3)' };
      case 'news':
        return { icon: '📰', label: 'AI & Tech News', color: 'var(--color-primary, #3b82f6)', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'github':
        return { icon: '📊', label: 'GitHub Trending', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'learning':
        return { icon: '📚', label: 'Learning Tracks', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' };
      case 'career':
        return { icon: '💼', label: 'Career Growth', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'fitness':
        return { icon: '💪', label: 'Health & Fitness', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' };
      default:
        return { icon: '💡', label: 'Information', color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.08)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Page Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigateDay(-1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>◀</button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
            {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          <button onClick={() => navigateDay(1)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>▶</button>
        </div>

        <button
          onClick={handleGenerate}
          className="btn btn-primary"
          disabled={generating}
          id="generate-briefing-btn"
        >
          {generating ? 'Regenerating...' : '🔄 Generate Briefing'}
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
          {/* Render Focus first if it exists */}
          {briefing.items.filter(i => i.category === 'focus').map((item) => {
            const theme = getCategoryTheme(item.category);
            return (
              <div
                key={item.id}
                className="card card-glass"
                style={{
                  padding: '2rem',
                  borderLeft: `4px solid ${theme.color}`,
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(17, 24, 39, 0.7))'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: theme.color, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {theme.icon} {theme.label}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#fff', fontWeight: 700 }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {item.summary}
                </p>
              </div>
            );
          })}

          {/* Render rest of categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {briefing.items.filter(i => i.category !== 'focus').map((item) => {
              const theme = getCategoryTheme(item.category);
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
                    minHeight: '200px'
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
                        Rel: {Math.round(item.relevance_score * 100)}%
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
                      {item.title}
                    </h3>
                    <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {item.summary}
                    </p>
                  </div>

                  {item.source_url && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Source: {item.source_name || 'Web'}
                      </span>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-primary)' }}
                      >
                        Read Link ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card card-glass" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>📭</span>
          <h3 style={{ margin: 0, color: '#fff' }}>No briefing logs for this date</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: '400px', fontSize: '0.95rem' }}>
            It looks like no briefing has been generated for this date. Click generate to construct a personalized mock summary.
          </p>
          <button onClick={handleGenerate} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Generate Briefing
          </button>
        </div>
      )}
    </div>
  );
}
