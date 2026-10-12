"""
Background asynchronous evaluation worker for InkMath.
Consumes evaluation tasks from an in-memory asyncio queue and executes vision grading.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from . import database
from . import grader

logger = logging.getLogger(__name__)

# In-memory evaluation queue and worker task reference
_grading_queue: Optional[asyncio.Queue] = None
_worker_task: Optional[asyncio.Task] = None


def get_queue() -> asyncio.Queue:
    """
    Lazily obtain the asyncio.Queue bound to the current running event loop.
    Avoids binding to loop at import time.
    """
    global _grading_queue
    if _grading_queue is None:
        _grading_queue = asyncio.Queue()
    return _grading_queue


async def start_worker() -> None:
    """Launch the long-running worker task on application startup."""
    global _worker_task
    # Ensure queue is created in current running event loop
    get_queue()
    if _worker_task is None or _worker_task.done():
        _worker_task = asyncio.create_task(_worker_loop())
        logger.info("InkMath background grading worker started.")


async def stop_worker() -> None:
    """Cancel the worker task during application shutdown."""
    global _worker_task
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
        logger.info("InkMath background grading worker stopped.")


async def enqueue_grading_task(
    eval_id: str,
    attempt_id: str,
    question_id: str,
    image_base64: str
) -> None:
    """
    Push a new submission into the evaluation queue.
    Immediately updates initial record status to 'pending'.
    """
    question = database.fetch_question_rubric(question_id)
    max_points = question["max_points"] if question else 10

    # Ensure placeholder record exists in SQLite
    database.upsert_evaluation(
        eval_id=eval_id,
        attempt_id=attempt_id,
        question_id=question_id,
        image_data=image_base64,
        status="pending",
        max_points=max_points
    )

    queue = get_queue()
    await queue.put({
        "eval_id": eval_id,
        "attempt_id": attempt_id,
        "question_id": question_id,
        "image_base64": image_base64
    })


async def _worker_loop() -> None:
    """Continuous worker loop claiming and processing grading tasks."""
    queue = get_queue()
    while True:
        try:
            task: Dict[str, Any] = await queue.get()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error(f"Error fetching task from queue: {exc}")
            continue

        try:
            eval_id = task["eval_id"]
            attempt_id = task["attempt_id"]
            question_id = task["question_id"]
            image_base64 = task["image_base64"]

            # Mark as processing
            question = database.fetch_question_rubric(question_id)
            if not question:
                logger.error(f"Question {question_id} not found in database.")
                continue

            database.upsert_evaluation(
                eval_id=eval_id,
                attempt_id=attempt_id,
                question_id=question_id,
                image_data=image_base64,
                status="processing",
                max_points=question["max_points"]
            )

            # Realistic brief processing pause (300ms) for UI feedback
            await asyncio.sleep(0.3)

            # Execute grading
            eval_result = await grader.grade_submission(
                image_base64=image_base64,
                prompt=question["prompt"],
                topic=question["topic"],
                max_points=question["max_points"],
                rubric_solution=question["rubric_solution"]
            )

            # Update SQLite with evaluation result
            database.upsert_evaluation(
                eval_id=eval_id,
                attempt_id=attempt_id,
                question_id=question_id,
                image_data=image_base64,
                status="completed",
                max_points=question["max_points"],
                score=eval_result.get("score", 0),
                transcription=eval_result.get("transcription"),
                step_analysis=eval_result.get("step_analysis", []),
                suggestions=eval_result.get("suggestions")
            )

            # Check if all evaluations for this attempt are done, update total score
            _check_and_update_attempt_score(attempt_id)
        except Exception as exc:
            logger.error(f"Error processing grading task: {exc}", exc_info=True)
        finally:
            queue.task_done()


def _check_and_update_attempt_score(attempt_id: str) -> None:
    """
    Recalculate total score for an attempt if evaluations have arrived.
    """
    evaluations = database.fetch_evaluations_for_attempt(attempt_id)
    if not evaluations:
        return

    total_score = sum(ev.get("score", 0) for ev in evaluations if ev.get("status") == "completed")
    database.complete_attempt(attempt_id, total_score)

