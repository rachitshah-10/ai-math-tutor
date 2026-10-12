/**
 * ResultsView Component.
 * Displays overall assignment score, celebration effects,
 * and clickable question cards to review AI feedback.
 */

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { EvaluationItem } from '../types';
import { QuestionReviewModal } from './QuestionReviewModal';

interface ResultsViewProps {
  totalScore: number;
  maxScore: number;
  evaluations: EvaluationItem[];
  onRetake: () => void;
  onBackToTopics: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  totalScore,
  maxScore,
  evaluations,
  onRetake,
  onBackToTopics,
}) => {
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(1);

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Celebrate if passing score
  useEffect(() => {
    if (percentage >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback if canvas-confetti environment differs
      }
    }
  }, [percentage]);

  const getTagline = () => {
    if (percentage >= 90) return '🌟 Outstanding mastery! Excellent scratchpad reasoning.';
    if (percentage >= 70) return '🎉 Great job! Clear handwritten derivations and steps.';
    return '💡 Good effort! Review the step-by-step notes below to master this topic.';
  };

  return (
    <div className="results-container">
      {/* Top Score Banner */}
      <div className="score-card">
        <span
          style={{
            fontSize: '0.85rem',
            color: 'var(--accent)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Assignment Results
        </span>

        <div className="score-badge">
          {totalScore} / {maxScore} pts
        </div>

        <div
          style={{
            display: 'inline-block',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: percentage >= 70 ? 'var(--success)' : 'var(--warning)',
            marginBottom: 8,
          }}
        >
          {percentage}%
        </div>

        <p className="score-label">{getTagline()}</p>

        <div className="score-actions">
          <button className="btn btn-secondary" onClick={onBackToTopics}>
            ← All Topics
          </button>
          <button className="btn btn-primary" onClick={onRetake}>
            🔄 Retake Assignment
          </button>
        </div>
      </div>

      {/* Per-Question List */}
      <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: 16 }}>
        Question-by-Question AI Marking (Click to review)
      </h3>

      <div className="eval-list">
        {evaluations.map((ev, index) => (
          <div
            key={ev.id || index}
            className="eval-card"
            onClick={() => {
              setSelectedEvaluation(ev);
              setSelectedIndex(index + 1);
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.95rem' }}>
                  Question {index + 1}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>•</span>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                  {ev.topic || 'Math Problem'}
                </span>
              </div>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  maxWidth: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {ev.prompt || 'View question prompt'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: ev.score === ev.max_points ? 'var(--success)' : 'var(--warning)',
                }}
              >
                {ev.score} / {ev.max_points} pts
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Inspect ➔</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for detailed review */}
      {selectedEvaluation && (
        <QuestionReviewModal
          evaluation={selectedEvaluation}
          questionNumber={selectedIndex}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}
    </div>
  );
};

