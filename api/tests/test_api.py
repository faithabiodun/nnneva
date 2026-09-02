"""Auth, ownership boundaries and input handling."""

from __future__ import annotations

from datetime import date, timedelta


def test_health_reports_the_configuration(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    # No AWS credentials in the test environment, so auto resolves to scripted.
    assert body["mode"] == "auto"
    assert body["will_try_bedrock"] is False
    assert body["model"] is None


def test_every_user_route_requires_a_token(client):
    for path in ("/home", "/tasks", "/goals", "/appointments", "/activity", "/memory",
                 "/profile", "/approvals", "/agent/runs", "/safety-events"):
        assert client.get(path).status_code == 401, path
    assert client.post("/agent/runs", json={"message": "hello"}).status_code == 401
    assert client.post("/onboarding", json={"due_date": "2026-11-14"}).status_code == 401


def test_a_garbage_token_is_rejected(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/home", headers=headers).status_code == 401


def test_duplicate_signup_is_refused(client, signed_up):
    again = client.post(
        "/auth/signup",
        json={"full_name": "Someone Else", "email": "faith@example.com", "password": "hunter2hunter2"},
    )
    assert again.status_code == 409


def test_login_says_the_same_thing_for_both_failures(client, signed_up):
    unknown = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": "hunter2hunter2"}
    )
    wrong = client.post(
        "/auth/login", json={"email": "faith@example.com", "password": "wrongwrongwrong"}
    )
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]


def test_short_passwords_are_refused(client):
    r = client.post(
        "/auth/signup",
        json={"full_name": "Faith", "email": "short@example.com", "password": "short"},
    )
    assert r.status_code == 422


def _second_user(client) -> dict[str, str]:
    r = client.post(
        "/auth/signup",
        json={"full_name": "Amina Bello", "email": "amina@example.com", "password": "hunter2hunter2"},
    )
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    client.post(
        "/onboarding",
        headers=headers,
        json={"due_date": (date.today() + timedelta(weeks=20)).isoformat()},
    )
    return headers


def test_one_user_cannot_read_or_change_anothers_records(client, signed_up):
    faith = signed_up
    run = client.post(
        "/agent/runs",
        headers=faith,
        json={"message": "Prepare questions for my appointment and send it to Chidi"},
    ).json()
    task_id = client.get("/tasks", headers=faith).json()[0]["id"]
    memory_id = client.get("/memory", headers=faith).json()[0]["id"]
    appointment_id = client.get("/appointments", headers=faith).json()[0]["id"]
    approval_id = run["approvals"][0]["id"]

    amina = _second_user(client)

    assert client.get(f"/agent/runs/{run['id']}", headers=amina).status_code == 404
    assert client.patch(
        f"/tasks/{task_id}", headers=amina, json={"status": "Complete"}
    ).status_code == 404
    assert client.delete(f"/memory/{memory_id}", headers=amina).status_code == 404
    assert client.post(
        f"/appointments/{appointment_id}/questions", headers=amina, json={"text": "hi"}
    ).status_code == 404
    assert client.post(
        f"/approvals/{approval_id}", headers=amina, json={"approve": True}
    ).status_code == 404

    # And Faith's records are untouched.
    assert client.get("/tasks", headers=faith).json()[0]["status"] != "Complete"
    assert len(client.get("/memory", headers=faith).json()) >= 1


def test_a_new_users_screens_are_empty_rather_than_broken(client):
    headers = _second_user(client)
    home = client.get("/home", headers=headers).json()
    assert home["today"] == []
    assert home["goals"] == []
    assert home["next_appointment"] is None
    assert home["pending_approvals"] == []
    assert client.get("/activity", headers=headers).json() == []


def test_onboarding_seeds_the_context_the_agent_reads(client, signed_up):
    profile = client.get("/profile", headers=signed_up).json()
    assert profile["care_location"] == "Lagoon Antenatal Clinic"
    assert profile["gestational_week"] == 32
    assert profile["trimester"] == "third trimester"
    assert profile["trusted_contact"]["name"] == "Chidi Adeyemi"

    memories = client.get("/memory", headers=signed_up).json()
    assert any("Lagoon" in m["fact"] for m in memories)
    assert any("Chidi" in m["fact"] for m in memories)


def test_an_unknown_task_status_is_refused(client, signed_up):
    client.post("/agent/runs", headers=signed_up, json={"message": "prepare for my appointment"})
    task_id = client.get("/tasks", headers=signed_up).json()[0]["id"]
    r = client.patch(f"/tasks/{task_id}", headers=signed_up, json={"status": "Nonsense"})
    assert r.status_code == 422


def test_forgetting_a_memory_hides_it_without_losing_the_record(client, signed_up, db):
    from sqlalchemy import select

    from app.models import Memory

    memory_id = client.get("/memory", headers=signed_up).json()[0]["id"]
    assert client.delete(f"/memory/{memory_id}", headers=signed_up).status_code == 204
    assert all(m["id"] != memory_id for m in client.get("/memory", headers=signed_up).json())

    row = db.scalars(select(Memory).where(Memory.id == memory_id)).first()
    assert row is not None and row.forgotten_at is not None


def test_profile_updates_persist(client, signed_up):
    updated = client.patch(
        "/profile",
        headers=signed_up,
        json={
            "retention": "3 months",
            "notifications": {"daily_summary": True},
            "trusted_contact_permissions": {"test_results": True},
        },
    ).json()
    assert updated["retention"] == "3 months"
    assert updated["notifications"]["daily_summary"] is True
    assert updated["trusted_contact"]["permissions"]["test_results"] is True

    assert client.get("/profile", headers=signed_up).json()["retention"] == "3 months"
