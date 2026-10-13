/**
 * HistoryModal Component.
 * Displays a student's complete historical quiz attempts with scores, timestamps,
 * and direct links to inspect past handwritten evaluations.
 */

import React, { useEffect, useState } from 'react';
import { UserAttemptHistory, User, EvaluationItem } from '../types';
import * as api from '../services/api';
import { QuestionReviewModal } from './QuestionReviewModal';

interface HistoryModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSelectAttemptForReview: (attemptId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  user,
  onClose,
  onSelectAttemptForReview,
}) => {
  const [history, setHistory] = useState<UserAttemptHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      api.getUserAttempts()
        .then(setHistory)
        .catch((err) => setError(err.message || 'Failed to load history'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedAttempts = history.filter((h) => h.completed);
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, h) => acc + h.percentage, 0) / completedAttempts.length)
    : 0;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 860, maxHeight: '88vh' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Student Academic Record
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#fff', marginTop: 2 }}>
              {user.name}’s Attempt History
            </h2>
          </div>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px' }}
          >
            ✕ Close
          </button>
        </div>

        {/* Aggregate Stats Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-card)',
              borderRadius: 14,
              padding: '16px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
              {history.length}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
              Total Quizzes Started
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-card)',
              borderRadius: 14,
              padding: '16px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)' }}>
              {completedAttempts.length}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
              Completed & Graded
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-card)',
              borderRadius: 14,
              padding: '16px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>
              {avgScore}%
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
              Average Score
            </div>
          </div>
        </div>

        {/* Attempts List */}
        <div>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: 14 }}>
            Past Quiz Attempts ({history.length})
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              Loading student history...
            </div>
          ) : error ? (
            <div style={{ color: 'var(--danger)', padding: 16 }}>⚠️ {error}</div>
          ) : history.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 16,
                border: '1px solid var(--border-card)',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📝</div>
              <p style={{ fontSize: '1.05rem', color: '#fff' }}>No quiz attempts recorded yet.</p>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
                Choose any curriculum topic from the hub to take your first handwritten math quiz!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((att) => {
                const diffClass = `diff-${(att.topic_difficulty || '').replace(/[^a-zA-Z0-9]/g, '-')}`;

                return (
                  <div
                    key={att.id}
                    className="eval-card"
                    style={{ cursor: att.completed ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (att.completed) {
                        onSelectAttemptForReview(att.id);
                        onClose();
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div
                        style={{
                          fontSize: '1.8rem',
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {att.topic_icon || '📐'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem' }}>
                            {att.topic_title || att.topic_id}
                          </span>
                          {att.topic_difficulty && (
                            <span className={`difficulty-pill ${diffClass}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                              {att.topic_difficulty}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {formatDate(att.completed_at || att.created_at)}
                          {!att.completed && (
                            <span style={{ marginLeft: 8, color: 'var(--warning)', fontWeight: 600 }}>
                              • In Progress
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {att.completed ? (
                        <>
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '1.15rem',
                                color: att.percentage >= 70 ? 'var(--success)' : 'var(--warning)',
                              }}
                            >
                              {att.total_score} / {att.max_score} pts
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {att.percentage}% score
                            </div>
                          </div>
                          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem' }}>
                            Inspect ➔
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Incomplete
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

