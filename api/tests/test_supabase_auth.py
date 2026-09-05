"""Google sign-in, brokered by Supabase Auth.

The route itself is covered by faking `verify_access_token`, because a real Google
ID token cannot be minted in a test. What is deliberately *not* faked is what
happens to an account created that way: those rows have no password hash, and
the password form must not be a way into them.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.config import get_settings
from app.models import User
from app.security import verify_password


@pytest.fixture
def supabase_configured(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_url", "https://test-project.supabase.co")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "")
    return settings


@pytest.fixture
def google_identity(monkeypatch):
    """Stand in for Supabase, returning whichever identity a test asks for."""
    from app import supabase_auth
    from app.routers import auth as auth_router

    def _use(email: str, full_name: str = "Faith Abiodun"):
        def fake(token: str, supabase_url: str, jwt_secret: str = ""):
            assert token == "a-token"
            assert supabase_url == "https://test-project.supabase.co"
            return supabase_auth.SupabaseIdentity(email=email, full_name=full_name)

        monkeypatch.setattr(auth_router, "verify_access_token", fake)

    return _use


def test_google_sign_in_creates_an_account(client, supabase_configured, google_identity, db):
    google_identity("new@example.com")
    r = client.post("/auth/supabase", json={"access_token": "a-token"})

    assert r.status_code == 200
    assert r.json()["onboarded"] is False
    assert r.json()["access_token"]

    user = db.scalars(select(User).where(User.email == "new@example.com")).first()
    assert user is not None
    assert user.password_hash is None


def test_second_sign_in_reuses_the_same_account(client, supabase_configured, google_identity, db):
    google_identity("repeat@example.com")
    client.post("/auth/supabase", json={"access_token": "a-token"})
    client.post("/auth/supabase", json={"access_token": "a-token"})

    assert len(db.scalars(select(User).where(User.email == "repeat@example.com")).all()) == 1


def test_google_signs_into_an_existing_password_account(
    client, signed_up, supabase_configured, google_identity, db
):
    """Same address, so it is the same person — not a second account."""
    google_identity("faith@example.com")
    r = client.post("/auth/supabase", json={"access_token": "a-token"})

    assert r.status_code == 200
    assert len(db.scalars(select(User).where(User.email == "faith@example.com")).all()) == 1
    # Their existing password still works; signing in with Google did not clear it.
    assert db.scalars(select(User).where(User.email == "faith@example.com")).first().password_hash


@pytest.mark.parametrize("password", ["", " ", "anything"])
def test_a_google_account_cannot_be_logged_into_with_the_password_form(
    client, supabase_configured, google_identity, password
):
    """The point of the nullable column: no password opens a passwordless row."""
    google_identity("passwordless@example.com")
    client.post("/auth/supabase", json={"access_token": "a-token"})

    r = client.post("/auth/login", json={"email": "passwordless@example.com", "password": password})
    assert r.status_code == 401


def test_verify_password_refuses_a_missing_hash():
    assert verify_password("", None) is False
    assert verify_password("anything", None) is False
    assert verify_password("anything", "") is False


def test_route_is_501_when_supabase_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "")
    r = client.post("/auth/supabase", json={"access_token": "a-token"})
    assert r.status_code == 501


def test_an_unverified_token_is_401(client, supabase_configured, monkeypatch):
    from app import supabase_auth
    from app.routers import auth as auth_router

    def fake(token: str, supabase_url: str, jwt_secret: str = ""):
        raise supabase_auth.SupabaseAuthError("Signature verification failed")

    monkeypatch.setattr(auth_router, "verify_access_token", fake)
    r = client.post("/auth/supabase", json={"access_token": "forged"})
    assert r.status_code == 401
