'use client';

import React, { useState, useEffect, useRef } from 'react';
import { chat as chatApi } from '@/lib/api';
import type { Conversation, Message } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await chatApi.getConversations();
        setConversations(res);
        if (res.length > 0) {
          setActiveConvId(res[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoadingConvs(false);
      }
    }
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setLoadingMsgs(true);
      setError(null);
      try {
        if (activeConvId) {
          const res = await chatApi.getMessages(activeConvId);
          setMessages(res);
        }
      } catch (err: any) {
        setError(err.detail || 'Failed to load messages');
      } finally {
        setLoadingMsgs(false);
      }
    }
    loadMessages();
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const userMessageText = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await chatApi.send(userMessageText, activeConvId || undefined);
      
      // Update active conversation ID if we created a new one
      if (!activeConvId) {
        setActiveConvId(res.conversation_id);
        // Refresh conversations list
        const convList = await chatApi.getConversations();
        setConversations(convList);
      }
      
      // Append assistant message
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        tempUserMsg,
        res.message,
      ]);
    } catch (err: any) {
      setError(err.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setError(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Sidebar Conversation List */}
      <div className="card card-glass" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '1rem', boxSizing: 'border-box' }}>
        <button
          onClick={handleNewConversation}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '1rem' }}
          id="new-chat-btn"
        >
          ➕ New Chat
        </button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loadingConvs ? (
            <div style={{ display: 'flex', padding: '2rem', justifyContent: 'center' }}><LoadingSpinner /></div>
          ) : conversations.length > 0 ? (
            conversations.map((c) => {
              const isActive = c.id === activeConvId;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    fontSize: '0.875rem',
                    color: isActive ? '#fff' : 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginRight: '0.5rem',
                    flex: 1
                  }}>
                    💬 {c.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      opacity: isActive ? 1 : 0.4
                    }}
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', paddingTop: '2rem' }}>
              No chats recorded.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="card card-glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', boxSizing: 'border-box' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--color-danger, #ef4444)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
          {loadingMsgs ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>
          ) : messages.length > 0 ? (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '16px',
                    background: isUser ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))' : 'rgba(255, 255, 255, 0.04)',
                    border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                  }}>
                    {m.content}
                  </div>
                  {!isUser && m.model && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', marginLeft: '0.5rem' }}>
                      Generated by {m.model}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '1rem',
              color: 'var(--color-text-muted)'
            }}>
              <span style={{ fontSize: '3rem' }}>🌿</span>
              <h3 style={{ margin: 0, color: '#fff' }}>I am Taro</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', textAlign: 'center', maxWidth: '360px' }}>
                Ask me questions, configure daily news alerts, or research topics. I will communicate with the Node 1 gateway models.
              </p>
            </div>
          )}
          {sending && (
            <div style={{ display: 'flex', alignSelf: 'flex-start', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to Taro..."
            style={{ flex: 1 }}
            id="chat-message-input"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputText.trim() || sending}
            id="chat-send-btn"
          >
            Send ➔
          </button>
        </form>
      </div>
    </div>
  );
}
