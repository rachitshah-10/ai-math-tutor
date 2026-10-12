/**
 * QuestionReviewModal Component.
 * Displays side-by-side view of original question, student's handwritten work,
 * and detailed AI step-by-step marking.
 */

import React from 'react';
import { EvaluationItem } from '../types';

interface QuestionReviewModalProps {
  evaluation: EvaluationItem;
  questionNumber: number;
  onClose: () => void;
}

export const QuestionReviewModal: React.FC<QuestionReviewModalProps> = ({
  evaluation,
  questionNumber,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
              Question {questionNumber} Review
            </span>
            <h2 style={{ fontSize: '1.6rem', color: '#fff', marginTop: 4 }}>
              {evaluation.topic || 'Math Problem'}
            </h2>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Close
          </button>
        </div>

        {/* Question Prompt */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: 14,
            padding: '16px 20px',
            fontSize: '1.15rem',
            color: '#fff',
          }}
        >
          {evaluation.prompt || 'Question prompt'}
        </div>

        {/* Side-by-Side Review Grid */}
        <div className="modal-grid">
          {/* Left Column: Student's Handwritten Scratchpad */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              ✍️ Your Handwritten Work
            </h3>
            {evaluation.image_data ? (
              <img
                src={evaluation.image_data}
                alt="Student handwritten scratchpad"
                className="preview-img"
              />
            ) : (
              <div
                style={{
                  height: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 14,
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                No scratchpad image available
              </div>
            )}

            {evaluation.transcription && (
              <div style={{ marginTop: 14, padding: 12, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Detected Steps Transcription
                </span>
                <pre style={{ marginTop: 4, fontFamily: 'monospace', fontSize: '0.9rem', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {evaluation.transcription}
                </pre>
              </div>
            )}
          </div>

          {/* Right Column: AI Step-by-Step Breakdown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                🧠 AI Step-by-Step Marking
              </h3>
              <span
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent)',
                  background: 'var(--accent-soft)',
                  padding: '4px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--border-highlight)',
                }}
              >
                {evaluation.score} / {evaluation.max_points} pts
              </span>
            </div>

            {/* Step list */}
            {evaluation.step_analysis && evaluation.step_analysis.length > 0 ? (
              evaluation.step_analysis.map((step) => (
                <div key={step.step_number} className="step-card">
                  <div className="step-header">
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                      Step {step.step_number}: {step.description}
                    </span>
                    <span className={`status-badge status-${step.status}`}>
                      {step.status}
                    </span>
                  </div>
                  {step.notes && (
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {step.notes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Evaluation details completed.
              </p>
            )}

            {/* AI Coaching Tips */}
            {evaluation.suggestions && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  borderRadius: 14,
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 4 }}>
                  💡 AI Tutor Feedback
                </div>
                <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {evaluation.suggestions}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

