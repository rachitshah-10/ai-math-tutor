/**
 * TopicHub Component.
 * Displays pre-populated curriculum topic cards with difficulty,
 * question counts, and past performance badges.
 */

import React from 'react';
import { Topic, PastScore } from '../types';

interface TopicHubProps {
  topics: Topic[];
  pastScores: Record<string, PastScore>;
  onSelectTopic: (topic: Topic) => void;
  onReviewPastAttempt?: (attemptId: string) => void;
  onClearHistory?: () => void;
}

export const TopicHub: React.FC<TopicHubProps> = ({
  topics,
  pastScores,
  onSelectTopic,
  onReviewPastAttempt,
  onClearHistory,
}) => {
  const [levelFilter, setLevelFilter] = React.useState<'all' | 'high' | 'foundations'>('all');

  const highSchoolCount = topics.filter((t) => t.difficulty.toLowerCase().includes('grade')).length;
  const foundationsCount = topics.length - highSchoolCount;
  const hasPastAttempts = Object.keys(pastScores).length > 0;

  const filteredTopics = topics.filter((t) => {
    const isHigh = t.difficulty.toLowerCase().includes('grade');
    if (levelFilter === 'high') return isHigh;
    if (levelFilter === 'foundations') return !isHigh;
    return true;
  });

  return (
    <div>
      <div className="hero-banner">
        <div className="hero-eyebrow">✦ MATHEMATICAL ATELIER &amp; SCRATCHPAD</div>
        <h1>The Art of Mathematical <em>Reasoning</em></h1>
        <p>
          Solve problems naturally by hand on an interactive drafting canvas.
          Write out your steps, sketch geometric proofs, and receive instant multimodal AI vision marking.
        </p>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-btn ${levelFilter === 'all' ? 'active' : ''}`}
          onClick={() => setLevelFilter('all')}
        >
          All Topics ({topics.length})
        </button>
        <button
          className={`filter-btn ${levelFilter === 'high' ? 'active' : ''}`}
          onClick={() => setLevelFilter('high')}
        >
          ⚡ Grades 8–10 ({highSchoolCount})
        </button>
        <button
          className={`filter-btn ${levelFilter === 'foundations' ? 'active' : ''}`}
          onClick={() => setLevelFilter('foundations')}
        >
          🌱 Foundations ({foundationsCount})
        </button>

        {hasPastAttempts && onClearHistory && (
          <button
            className="filter-btn"
            style={{ color: 'var(--danger)', borderColor: 'rgba(248, 113, 113, 0.3)' }}
            onClick={onClearHistory}
            title="Clear all past attempts and local scores"
          >
            🗑️ Clear History
          </button>
        )}
      </div>

      <div className="topic-grid">
        {filteredTopics.map((topic) => {
          const pastScore = pastScores[topic.id];
          const diffClass = `diff-${topic.difficulty.replace(/[^a-zA-Z0-9]/g, '-')}`;

          return (
            <div key={topic.id} className="topic-card">
              <div>
                <div className="topic-header">
                  <div className="topic-icon">{topic.icon}</div>
                  <span className={`difficulty-pill ${diffClass}`}>
                    {topic.difficulty}
                  </span>
                </div>

                <h2 className="topic-title">{topic.title}</h2>
                <p className="topic-desc">{topic.description}</p>
              </div>

              <div>
                {pastScore && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="past-score-badge">
                      <span>✓ Completed: {pastScore.percentage}%</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        ({pastScore.score}/{pastScore.maxScore} pts)
                      </span>
                    </div>
                  </div>
                )}

                <div className="topic-footer">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {topic.question_count} Questions
                  </span>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {pastScore && onReviewPastAttempt && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => onReviewPastAttempt(pastScore.attemptId)}
                        title="Review step-by-step AI feedback"
                      >
                        Feedback
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={() => onSelectTopic(topic)}
                    >
                      {pastScore ? 'Retake' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

