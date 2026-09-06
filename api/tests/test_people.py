"""Finding someone, asking them, and the thread that follows.

The interesting assertions here are the ones about what search does *not*
return, and about accept granting nothing on its own.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models import Task, TaskStatus, TrustedContact, User


@pytest.fixture
def helper(client):
    """A second account, the one who will be asked to help."""
    r = client.post(
        "/auth/signup",
        json={"full_name": "Chidi Okafor", "email": "chidi@example.com",
              "password": "hunter2hunter2"},
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def connected(client, signed_up, helper):
    """Her request, accepted. Returns the contact id on her side."""
    request = client.post(
        "/people/requests", headers=signed_up,
        json={"username": "chidiokafor", "relationship": "Partner"},
    ).json()
    client.post(f"/people/requests/{request['id']}/accept", headers=helper)
    contacts = client.get("/contacts", headers=signed_up).json()
    return next(c["id"] for c in contacts if c["username"] == "chidiokafor")


# ---- Usernames -------------------------------------------------------------


def test_signing_up_allocates_a_handle(client, signed_up):
    assert client.get("/profile", headers=signed_up).json()["username"] == "faithadeyemi"


def test_a_second_account_on_the_same_seed_is_numbered(client, signed_up, db):
    """Same name, so the same seed — the second gets a number rather than failing."""
    client.post("/auth/signup", json={"full_name": "Faith Adeyemi",
                                      "email": "faith@other.com", "password": "hunter2hunter2"})
    handles = set(db.scalars(select(User.username)).all())
    assert handles == {"faithadeyemi", "faithadeyemi2"}


# ---- Search ----------------------------------------------------------------


def test_search_finds_by_handle_prefix(client, signed_up, helper):
    found = client.get("/people/search", headers=signed_up, params={"q": "chi"}).json()
    assert [p["username"] for p in found] == ["chidiokafor"]
    assert found[0]["state"] == "none"


def test_search_never_returns_yourself(client, signed_up, helper):
    found = client.get("/people/search", headers=signed_up, params={"q": "faith"}).json()
    assert found == []


def test_search_returns_no_email_or_pregnancy_detail(client, signed_up, helper):
    """A search box that confirms someone uses a maternity app is the leak."""
    found = client.get("/people/search", headers=signed_up, params={"q": "chidiokafor"}).json()
    assert set(found[0]) == {"username", "full_name", "state"}


def test_search_is_a_prefix_not_a_contains(client, signed_up, helper):
    """`%idi%` would turn the box into a way to walk the user table."""
    assert client.get("/people/search", headers=signed_up, params={"q": "idi"}).json() == []


def test_search_says_a_request_is_already_out(client, signed_up, helper):
    client.post("/people/requests", headers=signed_up, json={"username": "chidiokafor"})
    found = client.get("/people/search", headers=signed_up, params={"q": "chidiokafor"}).json()
    assert found[0]["state"] == "pending_outgoing"


def test_the_other_side_sees_it_as_incoming(client, signed_up, helper):
    client.post("/people/requests", headers=signed_up, json={"username": "chidiokafor"})
    found = client.get("/people/search", headers=helper, params={"q": "faith"}).json()
    assert found[0]["state"] == "pending_incoming"


# ---- Requests --------------------------------------------------------------


def test_a_request_reaches_the_other_persons_inbox(client, signed_up, helper):
    client.post("/people/requests", headers=signed_up,
                json={"username": "chidiokafor", "relationship": "Sister"})

    incoming = client.get("/people/requests", headers=helper).json()["incoming"]
    assert [r["username"] for r in incoming] == ["faithadeyemi"]
    assert incoming[0]["relationship"] == "Sister"

    outgoing = client.get("/people/requests", headers=signed_up).json()["outgoing"]
    assert [r["username"] for r in outgoing] == ["chidiokafor"]


def test_an_unknown_handle_is_404(client, signed_up):
    r = client.post("/people/requests", headers=signed_up, json={"username": "nobody"})
    assert r.status_code == 404


def test_you_cannot_request_yourself(client, signed_up):
    """404 rather than 400: the endpoint must not confirm handles either way."""
    assert client.post("/people/requests", headers=signed_up,
                       json={"username": "faith"}).status_code == 404


def test_a_second_request_to_the_same_person_is_refused(client, signed_up, helper):
    client.post("/people/requests", headers=signed_up, json={"username": "chidiokafor"})
    r = client.post("/people/requests", headers=signed_up, json={"username": "chidiokafor"})
    assert r.status_code == 409


def test_accepting_makes_them_a_contact(client, signed_up, helper):
    request = client.post("/people/requests", headers=signed_up,
                          json={"username": "chidiokafor", "relationship": "Partner"}).json()
    assert client.post(f"/people/requests/{request['id']}/accept",
                       headers=helper).status_code == 200

    contacts = client.get("/contacts", headers=signed_up).json()
    linked = [c for c in contacts if c["username"] == "chidiokafor"]
    assert len(linked) == 1
    assert linked[0]["name"] == "Chidi Okafor"
    assert linked[0]["accepted"] is True


def test_accepting_grants_nothing_on_its_own(client, signed_up, helper, connected):
    """Accept means "you may ask me", not "take it"."""
    contact = client.get(f"/contacts/{connected}", headers=signed_up).json()
    assert set(contact["permissions"].values()) == {False}


def test_only_the_addressee_can_accept(client, signed_up, helper):
    request = client.post("/people/requests", headers=signed_up,
                          json={"username": "chidiokafor"}).json()
    # She sent it; accepting her own request would be a way to add anyone.
    assert client.post(f"/people/requests/{request['id']}/accept",
                       headers=signed_up).status_code == 404


def test_a_request_cannot_be_answered_twice(client, signed_up, helper):
    request = client.post("/people/requests", headers=signed_up,
                          json={"username": "chidiokafor"}).json()
    client.post(f"/people/requests/{request['id']}/accept", headers=helper)
    assert client.post(f"/people/requests/{request['id']}/decline",
                       headers=helper).status_code == 409


def test_declining_leaves_no_contact(client, signed_up, helper):
    request = client.post("/people/requests", headers=signed_up,
                          json={"username": "chidiokafor"}).json()
    client.post(f"/people/requests/{request['id']}/decline", headers=helper)
    assert client.get("/contacts", headers=signed_up).json() == [
        c for c in client.get("/contacts", headers=signed_up).json() if c["username"] is None
    ]


def test_a_declined_request_can_be_sent_once_more(client, signed_up, helper):
    """People change their minds; a permanent block is a different feature."""
    request = client.post("/people/requests", headers=signed_up,
                          json={"username": "chidiokafor"}).json()
    client.post(f"/people/requests/{request['id']}/decline", headers=helper)
    again = client.post("/people/requests", headers=signed_up, json={"username": "chidiokafor"})
    assert again.status_code == 201


def test_a_request_can_be_withdrawn(client, signed_up, helper):
    request = client.post("/people/requests", headers=signed_up,
                          json={"username": "chidiokafor"}).json()
    assert client.delete(f"/people/requests/{request['id']}",
                         headers=signed_up).status_code == 204
    assert client.get("/people/requests", headers=helper).json()["incoming"] == []


# ---- Chatting once connected ----------------------------------------------


def test_both_signed_in_sides_see_one_thread(client, signed_up, helper, connected):
    client.post(f"/contacts/{connected}/messages", headers=signed_up,
                json={"body": "Could you collect the iron tablets?"})
    client.post(f"/people/helping/{connected}/messages", headers=helper,
                json={"body": "On my way."})

    hers = client.get(f"/contacts/{connected}/messages", headers=signed_up).json()
    theirs = client.get(f"/people/helping/{connected}/messages", headers=helper).json()

    assert [m["body"] for m in hers] == [m["body"] for m in theirs]
    assert [m["sender"] for m in hers] == ["user", "contact"]


def test_a_stranger_cannot_read_the_thread(client, signed_up, helper, connected):
    outsider = client.post("/auth/signup", json={
        "full_name": "Nosy N", "email": "nosy@example.com", "password": "hunter2hunter2"}).json()
    headers = {"Authorization": f"Bearer {outsider['access_token']}"}
    assert client.get(f"/people/helping/{connected}/messages",
                      headers=headers).status_code == 404


def test_she_cannot_reach_the_thread_through_the_helper_route(client, signed_up, connected):
    """She is the mother on this link, not the helper. Her route is /contacts."""
    assert client.get(f"/people/helping/{connected}/messages",
                      headers=signed_up).status_code == 404


def test_the_helper_sees_who_they_are_helping(client, signed_up, helper, connected):
    helping = client.get("/people/helping", headers=helper).json()
    assert len(helping) == 1
    assert helping[0]["mother_name"] == "Faith Adeyemi"
    assert helping[0]["mother_username"] == "faithadeyemi"
    assert helping[0]["can_see_tasks"] is False


def test_an_unread_count_reaches_the_helper(client, signed_up, helper, connected):
    client.post(f"/contacts/{connected}/messages", headers=signed_up, json={"body": "Hello?"})
    assert client.get("/people/helping", headers=helper).json()[0]["unread"] == 1
    client.get(f"/people/helping/{connected}/messages", headers=helper)
    assert client.get("/people/helping", headers=helper).json()[0]["unread"] == 0


# ---- Asking a connected helper to do something -----------------------------


def test_an_assigned_task_reaches_the_signed_in_helper(client, signed_up, helper, connected, db):
    client.patch(f"/contacts/{connected}", headers=signed_up,
                 json={"permissions": {"shared_tasks": True}})
    user = db.scalars(select(User).where(User.username == "faithadeyemi")).first()
    task = Task(user_id=user.id, title="Collect iron tablets")
    db.add(task)
    db.commit()

    client.post(f"/contacts/{connected}/tasks/{task.id}", headers=signed_up)
    seen = client.get("/people/helping", headers=helper).json()[0]["tasks"]
    assert [t["id"] for t in seen] == [task.id]

    r = client.post(f"/people/helping/{connected}/tasks/{task.id}/done", headers=helper)
    assert r.status_code == 200
    # This session created the row, so it holds a copy from before the request.
    db.expire_all()
    assert db.get(Task, task.id).status == TaskStatus.complete


def test_a_task_cannot_be_completed_while_sharing_is_off(client, signed_up, helper, connected, db):
    """The permission says what may be seen; what may not be seen may not be done."""
    user = db.scalars(select(User).where(User.username == "faithadeyemi")).first()
    task = Task(user_id=user.id, title="Book the glucose test")
    db.add(task)
    db.commit()
    client.post(f"/contacts/{connected}/tasks/{task.id}", headers=signed_up)

    r = client.post(f"/people/helping/{connected}/tasks/{task.id}/done", headers=helper)
    assert r.status_code == 403


# ---- Several contacts ------------------------------------------------------


def test_she_can_add_more_than_one_contact(client, signed_up, helper, connected):
    client.post("/contacts", headers=signed_up,
                json={"name": "Ada Nwosu", "relationship": "Sister", "phone": "+2348000000000"})

    names = {c["name"] for c in client.get("/contacts", headers=signed_up).json()}
    # Onboarding's contact, the accepted request, and the hand-added one.
    assert names == {"Chidi Adeyemi", "Chidi Okafor", "Ada Nwosu"}


def test_permissions_are_per_contact(client, signed_up, connected):
    others = [c for c in client.get("/contacts", headers=signed_up).json()
              if c["id"] != connected]
    client.patch(f"/contacts/{connected}", headers=signed_up,
                 json={"permissions": {"test_results": True}})

    mine = client.get(f"/contacts/{connected}", headers=signed_up).json()
    theirs = client.get(f"/contacts/{others[0]['id']}", headers=signed_up).json()
    assert mine["permissions"]["test_results"] is True
    assert theirs["permissions"]["test_results"] is False


def test_a_contact_with_an_account_is_not_given_a_link(client, signed_up, connected):
    """They sign in as themselves; a second way in would be a second thing to revoke."""
    r = client.post(f"/contacts/{connected}/invite", headers=signed_up)
    assert r.status_code == 409


def test_removing_a_contact_keeps_her_task(client, signed_up, helper, connected, db):
    user = db.scalars(select(User).where(User.username == "faithadeyemi")).first()
    task = Task(user_id=user.id, title="Collect iron tablets")
    db.add(task)
    db.commit()
    client.post(f"/contacts/{connected}/tasks/{task.id}", headers=signed_up)

    assert client.delete(f"/contacts/{connected}", headers=signed_up).status_code == 204
    db.expire_all()
    assert db.get(Task, task.id) is not None, "her task is hers, not the helper's"
    assert db.get(Task, task.id).assigned_contact_id is None


def test_one_contact_cannot_be_reached_from_another_account(client, signed_up, helper, connected):
    assert client.get(f"/contacts/{connected}", headers=helper).status_code == 404
