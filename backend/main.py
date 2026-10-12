"""
Main FastAPI server for InkMath.
Provides RESTful endpoints for topic catalogs, assignment attempts,
canvas image submissions, and background evaluation queries.
"""

import uuid
from contextlib import asynccontextmanager
from typing import List, Dict, Any
import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load local environment variables from .env if present
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

from . import database
from . import worker
from . import schemas


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes SQLite schema and seeds pre-loaded topics on startup.
    Launches and cleans up background grading workers.
    """
    database.initialize_database()
    await worker.start_worker()
    yield
    await worker.stop_worker()


app = FastAPI(
    title="InkMath API",
    description="Backend API for InkMath AI Math Tutoring Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    """Health status endpoint."""
    return {"status": "ok", "service": "InkMath Backend"}


@app.get("/api/topics", response_model=List[schemas.TopicSchema])
async def list_topics():
    """Retrieve pre-populated math curriculum topics."""
    topics = database.fetch_all_topics()
    return topics


@app.get("/api/topics/{topic_id}/questions", response_model=List[schemas.QuestionSchema])
async def get_topic_questions(topic_id: str):
    """Retrieve ordered questions for a specific topic."""
    questions = database.fetch_questions_by_topic(topic_id)
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{topic_id}' not found or contains no questions."
        )
    return questions


@app.post("/api/attempts")
async def create_attempt(payload: schemas.CreateAttemptRequest):
    """
    Initialize a new assignment attempt for a topic.
    Returns attempt ID and total potential points.
    """
    questions = database.fetch_questions_by_topic(payload.topic_id)
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{payload.topic_id}' has no questions to start."
        )

    attempt_id = str(uuid.uuid4())
    max_score = sum(q["max_points"] for q in questions)
    database.insert_attempt(attempt_id, payload.topic_id, max_score)

    return {
        "attempt_id": attempt_id,
        "topic_id": payload.topic_id,
        "max_score": max_score,
        "question_count": len(questions)
    }


@app.get("/api/attempts")
async def list_attempts_summary():
    """
    Retrieve completed attempt summary mapped by topic_id.
    Synchronizes client-side UI with true database state.
    """
    return database.fetch_completed_attempts_summary()


@app.get("/api/attempts/{attempt_id}")
async def get_attempt_status(attempt_id: str):
    """
    Fetch current attempt progress and per-question evaluation statuses.
    Used by the client to poll completion of background grading.
    """
    attempt = database.fetch_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt '{attempt_id}' not found."
        )

    evaluations = database.fetch_evaluations_for_attempt(attempt_id)
    total_score = sum(e.get("score", 0) for e in evaluations if e.get("status") == "completed")
    all_completed = all(e.get("status") in ["completed", "failed"] for e in evaluations) if evaluations else False

    return {
        "id": attempt["id"],
        "topic_id": attempt["topic_id"],
        "completed": bool(attempt["completed"]),
        "all_evaluations_done": all_completed,
        "total_score": total_score,
        "max_score": attempt["max_score"],
        "evaluations_count": len(evaluations),
        "evaluations": evaluations
    }


@app.post("/api/attempts/{attempt_id}/submit")
async def submit_question(attempt_id: str, payload: schemas.SubmitQuestionRequest):
    """
    Submit handwritten canvas snapshot for a question.
    Immediately queues evaluation to background worker and returns without blocking.
    """
    attempt = database.fetch_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt '{attempt_id}' not found."
        )

    eval_id = f"{attempt_id}_{payload.question_id}"
    await worker.enqueue_grading_task(
        eval_id=eval_id,
        attempt_id=attempt_id,
        question_id=payload.question_id,
        image_base64=payload.image_base64
    )

    return {
        "evaluation_id": eval_id,
        "status": "pending",
        "message": "Submission received. Grading in background."
    }


@app.post("/api/attempts/{attempt_id}/complete")
async def complete_attempt(attempt_id: str):
    """
    Finalize an attempt, calculate earned score across all completed questions.
    """
    attempt = database.fetch_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt '{attempt_id}' not found."
        )

    evaluations = database.fetch_evaluations_for_attempt(attempt_id)
    total_score = sum(e.get("score", 0) for e in evaluations if e.get("status") == "completed")
    database.complete_attempt(attempt_id, total_score)

    return {
        "attempt_id": attempt_id,
        "topic_id": attempt["topic_id"],
        "total_score": total_score,
        "max_score": attempt["max_score"],
        "percentage": round((total_score / attempt["max_score"] * 100), 1) if attempt["max_score"] > 0 else 0,
        "completed": True
    }


@app.get("/api/attempts/{attempt_id}/evaluations")
async def get_attempt_evaluations(attempt_id: str):
    """
    Retrieve full question-by-question evaluations including student drawing images,
    step analysis breakdowns, and AI feedback.
    """
    attempt = database.fetch_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt '{attempt_id}' not found."
        )

    evaluations = database.fetch_evaluations_for_attempt(attempt_id)
    # Also fetch question prompts for easy side-by-side rendering
    for ev in evaluations:
        q = database.fetch_question_rubric(ev["question_id"])
        if q:
            ev["prompt"] = q["prompt"]
            ev["topic"] = q["topic"]
            ev["rubric_solution"] = q["rubric_solution"]

    return {
        "attempt_id": attempt_id,
        "total_score": attempt["total_score"],
        "max_score": attempt["max_score"],
        "evaluations": evaluations
    }


@app.delete("/api/attempts")
@app.post("/api/attempts/clear")
async def clear_all_attempts():
    """Clear all past student attempts and evaluations from the database."""
    stats = database.clear_all_attempts()
    return {
        "status": "ok",
        "message": "All past attempts and evaluations cleared successfully.",
        **stats
    }


