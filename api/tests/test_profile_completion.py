"""Filling in pregnancy context after the fact.

Signing in with Google creates an account with no pregnancy profile, so the
context cannot be assumed to arrive through onboarding. It has to be settable
— and correctable — from the profile later.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import Memory, User


@pytest.fixture
def fresh(client):
    """An account with no onboarding, as Google sign-in leaves it."""
    r = client.post(
        "/auth/signup",
        json={"full_name": "Ada Nwosu", "email": "ada@example.com", "password": "hunter2hunter2"},
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_a_new_account_reports_itself_not_onboarded(client, fresh):
    r = client.get("/profile", headers=fresh)
    assert r.status_code == 200
    body = r.json()
    assert body["onboarded"] is False
    assert body["due_date"] is None


def test_an_onboarded_account_reports_itself_onboarded(client, signed_up):
    assert client.get("/profile", headers=signed_up).json()["onboarded"] is True


def test_a_due_date_creates_the_profile(client, fresh, db):
    due = date.today() + timedelta(weeks=12)
    r = client.patch("/profile", headers=fresh, json={"due_date": due.isoformat()})

    assert r.status_code == 200
    body = r.json()
    assert body["onboarded"] is True
    assert body["due_date"] == due.isoformat()
    # Derived, not stored — it should appear without being asked for.
    assert body["gestational_week"] is not None
    assert body["trimester"]


def test_the_profile_seeds_memory_like_onboarding_does(client, fresh, db):
    """However the context arrives, the agent should start with it."""
    due = date.today() + timedelta(weeks=10)
    client.patch("/profile", headers=fresh, json={"due_date": due.isoformat()})

    user = db.scalars(select(User).where(User.email == "ada@example.com")).first()
    facts = db.scalars(select(Memory).where(Memory.user_id == user.id)).all()
    assert any("Due" in m.fact for m in facts)


def test_context_fields_are_editable_once_the_profile_exists(client, fresh):
    due = date.today() + timedelta(weeks=20)
    client.patch("/profile", headers=fresh, json={"due_date": due.isoformat()})

    r = client.patch(
        "/profile",
        headers=fresh,
        json={
            "care_location": "Lagos Island Maternity",
            "clinician": "Dr Bello",
            "help_areas": ["Appointments", "Reminders", "  "],
        },
    )
    body = r.json()
    assert body["care_location"] == "Lagos Island Maternity"
    assert body["clinician"] == "Dr Bello"
    # Blank entries are dropped rather than stored as empty lines.
    assert body["help_areas"] == ["Appointments", "Reminders"]


def test_a_corrected_due_date_moves_the_stage_with_it(client, signed_up):
    before = client.get("/profile", headers=signed_up).json()
    moved = date.fromisoformat(before["due_date"]) - timedelta(weeks=4)

    after = client.patch("/profile", headers=signed_up,
                         json={"due_date": moved.isoformat()}).json()

    assert after["due_date"] == moved.isoformat()
    assert after["gestational_week"] > before["gestational_week"]


def test_context_fields_are_ignored_without_a_due_date(client, fresh):
    """There is no pregnancy to attach them to yet, and inventing one would be worse."""
    r = client.patch("/profile", headers=fresh, json={"care_location": "Somewhere"})
    assert r.status_code == 200
    assert r.json()["onboarded"] is False
    assert r.json()["care_location"] is None


# ---- The welcome walkthrough ----------------------------------------------


def test_a_new_account_has_not_seen_the_tour(client, fresh):
    assert client.get("/profile", headers=fresh).json()["tour_seen"] is False


def test_marking_the_tour_seen_sticks(client, fresh):
    r = client.patch("/profile", headers=fresh, json={"tour_seen": True})
    assert r.json()["tour_seen"] is True
    assert client.get("/profile", headers=fresh).json()["tour_seen"] is True


def test_the_tour_cannot_be_un_seen(client, fresh):
    """One way only: re-showing a welcome tour would be nagging, not helping."""
    client.patch("/profile", headers=fresh, json={"tour_seen": True})
    client.patch("/profile", headers=fresh, json={"tour_seen": False})
    assert client.get("/profile", headers=fresh).json()["tour_seen"] is True


def test_other_profile_edits_do_not_disturb_it(client, fresh):
    client.patch("/profile", headers=fresh, json={"tour_seen": True})
    r = client.patch("/profile", headers=fresh, json={"full_name": "Ada N"})
    assert r.json()["tour_seen"] is True
    assert r.json()["full_name"] == "Ada N"
