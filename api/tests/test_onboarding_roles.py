"""Three roles, three sets of questions, and no answers borrowed between them.

The point of these is mostly negative: what each flow must *not* store, and
what it must not demand. A supporter asked for a due date is a supporter the
product will nag forever.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import ContactRequest, PregnancyProfile, RequestKind, TrustedContact, User


def account(client, name, email, role):
    r = client.post("/auth/signup", json={
        "full_name": name, "email": email, "password": "hunter2hunter2"})
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    client.patch("/profile", headers=headers, json={"role": role})
    return headers


@pytest.fixture
def expecting(client):
    return account(client, "Ada Expecting", "ada@example.com", "expecting")


@pytest.fixture
def postpartum(client):
    return account(client, "Bisi Postpartum", "bisi@example.com", "postpartum")


@pytest.fixture
def supporter(client):
    return account(client, "Chidi Supporter", "chidi@example.com", "supporter")


# ---- Expecting -------------------------------------------------------------


def test_expecting_is_anchored_on_a_due_date(client, expecting):
    due = date.today() + timedelta(weeks=10)
    r = client.post("/onboarding", headers=expecting, json={
        "due_date": due.isoformat(), "help_areas": ["Tests and results"]})
    assert r.status_code == 201

    body = r.json()
    assert body["due_date"] == due.isoformat()
    assert body["gestational_week"] == 30
    assert body["trimester"] == "third trimester"
    # Nothing postpartum is invented for someone who is not.
    assert body["birth_date"] is None
    assert body["postnatal_week"] is None
    assert body["feeding"] is None


def test_expecting_without_a_due_date_is_refused(client, expecting):
    r = client.post("/onboarding", headers=expecting, json={"help_areas": []})
    assert r.status_code == 422
    assert "due date" in r.json()["detail"]


# ---- Postpartum ------------------------------------------------------------


def test_postpartum_is_anchored_on_a_birth_date(client, postpartum):
    born = date.today() - timedelta(weeks=3)
    r = client.post("/onboarding", headers=postpartum, json={
        "birth_date": born.isoformat(),
        "feeding": "Both",
        "help_areas": ["Your own recovery"],
    })
    assert r.status_code == 201

    body = r.json()
    assert body["birth_date"] == born.isoformat()
    assert body["postnatal_week"] == 3
    assert body["feeding"] == "Both"
    # The pregnancy fields stay empty. A postpartum account is not at week
    # zero of anything, and there is no fourth trimester here.
    assert body["due_date"] is None
    assert body["gestational_week"] is None
    assert body["trimester"] is None


def test_postpartum_without_a_birth_date_is_refused(client, postpartum):
    r = client.post("/onboarding", headers=postpartum, json={"help_areas": []})
    assert r.status_code == 422
    assert "date of birth" in r.json()["detail"]


def test_a_due_date_sent_by_a_postpartum_account_is_ignored(client, postpartum):
    """The role decides which anchor is stored, not whatever the client sent."""
    born = date.today() - timedelta(weeks=2)
    client.post("/onboarding", headers=postpartum, json={
        "birth_date": born.isoformat(),
        "due_date": (date.today() + timedelta(weeks=10)).isoformat(),
    })
    body = client.get("/profile", headers=postpartum).json()
    assert body["due_date"] is None
    assert body["birth_date"] == born.isoformat()


# ---- Supporting someone ----------------------------------------------------


def test_a_supporter_gets_no_care_profile_at_all(client, supporter, db):
    r = client.post("/onboarding", headers=supporter, json={
        "contact_window": "Evenings, from 18:00"})
    assert r.status_code == 201

    body = r.json()
    assert body["onboarded"] is False, "there is no pregnancy of their own to record"
    assert body["due_date"] is None and body["birth_date"] is None
    assert db.scalars(select(PregnancyProfile)).first() is None


def test_a_supporter_needs_no_due_date(client, supporter):
    """The whole point: never refused for a field they were never shown."""
    assert client.post("/onboarding", headers=supporter, json={}).status_code == 201


def test_naming_someone_raises_a_request_they_must_answer(client, expecting, supporter, db):
    client.post("/onboarding", headers=supporter, json={
        "supporting_username": "adaexpecting", "contact_relationship": "Friend"})

    incoming = client.get("/people/requests", headers=expecting).json()["incoming"]
    assert [r["username"] for r in incoming] == ["chidisupporter"]
    assert incoming[0]["relationship"] == "Friend"
    # Nothing is shared by asking.
    assert db.scalars(select(TrustedContact)).first() is None


def test_the_request_runs_the_other_way_and_still_lands_under_her(
    client, expecting, supporter, db
):
    """A supporter offers; she accepts. The contact row is hers either way."""
    client.post("/onboarding", headers=supporter, json={
        "supporting_username": "adaexpecting", "contact_relationship": "Friend"})

    request = client.get("/people/requests", headers=expecting).json()["incoming"][0]
    assert client.post(f"/people/requests/{request['id']}/accept",
                       headers=expecting).status_code == 200

    contact = db.scalars(select(TrustedContact)).one()
    her = db.scalars(select(User).where(User.username == "adaexpecting")).one()
    him = db.scalars(select(User).where(User.username == "chidisupporter")).one()
    assert contact.user_id == her.id, "the contact belongs to the person being helped"
    assert contact.linked_user_id == him.id
    # And it grants nothing until she switches something on.
    assert contact.can_see_shared_tasks is False

    stored = db.scalars(select(ContactRequest)).one()
    assert stored.kind is RequestKind.to_help


def test_she_then_sees_him_and_he_sees_her(client, expecting, supporter):
    client.post("/onboarding", headers=supporter, json={
        "supporting_username": "adaexpecting"})
    request = client.get("/people/requests", headers=expecting).json()["incoming"][0]
    client.post(f"/people/requests/{request['id']}/accept", headers=expecting)

    assert [c["username"] for c in client.get("/contacts", headers=expecting).json()] == [
        "chidisupporter"
    ]
    helping = client.get("/people/helping", headers=supporter).json()
    assert [p["mother_username"] for p in helping] == ["adaexpecting"]


def test_an_unknown_username_is_refused(client, supporter):
    r = client.post("/onboarding", headers=supporter, json={"supporting_username": "nobody"})
    assert r.status_code == 404


def test_a_supporter_who_names_nobody_is_still_set_up(client, supporter):
    """"They have not joined yet" is a real answer, not a failure."""
    r = client.post("/onboarding", headers=supporter, json={"contact_window": "Any time is fine"})
    assert r.status_code == 201
    assert client.get("/profile", headers=supporter).json()["contact_window"] == "Any time is fine"
