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

  // --- Step 1: Profile State ---
  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    preferred_language: 'en',
    timezone: 'UTC',
    country: '',
    occupation: '',
    professional_status: 'professional',
  });

  // Auto-detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setProfile((prev) => ({ ...prev, timezone: tz }));
      }
    } catch {}
  }, []);

  // --- Step 2: Interests State ---
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  const interestCategories = {
    '💻 Technology': ['AI', 'Programming', 'Cyber Security', 'DevOps', 'Kubernetes', 'Cloud', 'Open Source', 'GitHub'],
    '💰 Business': ['Startups', 'Economy', 'Finance', 'Cryptocurrency'],
    '🎵 Music': ['Guitar', 'Bass', 'Piano', 'Drums', 'Music'],
    '💪 Health': ['Fitness', 'Bodybuilding', 'Nutrition'],
    '⚽ Sports': ['Basketball', 'Football', 'Formula 1'],
    '🎬 Entertainment': ['Movies', 'Gaming'],
    '🧠 Science': ['Neuroscience', 'Cognitive Science', 'Psychology', 'Philosophy'],
    '📈 Productivity': ['Productivity'],
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

  // --- Step 3: News Preferences State ---
  const newsOptions = [
    'AI news', 'software development news', 'cybersecurity news', 'DevOps news',
    'economy news', 'finance news', 'sports news', 'music news', 'GitHub trends',
    'Hacker News highlights', 'Reddit trends', 'research papers', 'startup news'
  ];

  const [newsPrefs, setNewsPrefs] = useState<Record<string, { active: boolean; frequency: 'daily' | 'every_6h' | 'weekly' }>>(
    newsOptions.reduce((acc, opt) => {
      acc[opt] = { active: false, frequency: 'daily' };
      return acc;
    }, {} as any)
  );

  // Pre-fill news preferences based on interest selections
  useEffect(() => {
    setNewsPrefs((prev) => {
      const updated = { ...prev };
      const selectedLower = selectedInterests.map(i => i.toLowerCase());

      newsOptions.forEach(opt => {
        const isMatch = selectedLower.some(interest => {
          if (opt.includes('ai') && interest.includes('ai')) return true;
          if (opt.includes('software') && interest.includes('programming')) return true;
          if (opt.includes('cybersecurity') && interest.includes('cyber')) return true;
          if (opt.includes('devops') && interest.includes('devops')) return true;
          if (opt.includes('economy') && (interest.includes('economy') || interest.includes('finance'))) return true;
          if (opt.includes('sports') && (interest.includes('ball') || interest.includes('formula'))) return true;
          if (opt.includes('music') && (interest.includes('music') || interest.includes('guitar') || interest.includes('bass') || interest.includes('drums'))) return true;
          if (opt.includes('github') && interest.includes('github')) return true;
          if (opt.includes('startup') && interest.includes('startup')) return true;
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

  // --- Step 4: Learning Goals State ---
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');

  const suggestedGoals = [
    'Kubernetes', 'Docker', 'Linux', 'Networking', 'React', 'Python', 'Go', 'Rust', 'AI Agents', 'OpenTelemetry', 'Cyber Security', 'Algorithms'
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

  // --- Step 5: Career Goals State ---
  const [careerGoals, setCareerGoals] = useState<string[]>([]);
  const [customCareer, setCustomCareer] = useState('');

  const suggestedCareers = [
    'find internship', 'find remote job', 'become DevOps engineer', 'become security engineer',
    'become backend engineer', 'build open-source project', 'build startup', 'create YouTube content', 'improve GitHub profile'
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

  // --- Step 6: Submission ---
  const handleComplete = async () => {
    setError(null);
    setIsSubmitting(true);

    // Format interests
    const interestsPayload: InterestTopic[] = selectedInterests.map((topic) => {
      // Find category
      let category = 'Technology';
      for (const [cat, topics] of Object.entries(interestCategories)) {
        if (topics.includes(topic)) {
          category = cat.substring(2); // strip icon
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

    // Format news preferences
    const newsPayload: NewsPreference[] = Object.entries(newsPrefs)
      .filter(([_, value]) => value.active)
      .map(([key, value]) => ({
        topic: key,
        frequency: value.frequency,
        is_active: true,
      }));

    // Format learning goals
    const learningPayload: LearningGoal[] = learningGoals.map((g) => ({
      topic: g,
      status: 'active',
    }));

    // Format career goals
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
      setError(err.detail || 'Failed to complete onboarding. Please verify details and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !profile.display_name) {
      setError('Please provide a display name.');
      return;
    }
    if (step === 2 && selectedInterests.length < 3) {
      setError('Please select at least 3 interest topics.');
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
        {/* Step Indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${(step / 6) * 100}%` }} />
          <span className={styles.stepIndicator}>Step {step} of 6</span>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        {/* Step 1: Welcome & Profile */}
        {step === 1 && (
          <div className={styles.step}>
            <h2>Welcome to Taro</h2>
            <p className={styles.description}>Let's set up your profile to customize your second brain.</p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Display Name *</label>
              <input
                type="text"
                className="input"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Tarik"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Language</label>
                <select
                  className="select"
                  value={profile.preferred_language}
                  onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                  <option value="tr">Turkish</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Timezone</label>
                <input
                  type="text"
                  className="input"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Occupation / Domain</label>
              <input
                type="text"
                className="input"
                value={profile.occupation}
                onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                placeholder="Software developer / Student"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Professional Status</label>
              <select
                className="select"
                value={profile.professional_status}
                onChange={(e) => setProfile({ ...profile, professional_status: e.target.value })}
              >
                <option value="professional">Professional</option>
                <option value="student">Student</option>
                <option value="freelancer">Freelancer</option>
                <option value="researcher">Researcher</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className={styles.step}>
            <h2>Select Your Interests</h2>
            <p className={styles.description}>Choose at least 3 topics you want Taro to track and prioritize for you.</p>

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
                placeholder="Add custom interest..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Step 3: News Preferences */}
        {step === 3 && (
          <div className={styles.step}>
            <h2>Configure Briefing Contents</h2>
            <p className={styles.description}>Select which news topics to include and how frequently you want them updated.</p>

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
                        <option value="daily">Daily</option>
                        <option value="every_6h">Every 6 hrs</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Learning Goals */}
        {step === 4 && (
          <div className={styles.step}>
            <h2>What Are You Learning?</h2>
            <p className={styles.description}>Select or add topics you are currently pursuing so Taro can track and research them.</p>

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
                placeholder="Add custom learning goal..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Step 5: Career Goals */}
        {step === 5 && (
          <div className={styles.step}>
            <h2>What Are Your Career Goals?</h2>
            <p className={styles.description}>Specify what you want to achieve so Taro can alert you of matching opportunities.</p>

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
                placeholder="Add custom career goal..."
              />
              <button type="submit" className="btn btn-secondary">+</button>
            </form>
          </div>
        )}

        {/* Step 6: Summary & Confirm */}
        {step === 6 && (
          <div className={styles.step}>
            <h2>Deploy Taro OS</h2>
            <p className={styles.description}>Review your configurations before initiating onboarding and first-launch briefing.</p>

            <div className={styles.summaryBlock}>
              <div className={styles.summaryItem}>
                <strong>Operator:</strong> {profile.display_name} ({profile.occupation || 'N/A'})
              </div>
              <div className={styles.summaryItem}>
                <strong>Interests:</strong> {selectedInterests.join(', ')}
              </div>
              <div className={styles.summaryItem}>
                <strong>Active Briefing Topics:</strong>{' '}
                {Object.entries(newsPrefs)
                  .filter(([_, v]) => v.active)
                  .map(([k, v]) => `${k} (${v.frequency})`)
                  .join(', ') || 'None'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Learning:</strong> {learningGoals.join(', ') || 'None'}
              </div>
              <div className={styles.summaryItem}>
                <strong>Career:</strong> {careerGoals.join(', ') || 'None'}
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
              {isSubmitting ? 'Provisioning Agent OS...' : '🌿 Launch Taro'}
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={styles.navRow}>
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={prevStep}>
              Back
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
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
