/**
 * InkMath Main Application Component.
 * Orchestrates views: TopicHub -> Scratchpad -> Grading -> ResultsView.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Topic, Question, EvaluationItem, PastScore } from './types';
import * as api from './services/api';
import { TopicHub } from './components/TopicHub';
import { Scratchpad } from './components/Scratchpad';
import { GradingOverlay } from './components/GradingOverlay';
import { ResultsView } from './components/ResultsView';

type AppView = 'hub' | 'scratchpad' | 'evaluating' | 'results';

const STORAGE_KEY = 'inkmath_past_scores';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('hub');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Evaluation & Results State
  const [completedEvalsCount, setCompletedEvalsCount] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Local storage for score history
  const [pastScores, setPastScores] = useState<Record<string, PastScore>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Load topics and sync past scores with backend on mount
  useEffect(() => {
    api.getTopics()
      .then(setTopics)
      .catch((err) => console.error('Failed to load topics:', err));

    api.getPastScores()
      .then((serverScores) => {
        setPastScores(serverScores);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverScores));
      })
      .catch((err) => console.error('Failed to sync past scores with backend:', err));
  }, []);

  // Start new assignment
  const handleSelectTopic = async (topic: Topic) => {
    try {
      setActiveTopic(topic);
      const [fetchedQuestions, attemptData] = await Promise.all([
        api.getTopicQuestions(topic.id),
        api.startAttempt(topic.id),
      ]);

      setQuestions(fetchedQuestions);
      setAttemptId(attemptData.attempt_id);
      setActiveQuestionIndex(0);
      setMaxScore(attemptData.max_score);
      setCompletedEvalsCount(0);
      setView('scratchpad');
    } catch (err) {
      console.error('Failed to start topic attempt:', err);
      alert('Could not start assignment. Ensure backend is running.');
    }
  };

  // Submit question canvas snapshot
  const handleSubmitQuestion = async (imageBase64: string) => {
    if (!attemptId || questions.length === 0) return;

    const currentQuestion = questions[activeQuestionIndex];
    const isLastQuestion = activeQuestionIndex === questions.length - 1;

    setIsSubmitting(true);
    try {
      // Dispatch async evaluation to background worker
      await api.submitQuestionSnapshot(attemptId, currentQuestion.id, imageBase64);

      if (!isLastQuestion) {
        // Advance immediately without waiting
        setActiveQuestionIndex((prev) => prev + 1);
        setIsSubmitting(false);
      } else {
        // Last question submitted: transition to evaluation overlay and poll completion
        setIsSubmitting(false);
        setView('evaluating');
        await pollAndFinalize(attemptId);
      }
    } catch (err) {
      console.error('Error submitting question:', err);
      setIsSubmitting(false);
      alert('Error saving submission. Please try again.');
    }
  };

  // Poll background worker until all evaluations finish
  const pollAndFinalize = useCallback(async (currentAttemptId: string) => {
    const startTime = Date.now();
    const timeoutMs = 25000;

    const poll = async () => {
      try {
        const status = await api.getAttemptStatus(currentAttemptId);
        const completed = status.evaluations.filter(
          (e) => e.status === 'completed' || e.status === 'failed'
        ).length;
        setCompletedEvalsCount(completed);

        if (status.all_evaluations_done || Date.now() - startTime > timeoutMs) {
          // Finalize attempt
          const finalResult = await api.finalizeAttempt(currentAttemptId);
          const fullEvals = await api.getAttemptEvaluations(currentAttemptId);

          setTotalScore(finalResult.total_score);
          setMaxScore(finalResult.max_score);
          setEvaluations(fullEvals.evaluations);

          // Save score to LocalStorage
          if (activeTopic) {
            const newScores = {
              ...pastScores,
              [activeTopic.id]: {
                score: finalResult.total_score,
                maxScore: finalResult.max_score,
                percentage: finalResult.percentage,
                date: new Date().toLocaleDateString(),
                attemptId: currentAttemptId,
              },
            };
            setPastScores(newScores);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newScores));
            } catch {
              // ignore
            }
          }

          setView('results');
        } else {
          setTimeout(poll, 700);
        }
      } catch (err) {
        console.error('Error polling attempt status:', err);
        setView('results');
      }
    };

    poll();
  }, [activeTopic, pastScores]);

  // Review a past completed attempt from TopicHub
  const handleReviewPastAttempt = async (pastAttemptId: string) => {
    try {
      const fullEvals = await api.getAttemptEvaluations(pastAttemptId);
      setTotalScore(fullEvals.total_score);
      setMaxScore(fullEvals.max_score);
      setEvaluations(fullEvals.evaluations);
      setView('results');
    } catch (err) {
      console.error('Failed to load past attempt:', err);
      alert('Could not load past attempt details.');
    }
  };

  const handleRetake = () => {
    if (activeTopic) {
      handleSelectTopic(activeTopic);
    } else {
      setView('hub');
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearAllAttempts();
    } catch (err) {
      console.warn('Backend clear failed:', err);
    }
    localStorage.removeItem(STORAGE_KEY);
    setPastScores({});
  };

  return (
    <>
      <header className="app-header">
        <div className="brand" onClick={() => setView('hub')}>
          <div className="brand-icon">🖋️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-title">InkMath<span>.</span></span>
            <span className="brand-badge">Atelier</span>
          </div>
        </div>

        {view !== 'hub' && (
          <button className="btn btn-secondary" onClick={() => setView('hub')} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            ← Topic Hub
          </button>
        )}
      </header>

      <main className="main-content">
        {view === 'hub' && (
          <TopicHub
            topics={topics}
            pastScores={pastScores}
            onSelectTopic={handleSelectTopic}
            onReviewPastAttempt={handleReviewPastAttempt}
            onClearHistory={handleClearHistory}
          />
        )}

        {view === 'scratchpad' && questions.length > 0 && (
          <Scratchpad
            question={questions[activeQuestionIndex]}
            questionIndex={activeQuestionIndex}
            totalQuestions={questions.length}
            onSubmit={handleSubmitQuestion}
            onExit={() => setView('hub')}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'evaluating' && (
          <GradingOverlay
            completedCount={completedEvalsCount}
            totalCount={questions.length}
          />
        )}

        {view === 'results' && (
          <ResultsView
            totalScore={totalScore}
            maxScore={maxScore}
            evaluations={evaluations}
            onRetake={handleRetake}
            onBackToTopics={() => setView('hub')}
          />
        )}
      </main>
    </>
  );
};

