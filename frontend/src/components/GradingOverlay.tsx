/**
 * GradingOverlay Component.
 * Displays a friendly evaluation progress modal while the background worker grades.
 */

import React from 'react';

interface GradingOverlayProps {
  completedCount: number;
  totalCount: number;
}

export const GradingOverlay: React.FC<GradingOverlayProps> = ({
  completedCount,
  totalCount,
}) => {
  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: 480,
          textAlign: 'center',
          alignItems: 'center',
          padding: '48px 32px',
        }}
      >
        <div className="spinner" style={{ marginBottom: 20 }} />
        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: 8 }}>
          Grading Your Handwriting
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 20 }}>
          Our AI is inspecting your scratchpad steps, checking angle proofs, and validating calculations...
        </p>
        <div
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 999,
            padding: '8px 24px',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.92rem',
            letterSpacing: '0.5px',
          }}
        >
          {completedCount} of {totalCount} questions evaluated
        </div>
      </div>
    </div>
  );
};

