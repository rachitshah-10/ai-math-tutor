"""
Tests for InkMath grading engine, blank bouncer, and heuristic evaluation.
"""

import asyncio
import pytest
from backend.grader import grade_submission, _grade_heuristic_mock


def test_blank_canvas_bouncer():
    """Verify that empty or trivially small canvas uploads are bounced with 0 score and encouraging advice."""
    res_empty = asyncio.run(grade_submission(
        image_base64="",
        prompt="Solve 2x + 5 = 15",
        topic="Linear Equations",
        max_points=10,
        rubric_solution="x = 5"
    ))
    assert res_empty["score"] == 0
    assert res_empty["max_points"] == 10
    assert "No handwriting detected" in res_empty["transcription"]
    assert len(res_empty["step_analysis"]) > 0
    assert res_empty["step_analysis"][0]["status"] == "incorrect"

    res_short = asyncio.run(grade_submission(
        image_base64="data:image/png;base64,abc",
        prompt="Solve 2x + 5 = 15",
        topic="Linear Equations",
        max_points=10,
        rubric_solution="x = 5"
    ))
    assert res_short["score"] == 0


def test_heuristic_mock_grader():
    """Verify deterministic fallback grading produces structured steps matching rubric."""
    fake_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" * 10
    result = _grade_heuristic_mock(
        image_b64=fake_png,
        prompt="Solve the system of equations:\n2x + y = 9\nx - y = 3",
        topic="Systems of Linear Equations",
        max_points=10,
        rubric="Add both equations: 3x = 12 -> x = 4. Substitute into second equation: 4 - y = 3 -> y = 1. Solution: (4, 1)."
    )
    assert "score" in result
    assert result["max_points"] == 10
    assert result["score"] >= 0
    assert "step_analysis" in result
    assert len(result["step_analysis"]) >= 1
    assert "suggestions" in result

