"""The core workflow from §05, driven through the API the frontend calls.

    "I have an antenatal appointment next Thursday. I need to prepare
     questions, get my blood test done, and remember everything I need."

Nnneva should read her context, screen the message, create tasks, schedule
reminders, prepare questions, ask before sharing anything, remember what
happened, and be able to continue from it later.
"""

from __future__ import annotations

GOAL = (
    "I have an antenatal appointment next Thursday. I need to prepare questions, "
    "get my blood test done, and remember everything I need. Please also send the "
    "reminder to my partner Chidi."
)


def test_the_core_workflow(client, signed_up):
    headers = signed_up

    run = client.post("/agent/runs", headers=headers, json={"message": GOAL}).json()

    # It read her context and screened the message before doing anything.
    tools = [a["tool"] for a in run["actions"]]
    assert tools[0] == "get_user_context"
    assert tools[1] == "safety_check"
    assert run["safety_band"] == "none"

    # It did real work rather than describing it.
    assert "create_task" in tools
    assert "create_appointment_preparation" in tools
    assert "schedule_reminder" in tools
    assert "save_memory" in tools

    # The share stopped and waited.
    assert run["status"] == "awaiting_approval"
    assert len(run["approvals"]) == 1
    assert run["approvals"][0]["status"] == "pending"

    # Nothing about which engine ran is left implicit.
    assert run["engine"] == "scripted"

    # The plan the UI renders came out of what actually happened.
    assert len(run["plan_steps"]) == len(run["actions"])
    assert run["plan_steps"][0]["state"] == "done"
    assert any(s["state"] == "approval" for s in run["plan_steps"])

    # The work landed in the tables the screens read.
    tasks = client.get("/tasks", headers=headers).json()
    assert len(tasks) >= 4
    assert any("Fast from 21:00" in t["title"] for t in tasks)

    appointments = client.get("/appointments", headers=headers).json()
    assert len(appointments["upcoming"][0]["questions"]) >= 4
    assert len(appointments["upcoming"][0]["preparation"]) >= 3

    memories = client.get("/memory", headers=headers).json()
    assert any("Blood test" in m["fact"] for m in memories)

    # Home shows the decision waiting on her.
    home = client.get("/home", headers=headers).json()
    assert home["greeting_name"] == "Faith"
    assert len(home["pending_approvals"]) == 1
    assert home["next_appointment"] is not None
    assert home["today"]

    # Activity carries the whole run, grouped by day.
    activity = client.get("/activity", headers=headers).json()
    assert activity[0]["label"].startswith("Today")
    assert activity[0]["runs"][0]["id"] == run["id"]


def test_approving_the_share_records_the_decision(client, signed_up):
    headers = signed_up
    run = client.post("/agent/runs", headers=headers, json={"message": GOAL}).json()
    approval_id = run["approvals"][0]["id"]

    answered = client.post(
        f"/approvals/{approval_id}", headers=headers, json={"approve": True}
    ).json()
    assert answered["status"] == "approved"

    after = client.get(f"/agent/runs/{run['id']}", headers=headers).json()
    assert after["status"] == "complete"
    assert any(a["result_label"] == "Shared" for a in after["actions"])

    # The decision itself is remembered, so she is not asked the same thing twice.
    memories = client.get("/memory", headers=headers).json()
    assert any("Allowed sharing" in m["fact"] for m in memories)


def test_declining_shares_nothing(client, signed_up):
    headers = signed_up
    run = client.post("/agent/runs", headers=headers, json={"message": GOAL}).json()
    approval_id = run["approvals"][0]["id"]

    client.post(f"/approvals/{approval_id}", headers=headers, json={"approve": False})

    after = client.get(f"/agent/runs/{run['id']}", headers=headers).json()
    labels = [a["result_label"] for a in after["actions"]]
    assert "Declined" in labels
    assert "Shared" not in labels

    memories = client.get("/memory", headers=headers).json()
    assert any("Declined sharing" in m["fact"] for m in memories)


def test_an_approval_can_only_be_answered_once(client, signed_up):
    headers = signed_up
    run = client.post("/agent/runs", headers=headers, json={"message": GOAL}).json()
    approval_id = run["approvals"][0]["id"]

    assert client.post(
        f"/approvals/{approval_id}", headers=headers, json={"approve": True}
    ).status_code == 200
    assert client.post(
        f"/approvals/{approval_id}", headers=headers, json={"approve": False}
    ).status_code == 409


