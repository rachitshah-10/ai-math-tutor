"""
Unit and integration tests for student authentication, password security, and sessions.
"""

import pytest
from starlette.testclient import TestClient
from backend.main import app
from backend import database


def test_password_hashing():
    """Verify PBKDF2-HMAC-SHA256 password hashing and constant-time verification."""
    password = "SuperSecretPassword123!"
    hashed = database.hash_password(password)
    assert hashed != password
    assert "$" in hashed  # salt$hash format
    assert database.verify_password(password, hashed) is True
    assert database.verify_password("WrongPassword!", hashed) is False


def test_user_creation_and_auth():
    """Verify user registration, lookup, and password authentication in the database."""
    email = f"test_{database.uuid.uuid4().hex[:8]}@inkmath.edu"
    user = database.create_user(email=email, password="TestPassword456!", name="Ada Lovelace")
    assert user["email"] == email
    assert user["name"] == "Ada Lovelace"
    assert "id" in user

    # Authenticate with correct password
    auth_user = database.authenticate_user(email, "TestPassword456!")
    assert auth_user is not None
    assert auth_user["id"] == user["id"]

    # Authenticate with wrong password
    bad_auth = database.authenticate_user(email, "IncorrectPassword")
    assert bad_auth is None

    # Test duplicate email rejection
    with pytest.raises(ValueError):
        database.create_user(email=email, password="AnotherPassword", name="Duplicate")


def test_sessions_lifecycle():
    """Verify session token issuance, validation, and deletion."""
    email = f"session_test_{database.uuid.uuid4().hex[:8]}@inkmath.edu"
    user = database.create_user(email=email, password="TestPassword456!", name="Alan Turing")

    token = database.create_session(user["id"])
    assert len(token) >= 32

    found_user = database.get_user_by_token(token)
    assert found_user is not None
    assert found_user["id"] == user["id"]

    # Delete session
    database.delete_session(token)
    assert database.get_user_by_token(token) is None


def test_auth_api_endpoints():
    """Test full HTTP authentication lifecycle via FastAPI endpoints."""
    with TestClient(app) as client:
        test_email = f"student_{database.uuid.uuid4().hex[:8]}@inkmath.edu"
        password = "SecureStudentPass2026!"
        name = "Katherine Johnson"

        # 1. Register new student
        reg_resp = client.post("/api/auth/register", json={
            "email": test_email,
            "password": password,
            "name": name
        })
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        assert "token" in reg_data
        assert reg_data["user"]["email"] == test_email
        token = reg_data["token"]

        # 2. Get profile with Bearer token
        me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data["name"] == name

        # 3. Unauthorized access without token
        unauth_resp = client.get("/api/auth/me")
        assert unauth_resp.status_code == 401

        # 4. Login with registered student
        login_resp = client.post("/api/auth/login", json={
            "email": test_email,
            "password": password
        })
        assert login_resp.status_code == 200
        assert "token" in login_resp.json()

        # 5. Login with invalid password
        bad_login = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword999!"
        })
        assert bad_login.status_code == 401

        # 6. Logout
        logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert logout_resp.status_code == 200

        # After logout, token is invalidated
        invalid_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert invalid_resp.status_code == 401

