'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { briefing, profile } from '@/lib/api';
import type { DailyBriefing, UserProfile, InterestTopic, LearningGoal, CareerGoal } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [interestsCount, setInterestsCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const [careerCount, setCareerCount] = useState(0);
  const [todayBriefing, setTodayBriefing] = useState<DailyBriefing | null>(null);

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
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Find focus item in briefing
  const focusItem = todayBriefing?.items.find(item => item.category === 'focus');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Greetings block */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#fff' }}>
          {getGreeting()}, {userProfile?.display_name || user?.username || 'Operator'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
          Taro is active. Cluster status: Healthy.
        </p>
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tracked Interests</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{interestsCount}</span>
        </div>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Learning Tracks</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>{learningCount}</span>
        </div>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Career Objectives</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{careerCount}</span>
        </div>
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Node Latency</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>12ms</span>
        </div>
      </div>

      {/* Today's Focus Card */}
      <div className="card card-glass" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎯 TODAY'S PRINCIPAL FOCUS
        </h3>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>
          {focusItem?.title || 'System initialization complete'}
        </h4>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {focusItem?.summary || 'Review your interests and configure news crawlers to populate your briefings.'}
        </p>
      </div>

      {/* Dashboard Actions and Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Quick actions panel */}
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Quick Actions</h3>
          <Link href="/briefing" className="btn btn-primary" style={{ width: '100%' }}>View Briefing</Link>
          <Link href="/chat" className="btn btn-secondary" style={{ width: '100%' }}>Consult Assistant</Link>
          <Link href="/system" className="btn btn-secondary" style={{ width: '100%' }}>Check Node Health</Link>
        </div>

        {/* Briefing summary list */}
        <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Today's Briefing Stream</h3>
          {todayBriefing && todayBriefing.items.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todayBriefing.items.filter(item => item.category !== 'focus').slice(0, 3).map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Relevance: {Math.round(item.relevance_score * 100)}%
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{item.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Briefing stream is currently empty. Run a briefing generation task.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
