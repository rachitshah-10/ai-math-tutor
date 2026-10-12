/**
 * InkMath API client service.
 * Handles all backend HTTP communication with early error returns (Bouncer Pattern).
 */

import { Topic, Question, AttemptStatus, EvaluationItem, PastScore } from '../types';

const API_BASE = '/api';

/**
 * Fetch all topics from the catalog.
 */
export async function getTopics(): Promise<Topic[]> {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) {
    throw new Error(`Failed to load topics: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch questions for a specific topic.
 */
export async function getTopicQuestions(topicId: string): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/topics/${encodeURIComponent(topicId)}/questions`);
  if (!res.ok) {
    throw new Error(`Failed to load questions for topic ${topicId}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Retrieve completed attempt summary mapped by topic_id from database.
 */
export async function getPastScores(): Promise<Record<string, PastScore>> {
  const res = await fetch(`${API_BASE}/attempts`);
  if (!res.ok) {
    throw new Error(`Failed to load past scores: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Start a new assignment attempt.
 */
export async function startAttempt(topicId: string): Promise<{ attempt_id: string; max_score: number }> {
  const res = await fetch(`${API_BASE}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic_id: topicId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create attempt: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Submit canvas snapshot for a question to background grading.
 */
export async function submitQuestionSnapshot(
  attemptId: string,
  questionId: string,
  imageBase64: string
): Promise<{ evaluation_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: questionId,
      image_base64: imageBase64,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit question: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Poll attempt status to check if all background evaluations finished.
 */
export async function getAttemptStatus(attemptId: string): Promise<AttemptStatus> {
  const res = await fetch(`${API_BASE}/attempts/${encodeURIComponent(attemptId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch attempt status: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Complete attempt and compute final score.
 */
export async function finalizeAttempt(attemptId: string): Promise<{ total_score: number; max_score: number; percentage: number }> {
  const res = await fetch(`${API_BASE}/attempts/${encodeURIComponent(attemptId)}/complete`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to finalize attempt: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Retrieve comprehensive evaluation breakdown for results drawer.
 */
export async function getAttemptEvaluations(attemptId: string): Promise<{
  attempt_id: string;
  total_score: number;
  max_score: number;
  evaluations: EvaluationItem[];
}> {
  const res = await fetch(`${API_BASE}/attempts/${encodeURIComponent(attemptId)}/evaluations`);
  if (!res.ok) {
    throw new Error(`Failed to fetch evaluations: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Clear all past student attempts and evaluations.
 */
export async function clearAllAttempts(): Promise<{ status: string; attempts_deleted: number; evaluations_deleted: number }> {
  const res = await fetch(`${API_BASE}/attempts`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to clear attempts: ${res.statusText}`);
  }
  return res.json();
}


