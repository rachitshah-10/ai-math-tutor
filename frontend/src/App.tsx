/**
 * InkMath Main Application Component.
 * Orchestrates views: AuthGate -> TopicHub -> Scratchpad -> Grading -> ResultsView.
 * Enforces strict authentication gating: redirects unauthenticated access and logouts to the Login Screen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Topic, Question, EvaluationItem, PastScore, User } from './types';
import * as api from './services/api';
import { TopicHub } from './components/TopicHub';
import { Scratchpad } from './components/Scratchpad';
import { GradingOverlay } from './components/GradingOverlay';
import { ResultsView } from './components/ResultsView';
import { AuthCard } from './components/AuthModal';
import { HistoryModal } from './components/HistoryModal';

type AppView = 'hub' | 'scratchpad' | 'evaluating' | 'results';

const STORAGE_KEY = 'inkmath_past_scores';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('hub');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // User & Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

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

  const syncScores = useCallback(() => {
    api.getPastScores()
      .then((serverScores) => {
        setPastScores(serverScores);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverScores));
      })
      .catch((err) => console.error('Failed to sync past scores with backend:', err));
  }, []);

  // Initial load: verify session and fetch topics
  useEffect(() => {
    api.getTopics()
      .then(setTopics)
      .catch((err) => console.error('Failed to load topics:', err));

    if (api.getAuthToken()) {
      api.getMe()
        .then((user) => {
          setCurrentUser(user);
          syncScores();
        })
        .catch(() => {
          api.setAuthToken(null);
          setCurrentUser(null);
        })
        .finally(() => {
          setIsCheckingAuth(false);
        });
    } else {
      setIsCheckingAuth(false);
    }
  }, [syncScores]);

  // Handle logout: clear token, reset state, and redirect to login screen
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveTopic(null);
    setQuestions([]);
    setAttemptId(null);
    setView('hub');
    setPastScores({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Start new assignment
  const handleSelectTopic = async (topic: Topic) => {
    if (!currentUser) return;

    try {
      setActiveTopic(topic);
      const [fetchedQuestions, attemptData] = await Promise.all([
        api.getTopicQuestions(topic.id),
        api.startAttempt(topic.id, currentUser.id),
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

  // 1. Initial auth verification loading state
  if (isCheckingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          gap: 16,
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>🖋️</div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            color: 'var(--accent)',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Loading InkMath Atelier...
        </div>
      </div>
    );
  }

  // 2. Strict Auth Gate: Redirect to Login Screen if not authenticated
  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-main)',
        }}
      >
        <header className="app-header">
          <div className="brand">
            <div className="brand-icon">🖋️</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="brand-title">InkMath<span>.</span></span>
              <span className="brand-badge">Atelier</span>
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid rgba(229, 176, 120, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔒</span>
            <span>Sign In Required</span>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <AuthCard
            isStandalone={true}
            onSuccess={(user) => {
              setCurrentUser(user);
              syncScores();
            }}
          />
        </main>
      </div>
    );
  }

  // 3. Authenticated Application
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsHistoryModalOpen(true)}
            style={{ padding: '7px 14px', fontSize: '0.85rem' }}
            title="View all your past completed quizzes"
          >
            📜 My History
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              background: 'var(--accent-soft)',
              border: '1px solid rgba(229, 176, 120, 0.3)',
              borderRadius: 999,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--accent)',
            }}
          >
            <span>👤</span>
            <span>{currentUser.name}</span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ padding: '6px 12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}
            title="Sign out and return to login screen"
          >
            Logout
          </button>

          {view !== 'hub' && (
            <button className="btn btn-secondary" onClick={() => setView('hub')} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              ← Topic Hub
            </button>
          )}
        </div>
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

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        user={currentUser}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectAttemptForReview={handleReviewPastAttempt}
      />
    </>
  );
};
