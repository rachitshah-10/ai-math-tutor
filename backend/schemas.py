"""
Pydantic data schemas for InkMath API.
Defines input payloads, validation rules, and output representations.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class QuestionSchema(BaseModel):
    """Schema representing an individual math question."""
    id: str
    topic_id: str
    order_index: int
    prompt: str
    topic: str
    max_points: int
    hint: Optional[str] = None


class TopicSchema(BaseModel):
    """Schema representing a math subject topic with metadata."""
    id: str
    title: str
    description: str
    icon: str
    difficulty: str
    question_count: int


class RegisterRequest(BaseModel):
    """Payload for student registration."""
    email: str = Field(..., description="Student email address")
    password: str = Field(..., min_length=4, description="Student password")
    name: str = Field(..., min_length=1, description="Student display name")


class LoginRequest(BaseModel):
    """Payload for student login."""
    email: str = Field(..., description="Student email address")
    password: str = Field(..., description="Student password")


class UserResponse(BaseModel):
    """Public student user representation."""
    id: str
    email: str
    name: str
    created_at: str


class AuthResponse(BaseModel):
    """Response returned upon successful authentication."""
    token: str
    user: UserResponse


class CreateAttemptRequest(BaseModel):
    """Request payload to initiate a new assignment attempt."""
    topic_id: str = Field(..., description="Target topic ID to begin")
    user_id: Optional[str] = Field(None, description="Optional associated student user ID")


class SubmitQuestionRequest(BaseModel):
    """Request payload containing handwritten canvas snapshot."""
    question_id: str = Field(..., description="Question being answered")
    image_base64: str = Field(..., description="Base64 encoded PNG image data from canvas")


class StepValidation(BaseModel):
    """Validation report for an individual mathematical step."""
    step_number: int
    description: str
    status: str  # 'correct', 'partial', 'incorrect'
    notes: Optional[str] = None


class EvaluationResult(BaseModel):
    """Detailed evaluation output produced by AI vision grading."""
    id: str
    attempt_id: str
    question_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    score: int
    max_points: int
    transcription: Optional[str] = None
    step_analysis: List[StepValidation] = []
    suggestions: Optional[str] = None
    image_base64: Optional[str] = None


class AttemptSummary(BaseModel):
    """Summary of a completed or in-progress assignment attempt."""
    id: str
    topic_id: str
    total_score: int
    max_score: int
    completed: bool
    created_at: str
    completed_at: Optional[str] = None
    evaluations: List[EvaluationResult] = []

