'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { onboarding } from '@/lib/api';
import type { UserProfile, InterestTopic, NewsPreference, LearningGoal, CareerGoal } from '@/lib/types';
import styles from './OnboardingPage.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Adım 1: Profil Durumu ---
  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    preferred_language: 'tr',
    timezone: 'UTC',
    country: '',
    occupation: '',
    professional_status: 'professional',
  });

  // Saat dilimini otomatik algıla
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setProfile((prev) => ({ ...prev, timezone: tz }));
      }
    } catch {}
  }, []);

  // --- Adım 2: İlgi Alanları Durumu ---
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  const interestCategories = {
    '💻 Teknoloji': ['Yapay Zeka', 'Programlama', 'Siber Güvenlik', 'DevOps', 'Kubernetes', 'Bulut', 'Açık Kaynak', 'GitHub'],
    '💰 İş Dünyası': ['Girişimcilik', 'Ekonomi', 'Finans', 'Kripto Para'],
    '🎵 Müzik': ['Gitar', 'Bas', 'Piyano', 'Davul', 'Müzik'],
    '💪 Sağlık': ['Fitness', 'Vücut Geliştirme', 'Beslenme'],
    '⚽ Spor': ['Basketbol', 'Futbol', 'Formula 1'],
    '🎬 Eğlence': ['Filmler', 'Oyunlar'],
    '🧠 Bilim': ['Nörobilim', 'Bilişsel Bilim', 'Psikoloji', 'Felsefe'],
    '📈 Verimlilik': ['Verimlilik'],
  };

  const toggleInterest = (topic: string) => {
    setSelectedInterests((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const addCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests((prev) => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  // --- Adım 3: Haber Tercihleri Durumu ---
  const newsOptions = [
    'YZ haberleri', 'yazılım geliştirme haberleri', 'siber güvenlik haberleri', 'DevOps haberleri',
    'ekonomi haberleri', 'finans haberleri', 'spor haberleri', 'müzik haberleri', 'GitHub trendleri',
    'Hacker News öne çıkanlar', 'Reddit trendleri', 'araştırma makaleleri', 'girişim haberleri'
  ];

  const [newsPrefs, setNewsPrefs] = useState<Record<string, { active: boolean; frequency: 'daily' | 'every_6h' | 'weekly' }>>(
    newsOptions.reduce((acc, opt) => {
      acc[opt] = { active: false, frequency: 'daily' };
      return acc;
    }, {} as any)
  );

  // Seçilen ilgilere göre haber tercihlerini önceden doldur
  useEffect(() => {
    setNewsPrefs((prev) => {
      const updated = { ...prev };
      const selectedLower = selectedInterests.map(i => i.toLowerCase());

      newsOptions.forEach(opt => {
        const isMatch = selectedLower.some(interest => {
          if (opt.includes('yz') && (interest.includes('yapay') || interest.includes('ai'))) return true;
          if (opt.includes('yazılım') && interest.includes('programlama')) return true;
          if (opt.includes('siber') && interest.includes('siber')) return true;
          if (opt.includes('devops') && interest.includes('devops')) return true;
          if (opt.includes('ekonomi') && (interest.includes('ekonomi') || interest.includes('finans'))) return true;
          if (opt.includes('spor') && (interest.includes('ball') || interest.includes('formula') || interest.includes('basketbol') || interest.includes('futbol'))) return true;
          if (opt.includes('müzik') && (interest.includes('müzik') || interest.includes('gitar') || interest.includes('bas') || interest.includes('davul'))) return true;
          if (opt.includes('github') && interest.includes('github')) return true;
          if (opt.includes('girişim') && interest.includes('girişim')) return true;
          return false;
        });
        if (isMatch) {
          updated[opt] = { ...updated[opt], active: true };
        }
      });
      return updated;
    });
  }, [selectedInterests]);

  const toggleNews = (opt: string) => {
    setNewsPrefs((prev) => ({
      ...prev,
      [opt]: { ...prev[opt], active: !prev[opt].active }
    }));
  };

  const handleFrequencyChange = (opt: string, val: 'daily' | 'every_6h' | 'weekly') => {
    setNewsPrefs((prev) => ({
      ...prev,
      [opt]: { ...prev[opt], frequency: val }
    }));
  };

  // --- Adım 4: Öğrenme Hedefleri Durumu ---
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');

  const suggestedGoals = [
    'Kubernetes', 'Docker', 'Linux', 'Ağ Güvenliği', 'React', 'Python', 'Go', 'Rust', 'YZ Ajanları', 'OpenTelemetry', 'Siber Güvenlik', 'Algoritmalar'
  ];

  const toggleGoal = (goal: string) => {
    setLearningGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const addCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (customGoal.trim() && !learningGoals.includes(customGoal.trim())) {
      setLearningGoals((prev) => [...prev, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  // --- Adım 5: Kariyer Hedefleri Durumu ---
  const [careerGoals, setCareerGoals] = useState<string[]>([]);
  const [customCareer, setCustomCareer] = useState('');

  const suggestedCareers = [
    'staj bul', 'uzaktan iş bul', 'DevOps mühendisi ol', 'güvenlik mühendisi ol',
    'backend mühendisi ol', 'açık kaynak proje geliştir', 'startup kur', 'YouTube içeriği oluştur', 'GitHub profilini geliştir'
  ];

  const toggleCareer = (career: string) => {
    setCareerGoals((prev) =>
      prev.includes(career) ? prev.filter((c) => c !== career) : [...prev, career]
    );
  };

  const addCustomCareer = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCareer.trim() && !careerGoals.includes(customCareer.trim())) {
      setCareerGoals((prev) => [...prev, customCareer.trim()]);
      setCustomCareer('');
    }
  };

  // --- Adım 6: Tamamlama ---
  const handleComplete = async () => {
    setError(null);
    setIsSubmitting(true);

    // İlgileri biçimlendir
    const interestsPayload: InterestTopic[] = selectedInterests.map((topic) => {
      let category = 'Teknoloji';
      for (const [cat, topics] of Object.entries(interestCategories)) {
        if (topics.includes(topic)) {
          category = cat.substring(2); // ikonu çıkar
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

    // Haber tercihlerini biçimlendir
    const newsPayload: NewsPreference[] = Object.entries(newsPrefs)
      .filter(([_, value]) => value.active)
      .map(([key, value]) => ({
        topic: key,
        frequency: value.frequency,
        is_active: true,
      }));

    // Öğrenme hedeflerini biçimlendir
    const learningPayload: LearningGoal[] = learningGoals.map((g) => ({
      topic: g,
      status: 'active',
    }));

    // Kariyer hedeflerini biçimlendir
    const careerPayload: CareerGoal[] = careerGoals.map((c) => ({
      goal: c,
      status: 'active',
    }));

    const onboardingData = {
      profile,
      interests: interestsPayload,
      news_preferences: newsPayload,
      learning_goals: learningPayload,
      career_goals: careerPayload,
    };

    try {
      await onboarding.complete(onboardingData);
      await refreshUser();
      router.push('/');
    } catch (err: any) {
      setError(err.detail || 'Kurulum tamamlanamadı. Lütfen bilgileri kontrol edin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !profile.display_name) {
      setError('Lütfen görünen adınızı girin.');
      return;
    }
    if (step === 2 && selectedInterests.length < 3) {
      setError('Lütfen en az 3 ilgi alanı seçin.');
      return;
    }
    setError(null);
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Adım Göstergesi */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${(step / 6) * 100}%` }} />
          <span className={styles.stepIndicator}>Adım {step} / 6</span>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        {/* Adım 1: Hoş Geldiniz & Profil */}
        {step === 1 && (
          <div className={styles.step}>
            <h2>Taro'ya Hoş Geldiniz</h2>
            <p className={styles.description}>İkinci beyninizi kişiselleştirmek için profilinizi ayarlayalım.</p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Görünen Ad *</label>
              <input
                type="text"
                className="input"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Adınız"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dil</label>
                <select
                  className="select"
                  value={profile.preferred_language}
                  onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">İngilizce</option>
                  <option value="es">İspanyolca</option>
                  <option value="de">Almanca</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Saat Dilimi</label>
                <input
                  type="text"
                  className="input"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Meslek / Alan</label>
              <input
                type="text"
                className="input"
                value={profile.occupation}
                onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                placeholder="Yazılım geliştirici / Öğrenci"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Profesyonel Durum</label>
              <select
                className="select"
                value={profile.professional_status}
                onChange={(e) => setProfile({ ...profile, professional_status: e.target.value })}
              >
                <option value="professional">Profesyonel</option>
                <option value="student">Öğrenci</option>
                <option value="freelancer">Serbest Çalışan</option>
                <option value="researcher">Araştırmacı</option>
              </select>
            </div>
          </div>
        )}

        {/* Adım 2: İlgi Alanları */}
        {step === 2 && (
          <div className={styles.step}>
            <h2>İlgi Alanlarınızı Seçin</h2>
            <p className={styles.description}>Taro'nun sizin için takip etmesini istediğiniz en az 3 konu seçin.</p>

            <div className={styles.categories}>
              {Object.entries(interestCategories).map(([category, topics]) => (
                <div key={category} className={styles.categorySection}>
                  <h3 className={styles.categoryTitle}>{category}</h3>
                  <div className={styles.chipsContainer}>
                    {topics.map((topic) => {
                      const isSelected = selectedInterests.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                          onClick={() => toggleInterest(topic)}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addCustomInterest} className={styles.customAddForm}>
              <input
                type="text"
                className="input"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                placeholder="Özel ilgi alanı ekle..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Adım 3: Haber Tercihleri */}
        {step === 3 && (
          <div className={styles.step}>
            <h2>Özet İçeriğini Yapılandır</h2>
            <p className={styles.description}>Hangi haber konularını dahil etmek istediğinizi ve güncelleme sıklığını seçin.</p>

            <div className={styles.list}>
              {newsOptions.map((opt) => {
                const config = newsPrefs[opt] || { active: false, frequency: 'daily' };
                return (
                  <div key={opt} className={styles.listItem}>
                    <div className={styles.listItemLeft}>
                      <input
                        type="checkbox"
                        checked={config.active}
                        onChange={() => toggleNews(opt)}
                        style={{ marginRight: '0.75rem', transform: 'scale(1.2)' }}
                      />
                      <span className={styles.listItemText}>{opt}</span>
                    </div>
                    {config.active && (
                      <select
                        className="select"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
                        value={config.frequency}
                        onChange={(e) => handleFrequencyChange(opt, e.target.value as any)}
                      >
                        <option value="daily">Günlük</option>
                        <option value="every_6h">Her 6 Saatte</option>
                        <option value="weekly">Haftalık</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Adım 4: Öğrenme Hedefleri */}
        {step === 4 && (
          <div className={styles.step}>
            <h2>Ne Öğreniyorsunuz?</h2>
            <p className={styles.description}>Taro'nun takip edip araştırmasını istediğiniz konuları seçin veya ekleyin.</p>

            <div className={styles.chipsContainer} style={{ marginBottom: '1.5rem' }}>
              {suggestedGoals.map((goal) => {
                const isSelected = learningGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                    onClick={() => toggleGoal(goal)}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>

            <form onSubmit={addCustomGoal} className={styles.customAddForm}>
              <input
                type="text"
                className="input"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Özel öğrenme hedefi ekle..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Adım 5: Kariyer Hedefleri */}
        {step === 5 && (
          <div className={styles.step}>
            <h2>Kariyer Hedefleriniz Neler?</h2>
            <p className={styles.description}>Taro'nun size uygun fırsatları bildirmesi için hedeflerinizi belirtin.</p>

            <div className={styles.chipsContainer} style={{ marginBottom: '1.5rem' }}>
              {suggestedCareers.map((career) => {
                const isSelected = careerGoals.includes(career);
                return (
                  <button
                    key={career}
                    type="button"
                    className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                    onClick={() => toggleCareer(career)}
                  >
                    {career}
                  </button>
                );
              })}
            </div>

            <form onSubmit={addCustomCareer} className={styles.customAddForm}>
              <input
                type="text"
                className="input"
                value={customCareer}
                onChange={(e) => setCustomCareer(e.target.value)}
                placeholder="Özel kariyer hedefi ekle..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Adım 6: Özet & Onay */}
        {step === 6 && (
          <div className={styles.step}>
            <h2>Taro OS'u Başlat</h2>
            <p className={styles.description}>Kurulumu tamamlamadan önce yapılandırmalarınızı gözden geçirin.</p>

            <div className={styles.summaryBlock}>
              <div className={styles.summaryItem}>
                <strong>Operatör:</strong> {profile.display_name} ({profile.occupation || 'Belirtilmedi'})
              </div>
              <div className={styles.summaryItem}>
                <strong>İlgi Alanları:</strong> {selectedInterests.join(', ') || 'Yok'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Aktif Özet Konuları:</strong>{' '}
                {Object.entries(newsPrefs)
                  .filter(([_, v]) => v.active)
                  .map(([k, v]) => {
                    const freqLabel = v.frequency === 'daily' ? 'Günlük' : v.frequency === 'every_6h' ? 'Her 6 Saatte' : 'Haftalık';
                    return `${k} (${freqLabel})`;
                  })
                  .join(', ') || 'Yok'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Öğrenme:</strong> {learningGoals.join(', ') || 'Yok'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Kariyer:</strong> {careerGoals.join(', ') || 'Yok'}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-accent"
              style={{ width: '100%', marginTop: '1.5rem', fontSize: '1.1rem', padding: '12px' }}
              onClick={handleComplete}
              disabled={isSubmitting}
              id="onboarding-complete"
            >
              {isSubmitting ? 'Ajan OS hazırlanıyor...' : '🌿 Taro\'yu Başlat'}
            </button>
          </div>
        )}

        {/* Gezinme Butonları */}
        <div className={styles.navRow}>
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={prevStep}>
              Geri
            </button>
          )}
          {step < 6 ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={nextStep}
              id="onboarding-next"
            >
              İleri
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
