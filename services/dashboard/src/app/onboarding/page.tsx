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

  // Herkese hitap eden kapsayıcı kategoriler (yazılım dışı / genel)
  const interestCategories = {
    '🌍 Gündem': ['Dünya Gündemi', 'Çevre & İklim', 'Bilimsel Keşifler', 'Toplumsal Olaylar'],
    '💰 Ekonomi': ['Finans & Yatırım', 'Kişisel Finans', 'Girişimcilik', 'Küresel Piyasalar'],
    '💻 Teknoloji': ['Yapay Zeka', 'Akıllı Teknolojiler', 'Yazılım & Programlama', 'Siber Güvenlik'],
    '🧠 Bilim': ['Uzay & Astronomi', 'Nörobilim', 'Psikoloji', 'Felsefe'],
    '🥦 Sağlık & Yaşam': ['Fitness & Egzersiz', 'Sağlıklı Beslenme', 'Kişisel Gelişim', 'Yoga & Meditasyon'],
    '🎨 Kültür & Sanat': ['Edebiyat & Kitaplar', 'Sinema & Tiyatro', 'Müzik', 'Tarih'],
    '⚽ Spor': ['Futbol', 'Basketbol', 'Tenis', 'Doğa Sporları'],
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
    'gündem', 'ekonomi', 'teknoloji', 'sağlık', 'spor', 'bilim', 'kültür-sanat'
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
          if (opt === 'gündem' && (interest.includes('gündem') || interest.includes('olaylar'))) return true;
          if (opt === 'ekonomi' && (interest.includes('finans') || interest.includes('piyasalar') || interest.includes('girişim'))) return true;
          if (opt === 'teknoloji' && (interest.includes('teknoloji') || interest.includes('yapay') || interest.includes('yazılım'))) return true;
          if (opt === 'sağlık' && (interest.includes('sağlık') || interest.includes('beslenme') || interest.includes('yoga'))) return true;
          if (opt === 'spor' && (interest.includes('spor') || interest.includes('futbol') || interest.includes('tenis'))) return true;
          if (opt === 'bilim' && (interest.includes('bilim') || interest.includes('uzay') || interest.includes('nöro') || interest.includes('felsefe'))) return true;
          if (opt === 'kültür-sanat' && (interest.includes('edebiyat') || interest.includes('sinema') || interest.includes('müzik') || interest.includes('sanat'))) return true;
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

  // Herkese hitap eden öğrenme hedefleri önerileri
  const suggestedGoals = [
    'Yabancı Dil Öğrenme', 'Kişisel Finans Yönetimi', 'Temel Programlama', 'Sağlıklı Yaşam Tarzı', 'Zaman Yönetimi & Verimlilik', 'Etkili İletişim Becerileri', 'Yapay Zeka Okuryazarlığı', 'Fotoğrafçılık', 'Dünya Tarihi', 'Yaratıcı Yazarlık'
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

  // Herkese hitap eden gelişim ve kariyer önerileri
  const suggestedCareers = [
    'Yeni kariyer fırsatları keşfet', 'Uzaktan çalışma düzeni oluştur', 'Kendi işini kur / Girişimcilik', 'Kişisel portfolyo oluştur', 'Akademik hedefler belirle', 'Topluluk önünde konuşma becerisi kazan', 'Liderlik yetkinliklerini artır'
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

    const interestsPayload: InterestTopic[] = selectedInterests.map((topic) => {
      let category = 'Genel';
      for (const [cat, topics] of Object.entries(interestCategories)) {
        if (topics.includes(topic)) {
          category = cat.substring(2); 
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

    const newsPayload: NewsPreference[] = Object.entries(newsPrefs)
      .filter(([_, value]) => value.active)
      .map(([key, value]) => ({
        topic: key,
        frequency: value.frequency,
        is_active: true,
      }));

    const learningPayload: LearningGoal[] = learningGoals.map((g) => ({
      topic: g,
      status: 'active',
    }));

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
            <p className={styles.description}>İkinci beyninizi ve kişisel asistanınızı kurmak için profilinizi ayarlayalım.</p>

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
                placeholder="Mesleğiniz veya ilgi alanınız"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Profesyonel Durum</label>
              <select
                className="select"
                value={profile.professional_status}
                onChange={(e) => setProfile({ ...profile, professional_status: e.target.value })}
              >
                <option value="professional">Çalışan / Profesyonel</option>
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
            <h2>Haber Akışını Yapılandır</h2>
            <p className={styles.description}>Hangi ana konuları dahil etmek istediğinizi seçin.</p>

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
                      <span className={styles.listItemText} style={{ textTransform: 'capitalize' }}>
                        {opt === 'kultur-sanat' ? 'Kültür & Sanat' : opt}
                      </span>
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
            <h2>Ne Öğrenmek İstiyorsunuz?</h2>
            <p className={styles.description}>Taro'nun araştırmanıza destek olmasını istediğiniz alanları seçin.</p>

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
                placeholder="Özel hedef ekle..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Adım 5: Gelişim & Kariyer Hedefleri */}
        {step === 5 && (
          <div className={styles.step}>
            <h2>Kariyer & Yaşam Hedefleriniz Neler?</h2>
            <p className={styles.description}>Taro'nun size rehberlik etmesi için hedeflerinizi belirtin.</p>

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
                placeholder="Özel hedef ekle..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Adım 6: Özet & Onay */}
        {step === 6 && (
          <div className={styles.step}>
            <h2>Taro Asistanı Başlat</h2>
            <p className={styles.description}>Kurulumu tamamlamadan önce yapılandırmalarınızı gözden geçirin.</p>

            <div className={styles.summaryBlock}>
              <div className={styles.summaryItem}>
                <strong>Kullanıcı:</strong> {profile.display_name} ({profile.occupation || 'Belirtilmedi'})
              </div>
              <div className={styles.summaryItem}>
                <strong>İlgi Alanları:</strong> {selectedInterests.join(', ') || 'Yok'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Aktif Haberler:</strong>{' '}
                {Object.entries(newsPrefs)
                  .filter(([_, v]) => v.active)
                  .map(([k, v]) => {
                    const freqLabel = v.frequency === 'daily' ? 'Günlük' : v.frequency === 'every_6h' ? 'Her 6 Saatte' : 'Haftalık';
                    const topicLabel = k === 'kultur-sanat' ? 'Kültür & Sanat' : k;
                    return `${topicLabel} (${freqLabel})`;
                  })
                  .join(', ') || 'Yok'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Öğrenme Konuları:</strong> {learningGoals.join(', ') || 'Yok'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Kariyer & Yaşam:</strong> {careerGoals.join(', ') || 'Yok'}
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
              {isSubmitting ? 'Taro Hazırlanıyor...' : '🌿 Taro\'yu Başlat'}
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
