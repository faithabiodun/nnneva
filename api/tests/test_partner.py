"""The trusted contact: messaging, assignment, and what the link may not reach.

The link is a capability — holding it is the whole authorisation — so most of
this file is about its edges rather than its happy path.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import Task, TaskStatus, TrustedContact


@pytest.fixture
def invited(client, signed_up, db):
    """Her contact, invited, with tasks sharing switched on."""
    contact = db.scalars(select(TrustedContact)).first()
    assert contact is not None, "the signed_up fixture should create a contact"
    contact.can_see_shared_tasks = True
    db.commit()
    token = client.post("/contact/invite", headers=signed_up).json()["access_token"]
    return token


@pytest.fixture
def her_tasks(client, signed_up, db, request):
    """Two real tasks on her list, created the way the app creates them."""
    from app.models import User

    user = db.scalars(select(User).where(User.email == "faith@example.com")).first()
    made = [
        Task(user_id=user.id, title="Collect iron tablets"),
        Task(user_id=user.id, title="Book the glucose test"),
    ]
    db.add_all(made)
    db.commit()
    return [t.id for t in made]


def test_inviting_produces_a_long_random_token(client, signed_up):
    body = client.post("/contact/invite", headers=signed_up).json()
    assert body["invited"] is True
    assert body["accepted"] is False
    assert len(body["access_token"]) >= 40, "a guessable link is the whole vulnerability"


def test_re_inviting_rotates_and_kills_the_old_link(client, signed_up):
    first = client.post("/contact/invite", headers=signed_up).json()["access_token"]
    second = client.post("/contact/invite", headers=signed_up).json()["access_token"]

    assert first != second
    assert client.get(f"/partner/{first}").status_code == 404
    assert client.get(f"/partner/{second}").status_code == 200


def test_revoking_stops_the_link(client, signed_up, invited):
    assert client.get(f"/partner/{invited}").status_code == 200
    assert client.delete("/contact/invite", headers=signed_up).status_code == 204
    assert client.get(f"/partner/{invited}").status_code == 404


def test_a_wrong_token_is_404_not_403(client):
    """403 would confirm some tokens exist, which is what a guesser is after."""
    r = client.get("/partner/not-a-real-token-at-all")
    assert r.status_code == 404


# ---- The conversation ------------------------------------------------------


def test_both_sides_see_one_thread(client, signed_up, invited):
    client.post("/contact/messages", headers=signed_up,
                json={"body": "Could you pick up my iron tablets?"})
    client.post(f"/partner/{invited}/messages", json={"body": "Already got them."})

    hers = client.get("/contact/messages", headers=signed_up).json()
    theirs = client.get(f"/partner/{invited}").json()["messages"]

    assert [m["body"] for m in hers] == [m["body"] for m in theirs]
    assert [m["sender"] for m in hers] == ["user", "contact"]


def test_opening_the_link_marks_it_accepted(client, signed_up, invited):
    assert client.get("/contact", headers=signed_up).json()["accepted"] is False
    client.get(f"/partner/{invited}")
    assert client.get("/contact", headers=signed_up).json()["accepted"] is True


# ---- Asking them to do something -------------------------------------------


def test_an_assigned_task_reaches_them_and_can_be_completed(
    client, signed_up, invited, her_tasks, db
):
    task_id = her_tasks[0]

    client.post(f"/tasks/{task_id}/assign", headers=signed_up)
    view = client.get(f"/partner/{invited}").json()
    assert [t["id"] for t in view["tasks"]] == [task_id]

    r = client.post(f"/partner/{invited}/tasks/{task_id}/done")
    assert r.status_code == 200 and r.json()["done"] is True
    assert db.get(Task, task_id).status == TaskStatus.complete


def test_unassigning_takes_it_back(client, signed_up, invited, her_tasks):
    client.post(f"/tasks/{her_tasks[0]}/assign", headers=signed_up)
    client.delete(f"/tasks/{her_tasks[0]}/assign", headers=signed_up)
    assert client.get(f"/partner/{invited}").json()["tasks"] == []


def test_they_only_ever_see_tasks_she_assigned(client, signed_up, invited, her_tasks):
    """Her list is not theirs. Only what she hands over crosses."""
    client.post(f"/tasks/{her_tasks[0]}/assign", headers=signed_up)
    seen = {t["id"] for t in client.get(f"/partner/{invited}").json()["tasks"]}
    assert seen == {her_tasks[0]}, "the unassigned one must not appear"


def test_an_unassigned_task_cannot_be_completed_through_the_link(
    client, signed_up, invited, her_tasks
):
    assert client.post(f"/partner/{invited}/tasks/{her_tasks[1]}/done").status_code == 404


def test_tasks_are_hidden_when_the_permission_is_off(
    client, signed_up, invited, her_tasks, db
):
    client.post(f"/tasks/{her_tasks[0]}/assign", headers=signed_up)

    contact = db.scalars(select(TrustedContact)).first()
    contact.can_see_shared_tasks = False
    db.commit()

    view = client.get(f"/partner/{invited}").json()
    assert view["can_see_tasks"] is False
    assert view["tasks"] == []
    assert client.post(f"/partner/{invited}/tasks/{her_tasks[0]}/done").status_code == 403


# ---- What the link must never reach ---------------------------------------


def test_the_link_exposes_only_a_first_name(client, signed_up, invited):
    view = client.get(f"/partner/{invited}").json()
    assert view["mother_name"] == "Faith", "her full name is not this link's to hand out"


def test_the_link_carries_no_pregnancy_detail(client, signed_up, invited):
    """The partner view is a whitelist, not a filtered dump of her account."""
    view = client.get(f"/partner/{invited}").json()
    assert set(view) == {
        "contact_name", "relationship", "mother_name",
        "can_see_tasks", "tasks", "messages",
    }
    for absent in ("due_date", "gestational_week", "appointments", "memories", "email"):
        assert absent not in view


def test_the_link_does_not_echo_itself_back(client, signed_up, invited):
    assert "access_token" not in client.get(f"/partner/{invited}").json()


def test_a_link_cannot_reach_another_account(client, signed_up, invited, db):
    """One contact's token must not open a different mother's tasks."""
    other = client.post("/auth/signup", json={
        "full_name": "Someone Else", "email": "other@example.com",
        "password": "hunter2hunter2"}).json()
    theirs = {"Authorization": f"Bearer {other['access_token']}"}
    client.post("/onboarding", headers=theirs, json={
        "due_date": str(date.today() + timedelta(weeks=20)),
        "help_areas": [], "contact_name": "Their Partner"})

    from app.models import User

    them = db.scalars(select(User).where(User.email == "other@example.com")).first()
    their_task = Task(user_id=them.id, title="Not hers to touch")
    db.add(their_task)
    db.commit()

    r = client.post(f"/partner/{invited}/tasks/{their_task.id}/done")
    assert r.status_code == 404
