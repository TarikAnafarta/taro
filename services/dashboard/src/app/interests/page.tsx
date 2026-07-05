'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { profile } from '@/lib/api';
import type { InterestTopic } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function InterestsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const interestCategories = {
    'Gündem': ['Dünya Gündemi', 'Çevre & İklim', 'Bilimsel Keşifler', 'Toplumsal Olaylar'],
    'Ekonomi': ['Finans & Yatırım', 'Kişisel Finans', 'Girişimcilik', 'Küresel Piyasalar'],
    'Teknoloji': ['Yapay Zeka', 'Akıllı Teknolojiler', 'Yazılım & Programlama', 'Siber Güvenlik'],
    'Bilim': ['Uzay & Astronomi', 'Nörobilim', 'Psikoloji', 'Felsefe'],
    'Sağlık & Yaşam': ['Fitness & Egzersiz', 'Sağlıklı Beslenme', 'Kişisel Gelişim', 'Yoga & Meditasyon'],
    'Kültür & Sanat': ['Edebiyat & Kitaplar', 'Sinema & Tiyatro', 'Müzik', 'Tarih'],
    'Spor': ['Futbol', 'Basketbol', 'Tenis', 'Doğa Sporları'],
  };

  useEffect(() => {
    async function loadInterests() {
      try {
        const data = await profile.getInterests();
        setSelectedTopics(data.map((i) => i.topic));
      } catch (err) {
        console.error('İlgi alanları yüklenemedi', err);
      } finally {
        setLoading(false);
      }
    }
    loadInterests();
  }, []);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customInterest.trim();
    if (val && !selectedTopics.includes(val)) {
      setSelectedTopics((prev) => [...prev, val]);
      setCustomInterest('');
    }
  };

  const handleRemoveCustom = (topic: string) => {
    setSelectedTopics((prev) => prev.filter((t) => t !== topic));
  };

  const handleSave = async () => {
    if (selectedTopics.length < 3) {
      setMessage({ type: 'error', text: 'Lütfen en az 3 ilgi alanı seçin.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    // 1. İlgi alanları payload'u hazırla
    const interestsPayload: InterestTopic[] = selectedTopics.map((topic) => {
      let category = 'Genel';
      for (const [cat, topics] of Object.entries(interestCategories)) {
        if (topics.includes(topic)) {
          category = cat;
          break;
        }
      }
      return {
        category,
        topic,
        is_custom: !Object.values(interestCategories).flat().includes(topic),
        priority: 1,
      };
    });

    // 2. Haber tercihleri payload'u hazırla ve otomatik eşle
    const newsOptions = ['gündem', 'ekonomi', 'teknoloji', 'sağlık', 'spor', 'bilim', 'kültür-sanat'];
    const selectedLower = selectedTopics.map((t) => t.toLowerCase());
    const newsPayload = newsOptions.map((opt) => {
      const isMatch = selectedLower.some((interest) => {
        if (opt === 'gündem' && (interest.includes('gündem') || interest.includes('olaylar'))) return true;
        if (opt === 'ekonomi' && (interest.includes('finans') || interest.includes('piyasalar') || interest.includes('girişim'))) return true;
        if (opt === 'teknoloji' && (interest.includes('teknoloji') || interest.includes('yapay') || interest.includes('yazılım'))) return true;
        if (opt === 'sağlık' && (interest.includes('sağlık') || interest.includes('beslenme') || interest.includes('yoga'))) return true;
        if (opt === 'spor' && (interest.includes('spor') || interest.includes('futbol') || interest.includes('tenis'))) return true;
        if (opt === 'bilim' && (interest.includes('bilim') || interest.includes('uzay') || interest.includes('nöro') || interest.includes('felsefe'))) return true;
        if (opt === 'kültür-sanat' && (interest.includes('edebiyat') || interest.includes('sinema') || interest.includes('müzik') || interest.includes('sanat'))) return true;
        return false;
      });
      return {
        topic: opt,
        frequency: 'daily' as const,
        is_active: isMatch,
      };
    });

    try {
      await Promise.all([
        profile.updateInterests(interestsPayload),
        profile.updateNewsPreferences(newsPayload),
      ]);
      setMessage({ type: 'success', text: 'İlgi alanlarınız ve haber tercihleriniz başarıyla güncellendi.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.detail || 'Değişiklikler kaydedilemedi. Lütfen tekrar deneyin.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Özel ilgi alanlarını bul (predefined olmayanlar)
  const allPredefined = Object.values(interestCategories).flat();
  const customSelected = selectedTopics.filter((t) => !allPredefined.includes(t));

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      animation: 'fadeIn 0.3s ease',
      width: '100%'
    }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
          İlgi Alanlarınızı Düzenleyin
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>
          Haber akışınız ve asistanınız seçtiğiniz ilgi alanlarına göre otomatik şekillenir.
        </p>
      </div>

      {message && (
        <div style={{
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: message.type === 'success' ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          {message.text}
        </div>
      )}

      {/* İlgi Alanları Listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {Object.entries(interestCategories).map(([category, topics]) => (
          <div key={category} className="card" style={{ background: '#0d111d', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {category}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {topics.map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    style={{
                      background: isSelected ? '#fff' : 'transparent',
                      border: `1px solid ${isSelected ? '#fff' : 'rgba(255, 255, 255, 0.15)'}`,
                      color: isSelected ? '#070913' : 'var(--color-text-secondary, #9ca3af)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Özel İlgi Alanları Ekleme */}
        <div className="card" style={{ background: '#0d111d', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Özel İlgi Alanı Ekle
          </h3>
          <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="Örn: Kripto Paralar, Mimarlık, Satranç..."
              style={{
                flex: 1,
                background: '#141a29',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="btn"
              style={{
                background: '#fff',
                color: '#070913',
                fontWeight: 600,
                padding: '0 1.5rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Ekle
            </button>
          </form>

          {/* Eklenen Özel Alanlar */}
          {customSelected.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {customSelected.map((topic) => (
                <div
                  key={topic}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#141a29',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  <span>{topic}</span>
                  <button
                    onClick={() => handleRemoveCustom(topic)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-danger, #ef4444)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)' }}>
              Henüz özel bir ilgi alanı eklemediniz.
            </p>
          )}
        </div>
      </div>

      {/* Kaydetme Butonu */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
        <Link href="/" className="btn btn-secondary" style={{ padding: '12px 24px', borderRadius: '8px' }}>
          Geri Dön
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn"
          style={{
            background: '#fff',
            color: '#070913',
            fontWeight: 600,
            padding: '12px 28px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
}
