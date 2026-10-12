import React from 'react';
import { Topic, PastScore } from '../types';

interface TopicHubProps {
  topics: Topic[];
  pastScores: Record<string, PastScore>;
  onSelectTopic: (topic: Topic) => void;
  onReviewPastAttempt?: (attemptId: string) => void;
}

export const TopicHub: React.FC<TopicHubProps> = ({
  topics,
  pastScores,
  onSelectTopic,
  onReviewPastAttempt,
}) => {
  return (
    <div>
      <div className="hero-banner">
        <h1>InkMath</h1>
        <p>
          Solve math naturally on an interactive scratchpad. Write out your steps,
          sketch geometry figures, and get instant step-by-step AI marking.
        </p>
      </div>

      <div className="topic-grid">
        {topics.map((topic) => {
          const pastScore = pastScores[topic.id];

          return (
            <div key={topic.id} className="topic-card">
              <div>
                <div className="topic-header">
                  <div className="topic-icon">{topic.icon}</div>
                  <span className={`difficulty-pill diff-${topic.difficulty}`}>
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
