"""
Integration tests for InkMath REST API endpoints: topics, attempts, per-user history, and submissions.
"""

from starlette.testclient import TestClient
from backend.main import app
from backend import database


def test_topics_catalog():
    """Verify topic list returns curriculum topics with questions and rubrics."""
    with TestClient(app) as client:
        resp = client.get("/api/topics")
        assert resp.status_code == 200
        topics = resp.json()
        assert isinstance(topics, list)
        assert len(topics) >= 5

        first = topics[0]
        assert "id" in first
        assert "title" in first
        assert "question_count" in first
        assert first["question_count"] > 0

        # Verify topic questions endpoint
        q_resp = client.get(f"/api/topics/{first['id']}/questions")
        assert q_resp.status_code == 200
        questions = q_resp.json()
        assert len(questions) == first["question_count"]


def test_attempt_lifecycle_and_user_history():
    """Verify student creates attempt, it links to their account, and appears in their history."""
    with TestClient(app) as client:
        # 1. Register a student
        email = f"student_history_{database.uuid.uuid4().hex[:8]}@inkmath.edu"
        reg_resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "Password123!",
            "name": "Grace Hopper"
        })
        assert reg_resp.status_code == 200
        auth_data = reg_resp.json()
        token = auth_data["token"]
        user_id = auth_data["user"]["id"]

        # 2. Get topics to find valid topic_id
        topics = client.get("/api/topics").json()
        topic_id = topics[0]["id"]

        # 3. Create attempt linked to student
        attempt_resp = client.post(
            "/api/attempts",
            json={"topic_id": topic_id, "user_id": user_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert attempt_resp.status_code == 200
        attempt = attempt_resp.json()
        assert "attempt_id" in attempt
        attempt_id = attempt["attempt_id"]
        assert attempt["user_id"] == user_id
        assert attempt["topic_id"] == topic_id

        # 4. Fetch user's attempt history
        history_resp = client.get(
            "/api/user/attempts",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert history_resp.status_code == 200
        history = history_resp.json()
        assert isinstance(history, list)
        assert len(history) >= 1
        assert any(item["id"] == attempt_id for item in history)

        # 5. Check attempt status polling
        poll_resp = client.get(f"/api/attempts/{attempt_id}")
        assert poll_resp.status_code == 200
        poll_data = poll_resp.json()
        assert poll_data["id"] == attempt_id

