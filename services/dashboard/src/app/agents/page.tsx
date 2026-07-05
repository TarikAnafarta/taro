'use client';

import React, { useEffect, useState } from 'react';
import { agents as agentsApi } from '@/lib/api';
import type { Agent } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const loadAgents = async () => {
    try {
      const res = await agentsApi.list();
      setAgents(res);
    } catch (err) {
      console.error('Ajanlar alınamadı', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleExecute = async (id: string, name: string) => {
    setExecutingId(id);
    setExecutionMessage(null);
    try {
      const res = (await agentsApi.execute(id)) as any;
      setExecutionMessage(res.message || `${name} ajanı başlatıldı`);
      loadAgents();
    } catch (err: any) {
      setExecutionMessage(err.detail || 'Ajan başlatılamadı');
    } finally {
      setExecutingId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'error': return 'Hata';
      default: return status;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#fff' }}>Ajan Merkezi</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
          Düğüm 2 çalışma ortamındaki yapay zeka ajanlarını izleyin ve tetikleyin.
        </p>
      </div>

      {executionMessage && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          color: 'var(--color-primary, #3b82f6)',
          padding: '1rem',
          borderRadius: '12px',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{executionMessage}</span>
          <button
            onClick={() => setExecutionMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', height: '40vh', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : agents.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {agents.map((agent) => (
            <div key={agent.id} className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>🤖 {agent.name}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: agent.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: agent.status === 'active' ? '1px solid var(--color-success)' : '1px solid rgba(255,255,255,0.1)',
                    color: agent.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {getStatusLabel(agent.status)}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                  {agent.description || 'Açıklama bulunmuyor.'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  {agent.capabilities.map((cap) => (
                    <span key={cap} style={{
                      fontSize: '0.7rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {agent.last_executed_at ? `Son çalışma: ${new Date(agent.last_executed_at).toLocaleString('tr-TR')}` : 'Hiç çalıştırılmadı'}
                </span>
                <button
                  onClick={() => handleExecute(agent.id, agent.name)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  disabled={executingId === agent.id}
                >
                  {executingId === agent.id ? 'Çalışıyor...' : 'Çalıştır ⚙️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card card-glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>🔌</span>
          <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#fff' }}>Kayıtlı Ajan Yok</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Takılabilir ajanlar <code>agents/</code> dizini altında yapılandırılabilir ve Python giriş noktaları olarak kurulabilir.
          </p>
        </div>
      )}
    </div>
  );
}
