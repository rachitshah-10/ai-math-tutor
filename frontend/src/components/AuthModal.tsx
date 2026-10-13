/**
 * AuthModal and AuthCard Components.
 * Provides student authentication (Sign In & Registration) with email and password,
 * plus a 1-click Demo Student login button.
 * Supports standalone page card mode and modal dialog mode.
 */

import React, { useState } from 'react';
import { User } from '../types';
import * as api from '../services/api';

export interface AuthCardProps {
  onSuccess: (user: User) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccess,
  onClose,
  isStandalone = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const auth = await api.login(email, password);
        onSuccess(auth.user);
        if (onClose) onClose();
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your name');
        }
        const auth = await api.register(email, password, name);
        onSuccess(auth.user);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const auth = await api.login('alex@inkmath.edu', 'password123');
      onSuccess(auth.user);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={isStandalone ? "auth-card" : "modal-content"}
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: 440,
        width: '100%',
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        ...(isStandalone
          ? {
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 20,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
            }
          : {}),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}
          >
            Student Portal
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', color: '#fff', marginTop: 2 }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
        </div>
        {!isStandalone && onClose && (
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: '0.9rem' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 1-Click Demo Login Box */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(229, 176, 120, 0.12) 0%, rgba(129, 140, 248, 0.08) 100%)',
          border: '1px solid rgba(229, 176, 120, 0.3)',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>
            ⚡ Quick Demo Student
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Alex Rivera (alex@inkmath.edu)
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          onClick={handleDemoLogin}
          disabled={loading}
        >
          Instant Log In
        </button>
      </div>

      {/* Mode Switch Tabs */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: 4,
          borderRadius: 999,
          border: '1px solid var(--border-card)',
        }}
      >
        <button
          type="button"
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 999,
            border: 'none',
            background: mode === 'login' ? 'var(--accent)' : 'transparent',
            color: mode === 'login' ? '#0b0c10' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => {
            setMode('login');
            setError(null);
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 999,
            border: 'none',
            background: mode === 'register' ? 'var(--accent)' : 'transparent',
            color: mode === 'register' ? '#0b0c10' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => {
            setMode('register');
            setError(null);
          }}
        >
          Create Account
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-soft)',
            border: '1px solid rgba(251, 113, 133, 0.3)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: '0.88rem',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'register' && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Smith"
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-card)',
                borderRadius: 10,
                padding: '11px 14px',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@school.edu"
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-card)',
              borderRadius: 10,
              padding: '11px 14px',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-card)',
              borderRadius: 10,
              padding: '11px 14px',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px 0', marginTop: 6 }}
          disabled={loading}
        >
          {loading
            ? 'Authenticating...'
            : mode === 'login'
            ? 'Sign In to Scratchpad'
            : 'Create Free Account'}
        </button>
      </form>
    </div>
  );
};

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <AuthCard onSuccess={onSuccess} onClose={onClose} isStandalone={false} />
    </div>
  );
};
