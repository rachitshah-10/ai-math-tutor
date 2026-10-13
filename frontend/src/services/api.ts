/**
 * InkMath API client service.
 * Handles all backend HTTP communication with early error returns (Bouncer Pattern).
 */

import {
  Topic,
  Question,
  AttemptStatus,
  EvaluationItem,
  PastScore,
  User,
  AuthResponse,
  UserAttemptHistory,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'inkmath_auth_token';

/**
 * Auth token persistence helpers.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Register a new student account.
 */
export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Registration failed');
  }
  const data: AuthResponse = await res.json();
  setAuthToken(data.token);
  return data;
}

/**
 * Authenticate student with email and password.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Invalid email or password');
  }
  const data: AuthResponse = await res.json();
  setAuthToken(data.token);
  return data;
}

/**
 * Get profile of current authenticated student.
 */
export async function getMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    setAuthToken(null);
    throw new Error('Session expired or invalid');
  }
  return res.json();
}

/**
 * Logout and clear student token.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
  } finally {
    setAuthToken(null);
  }
}

/**
 * Retrieve full chronological attempt history for current student.
 */
export async function getUserAttempts(): Promise<UserAttemptHistory[]> {
  const res = await fetch(`${API_BASE}/user/attempts`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to load student attempt history: ${res.statusText}`);
  }
  return res.json();
}

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
  const res = await fetch(`${API_BASE}/attempts`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to load past scores: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Start a new assignment attempt.
 */
export async function startAttempt(topicId: string, userId?: string): Promise<{ attempt_id: string; max_score: number }> {
  const res = await fetch(`${API_BASE}/attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ topic_id: topicId, user_id: userId }),
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


