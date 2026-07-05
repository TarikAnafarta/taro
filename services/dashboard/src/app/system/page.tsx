'use client';

import React, { useEffect, useState } from 'react';
import { system } from '@/lib/api';
import type { NodeStatus, SystemInfo } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SystemPage() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSystemStatus = async () => {
    try {
      const [nodesRes, infoRes] = await Promise.all([
        system.nodes(),
        system.info(),
      ]);
      setNodes(nodesRes);
      setSysInfo(infoRes);
    } catch (err: any) {
      setError(err.detail || 'Failed to fetch cluster node health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'ok':
      case 'connected':
        return '#10b981'; // green
      case 'degraded':
      case 'warning':
        return '#f59e0b'; // orange
      default:
        return '#ef4444'; // red
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#fff' }}>System Node Health</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            Real-time diagnostics across your distributed personal server nodes.
          </p>
        </div>
        <button onClick={loadSystemStatus} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          🔄 Refresh
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Metadata Card */}
          {sysInfo && (
            <div className="card card-glass" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Taro Version</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>v{sysInfo.version}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Core Uptime</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{sysInfo.uptime}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Default LLMs</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  {sysInfo.active_models?.join(', ') || 'qwen2.5:7b, nomic-embed-text'}
                </div>
              </div>
            </div>
          )}

          {/* Node Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
            {nodes.map((node) => (
              <div key={node.node_id} className="card card-glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🖥️ {node.node_id === 'node1-ai-compute' ? 'Node 1: AI Compute' : 'Node 2: Core Services'}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Host address: <code>{node.host}</code>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Services
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {node.services.map((svc) => (
                      <div
                        key={svc.name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '8px'
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#fff', textTransform: 'capitalize' }}>
                          {svc.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(svc.status),
                            boxShadow: `0 0 6px ${getStatusColor(svc.status)}`
                          }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {svc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
