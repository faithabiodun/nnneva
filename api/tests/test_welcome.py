"""The first-run step: who someone is, and what they are called here.

The role is not decoration. It decides what the product is allowed to assume,
and the assertions below are mostly about what it stops the app doing to
someone who is not pregnant.
"""

from __future__ import annotations

import pytest


@pytest.fixture
def fresh_person(client):
    """A brand-new account, before any first-run answer."""
    r = client.post(
        "/auth/signup",
        json={"full_name": "New Person", "email": "new@example.com",
              "password": "hunter2hunter2"},
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---- The role --------------------------------------------------------------


def test_a_new_account_has_not_answered_yet(client, fresh_person):
    """Null is the signal that sends someone to the first-run step."""
    assert client.get("/profile", headers=fresh_person).json()["role"] is None


@pytest.mark.parametrize("role", ["expecting", "postpartum", "supporter"])
def test_each_role_can_be_chosen(client, fresh_person, role):
    r = client.patch("/profile", headers=fresh_person, json={"role": role})
    assert r.status_code == 200
    assert r.json()["role"] == role
    assert client.get("/profile", headers=fresh_person).json()["role"] == role


def test_an_invented_role_is_refused(client, fresh_person):
    assert client.patch("/profile", headers=fresh_person,
                        json={"role": "admin"}).status_code == 422


def test_finishing_onboarding_answers_the_question_by_itself(client, signed_up):
    """Giving a due date is saying you are expecting.

    Without this an account could be fully onboarded and still have no role,
    which would send someone back to a welcome screen after they had already
    told the app everything. The same reasoning is why the migration marks
    existing accounts `expecting` rather than leaving them null."""
    assert client.get("/profile", headers=signed_up).json()["role"] == "expecting"


def test_onboarding_does_not_overwrite_an_answer_already_given(client, fresh_person):
    """Someone postpartum who fills in a date is still postpartum."""
    client.patch("/profile", headers=fresh_person, json={"role": "postpartum"})
    client.post("/onboarding", headers=fresh_person, json={
        "due_date": "2027-01-01", "help_areas": ["Tests and results"],
    })
    assert client.get("/profile", headers=fresh_person).json()["role"] == "postpartum"


# ---- Choosing a handle -----------------------------------------------------


def test_the_allocated_handle_is_offered_back(client, fresh_person):
    """The picker pre-fills with this, so pressing Continue is a valid answer."""
    assert client.get("/profile", headers=fresh_person).json()["username"] == "newperson"


def test_a_free_handle_is_reported_free(client, fresh_person):
    body = client.get("/people/username-available", headers=fresh_person,
                      params={"u": "free_handle_9"}).json()
    assert body["available"] is True
    assert body["problem"] is None


def test_your_own_handle_does_not_read_as_taken(client, fresh_person):
    """Otherwise the picker refuses to let someone keep the name they have."""
    body = client.get("/people/username-available", headers=fresh_person,
                      params={"u": "newperson"}).json()
    assert body["available"] is True


def test_someone_elses_handle_reads_as_taken(client, signed_up, fresh_person):
    body = client.get("/people/username-available", headers=fresh_person,
                      params={"u": "faithadeyemi"}).json()
    assert body["available"] is False
    assert body["problem"] == "That username is taken."


@pytest.mark.parametrize(
    "handle,fragment",
    [
        ("ab", "at least 3"),
        ("admin", "reserved"),
        ("bad!name", "letters, numbers"),
        (".leading", "letters, numbers"),
        ("trailing.", "letters, numbers"),
    ],
)
def test_the_reason_is_a_sentence_not_a_regex(client, fresh_person, handle, fragment):
    body = client.get("/people/username-available", headers=fresh_person,
                      params={"u": handle}).json()
    assert body["available"] is False
    assert fragment in body["problem"]


def test_the_check_is_behind_a_session(client):
    """Unauthenticated this would be an oracle for enumerating handles."""
    assert client.get("/people/username-available", params={"u": "anyone"}).status_code == 401


# ---- Saving it -------------------------------------------------------------


def test_choosing_a_handle_sticks(client, fresh_person):
    r = client.patch("/profile", headers=fresh_person,
                     json={"role": "supporter", "username": "helper.one"})
    assert r.status_code == 200
    assert r.json()["username"] == "helper.one"


def test_a_handle_is_lowercased_on_the_way_in(client, fresh_person):
    """A capital typed here would otherwise become a handle nobody matches."""
    r = client.patch("/profile", headers=fresh_person, json={"username": "MixedCase"})
    assert r.json()["username"] == "mixedcase"


def test_taking_someone_elses_handle_is_refused(client, signed_up, fresh_person):
    r = client.patch("/profile", headers=fresh_person, json={"username": "faithadeyemi"})
    assert r.status_code == 409
    assert r.json()["detail"] == "That username is taken."


def test_an_invalid_handle_is_refused_with_the_reason(client, fresh_person):
    r = client.patch("/profile", headers=fresh_person, json={"username": "no"})
    assert r.status_code == 422
    assert "at least 3" in r.json()["detail"]


def test_keeping_your_own_handle_is_not_a_conflict(client, fresh_person):
    """The picker sends whatever is in the box, including the unchanged one."""
    assert client.patch("/profile", headers=fresh_person,
                        json={"username": "newperson"}).status_code == 200


def test_a_refused_handle_changes_nothing_else(client, signed_up, fresh_person):
    """The role must not be saved by a request that failed on the handle."""
    client.patch("/profile", headers=fresh_person,
                 json={"role": "postpartum", "username": "faithadeyemi"})
    assert client.get("/profile", headers=fresh_person).json()["role"] is None
