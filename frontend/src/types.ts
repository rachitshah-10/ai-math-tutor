/**
 * TypeScript types for InkMath frontend application.
 */

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: string;
  question_count: number;
}

export interface Question {
  id: string;
  topic_id: string;
  order_index: number;
  prompt: string;
  topic: string;
  max_points: number;
  hint?: string;
}

export interface StepValidation {
  step_number: number;
  description: string;
  status: 'correct' | 'partial' | 'incorrect';
  notes?: string;
}

export interface EvaluationItem {
  id: string;
  attempt_id: string;
  question_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  score: number;
  max_points: number;
  transcription?: string;
  step_analysis?: StepValidation[];
  suggestions?: string;
  image_data?: string;
  prompt?: string;
  topic?: string;
  rubric_solution?: string;
}

export interface AttemptStatus {
  id: string;
  topic_id: string;
  completed: boolean;
  all_evaluations_done: boolean;
  total_score: number;
  max_score: number;
  evaluations_count: number;
  evaluations: EvaluationItem[];
}

export interface PastScore {
  score: number;
  maxScore: number;
  percentage: number;
  date: string;
  attemptId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserAttemptHistory {
  id: string;
  topic_id: string;
  user_id: string;
  total_score: number;
  max_score: number;
  completed: boolean;
  created_at: string;
  completed_at?: string;
  topic_title: string;
  topic_icon: string;
  topic_difficulty: string;
  percentage: number;
}