def test_a_red_flag_stops_all_task_automation(client, signed_up):
    headers = signed_up
    before = len(client.get("/tasks", headers=headers).json())

    run = client.post(
        "/agent/runs",
        headers=headers,
        json={
            "message": "I have had a bad headache since last night and my vision keeps "
            "going blurry. Can you add something to my tasks so I remember to mention "
            "it on Thursday?"
        },
    ).json()

    assert run["safety_band"] == "emergency"
    assert run["status"] == "escalated"
    # She asked for a task and did not get one. That is the point.
    assert client.get("/tasks", headers=headers).json() == [] or len(
        client.get("/tasks", headers=headers).json()
    ) == before
    assert not any(a["tool"] == "create_task" for a in run["actions"])
    assert "clinician" in run["reply"] or "clinic" in run["reply"]

    events = client.get("/safety-events", headers=headers).json()
    assert events[0]["band"] == "emergency"
    assert events[0]["automation_stopped"] is True


def test_a_cleared_message_is_still_recorded_as_screened(client, signed_up):
    headers = signed_up
    client.post("/agent/runs", headers=headers, json={"message": GOAL})
    events = client.get("/safety-events", headers=headers).json()
    assert events, "a screen that finds nothing should still be recorded"
    assert events[0]["band"] == "none"
    assert events[0]["automation_stopped"] is False


def test_the_agent_continues_from_what_it_already_knows(client, signed_up):
    headers = signed_up
    client.post("/agent/runs", headers=headers, json={"message": GOAL})

    # A second turn should read the stored context rather than asking again.
    second = client.post(
        "/agent/runs", headers=headers, json={"message": "What is still unfinished?"}
    ).json()
    context_action = next(a for a in second["actions"] if a["tool"] == "get_user_context")
    assert "weeks" in context_action["summary"]
    assert "Lagoon" in context_action["summary"]


def test_an_appointment_she_names_is_recorded_then_prepared_for(client, signed_up, db):
    """The blueprint's opening line states an appointment. It has to land.

    Before `create_appointment` existed the agent would prepare for a visit it
    had no record of, and quietly save nothing.
    """
    from sqlalchemy import func, select

    from app.models import Appointment

    headers = signed_up
    before = db.scalar(select(func.count()).select_from(Appointment))

    run = client.post(
        "/agent/runs",
        headers=headers,
        json={
            "message": "I have a growth scan next Tuesday. Please prepare questions for it "
            "and remind me the evening before."
        },
    ).json()

    tools = [a["tool"] for a in run["actions"]]
    assert "create_appointment" in tools
    assert tools.index("create_appointment") < tools.index("create_appointment_preparation")

    assert db.scalar(select(func.count()).select_from(Appointment)) == before + 1

    body = client.get("/appointments", headers=headers).json()
    scan = next(a for a in body["upcoming"] if a["title"] == "Scan")
    assert scan["title"] == "Scan"
    assert scan["questions"], "the new appointment should carry the prepared questions"
    # Place and clinician came from her profile rather than being asked for.
    assert scan["location"] == "Lagoon Antenatal Clinic"
    assert scan["clinician"] == "Midwife Grace Okonkwo"


def test_a_second_mention_does_not_duplicate_the_appointment(client, signed_up, db):
    from sqlalchemy import func, select

    from app.models import Appointment

    message = "I have a growth scan next Tuesday, please prepare questions"
    client.post("/agent/runs", headers=signed_up, json={"message": message})
    after_first = db.scalar(select(func.count()).select_from(Appointment))

    client.post("/agent/runs", headers=signed_up, json={"message": message})
    assert db.scalar(select(func.count()).select_from(Appointment)) == after_first


def test_the_visit_is_named_for_what_she_called_it(client, signed_up):
    """An antenatal appointment that also mentions a blood test is still an
    antenatal appointment. The errand does not rename the visit."""
    headers = signed_up
    client.post(
        "/agent/runs",
        headers=headers,
        json={
            "message": "I have an antenatal appointment next Tuesday and I need my blood "
            "test done before it."
        },
    )
    body = client.get("/appointments", headers=headers).json()
    titles = [a["title"] for a in body["upcoming"]]
    assert "Antenatal review" in titles
    assert "Blood test" not in titles
