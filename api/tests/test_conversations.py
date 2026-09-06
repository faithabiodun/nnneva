"""Threads, follow-ups, and not turning questions into work."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from app.agent.scripted import looks_like_a_question
from app.models import Conversation, Goal, Task


def test_a_message_without_a_thread_starts_one(client, signed_up):
    r = client.post("/agent/runs", headers=signed_up,
                    json={"message": "Remind me to book my scan"})
    assert r.status_code == 201

    threads = client.get("/agent/conversations", headers=signed_up).json()
    assert len(threads) == 1
    assert threads[0]["message_count"] == 1
    assert threads[0]["title"].startswith("Remind me")


def test_a_second_message_continues_the_same_thread(client, signed_up):
    first = client.post("/agent/runs", headers=signed_up,
                        json={"message": "Remind me to book my scan"}).json()
    threads = client.get("/agent/conversations", headers=signed_up).json()
    cid = threads[0]["id"]

    client.post("/agent/runs", headers=signed_up,
                json={"message": "Also remind me to take my iron", "conversation_id": cid})

    threads = client.get("/agent/conversations", headers=signed_up).json()
    assert len(threads) == 1, "a continued thread must not create a second one"
    assert threads[0]["message_count"] == 2

    detail = client.get(f"/agent/conversations/{cid}", headers=signed_up).json()
    assert [r["id"] for r in detail["runs"]][0] == first["id"], "oldest first"
    assert len(detail["runs"]) == 2


def test_omitting_the_thread_id_starts_a_new_one(client, signed_up):
    """Never guess. An unmarked message is a new subject, not a continuation."""
    client.post("/agent/runs", headers=signed_up, json={"message": "Remind me to book my scan"})
    client.post("/agent/runs", headers=signed_up, json={"message": "Remind me about my iron"})
    assert len(client.get("/agent/conversations", headers=signed_up).json()) == 2


def test_a_thread_belonging_to_someone_else_is_not_readable(client, signed_up):
    client.post("/agent/runs", headers=signed_up, json={"message": "Remind me to book my scan"})
    cid = client.get("/agent/conversations", headers=signed_up).json()[0]["id"]

    other = client.post("/auth/signup", json={
        "full_name": "Someone Else", "email": "other@example.com",
        "password": "hunter2hunter2"}).json()
    theirs = {"Authorization": f"Bearer {other['access_token']}"}

    assert client.get(f"/agent/conversations/{cid}", headers=theirs).status_code == 404
    assert client.post("/agent/runs", headers=theirs,
                       json={"message": "hello", "conversation_id": cid}).status_code == 404


def test_deleting_a_thread_takes_its_runs_with_it(client, signed_up, db):
    client.post("/agent/runs", headers=signed_up, json={"message": "Remind me to book my scan"})
    cid = client.get("/agent/conversations", headers=signed_up).json()[0]["id"]

    assert client.delete(f"/agent/conversations/{cid}", headers=signed_up).status_code == 204
    assert client.get("/agent/conversations", headers=signed_up).json() == []
    assert db.get(Conversation, cid) is None


# ---- Questions are answered, not actioned ---------------------------------


@pytest.mark.parametrize("message", [
    "What is a glucose test?",
    "How many weeks am I?",
    "Should I be worried about swelling?",
    "is it normal to feel tired",
    "Tell me about the anomaly scan",
])
def test_questions_are_recognised(message):
    assert looks_like_a_question(message) is True


@pytest.mark.parametrize("message", [
    "Remind me to take my iron tablets",
    "Book my blood test",
    "I have an antenatal appointment next Tuesday",
    # A request wearing a question mark is still a request.
    "Can you remind me to take my iron?",
    "Could you book my scan?",
])
def test_instructions_are_not_mistaken_for_questions(message):
    assert looks_like_a_question(message) is False


def test_asking_a_question_creates_no_tasks(client, signed_up, db):
    before = db.scalar(select(func.count()).select_from(Task))

    r = client.post("/agent/runs", headers=signed_up,
                    json={"message": "What is a glucose test?"})

    assert r.status_code == 201
    assert r.json()["reply"], "a question deserves an answer"
    assert db.scalar(select(func.count()).select_from(Task)) == before, (
        "asking a question must not leave her with work to delete"
    )


def test_asking_a_question_opens_no_goal(client, signed_up, db):
    before = db.scalar(select(func.count()).select_from(Goal))
    client.post("/agent/runs", headers=signed_up, json={"message": "How many weeks am I?"})
    assert db.scalar(select(func.count()).select_from(Goal)) == before


def test_an_instruction_still_does_the_work(client, signed_up, db):
    """The guard must not have made the agent passive."""
    before = db.scalar(select(func.count()).select_from(Task))
    day = (date.today() + timedelta(days=5)).strftime("%A")

    r = client.post("/agent/runs", headers=signed_up,
                    json={"message": f"I have a growth scan next {day}, please prepare for it"})

    assert r.status_code == 201
    assert db.scalar(select(func.count()).select_from(Task)) > before
