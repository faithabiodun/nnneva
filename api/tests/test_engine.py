"""Engine selection, and the guarantee that a failed model attempt leaves no trace.

The dangerous failure is a silent one: a deployment that believes it is running
a model, quietly serving rules. These tests pin the three modes down.
"""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.agent import runner
from app.config import get_settings
from app.models import Task, ToolAction

GOAL = "Prepare questions for my appointment and get my blood test booked"


@pytest.fixture
def model_mode(monkeypatch):
    """Point the settings at a model without touching either provider SDK."""

    def apply(mode: str):
        monkeypatch.setenv("AGENT_ENGINE", mode)
        monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
        monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
        get_settings.cache_clear()
        return get_settings()

    yield apply
    get_settings.cache_clear()


def test_auto_falls_back_when_the_model_cannot_be_reached(
    client, signed_up, model_mode, monkeypatch
):
    model_mode("auto")
    monkeypatch.setattr(
        runner, "_run_model",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("no credentials")),
    )

    run = client.post("/agent/runs", headers=signed_up, json={"message": GOAL}).json()
    assert run["engine"] == "scripted"
    # The work still happened — a fallback is not a failure for the user.
    assert any(a["tool"] == "create_task" for a in run["actions"])


def test_model_mode_reports_the_failure_instead_of_hiding_it(
    client, signed_up, model_mode, monkeypatch
):
    model_mode("model")
    monkeypatch.setattr(
        runner, "_run_model",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("token invalid")),
    )

    r = client.post("/agent/runs", headers=signed_up, json={"message": GOAL})
    assert r.status_code == 502
    assert "could not be reached" in r.json()["detail"]


def test_scripted_mode_never_calls_the_model(client, signed_up, model_mode, monkeypatch):
    model_mode("scripted")
    called = []
    monkeypatch.setattr(runner, "_run_model", lambda *a, **k: called.append(1) or "hi")

    run = client.post("/agent/runs", headers=signed_up, json={"message": GOAL}).json()
    assert called == []
    assert run["engine"] == "scripted"


def test_a_half_finished_model_run_is_rolled_back_before_the_fallback(
    client, signed_up, db, model_mode, monkeypatch
):
    """A model that does work and then dies must not leave that work behind.

    Without the savepoint the user would see every task twice: once from the
    abandoned attempt and once from the fallback.
    """
    model_mode("auto")

    def half_a_run(box, message, settings, screening):
        from app.agent import tools as T

        T.get_user_context(box)
        T.create_task(box, "Ghost task from the abandoned attempt")
        raise RuntimeError("model died mid-run")

    monkeypatch.setattr(runner, "_run_model", half_a_run)

    run = client.post("/agent/runs", headers=signed_up, json={"message": GOAL}).json()

    assert run["engine"] == "scripted"
    titles = [t["title"] for t in client.get("/tasks", headers=signed_up).json()]
    assert "Ghost task from the abandoned attempt" not in titles

    # And the recorded actions are only the fallback's, numbered from zero.
    positions = db.scalars(
        select(ToolAction.position).where(ToolAction.run_id == run["id"]).order_by(ToolAction.position)
    ).all()
    assert positions == list(range(len(positions)))
    assert len(run["actions"]) == len(positions)


def test_health_distinguishes_configuration_from_reachability(client, model_mode):
    model_mode("auto")
    body = client.get("/health").json()
    assert body["mode"] == "auto"
    assert body["will_try_bedrock"] is True
    assert body["falls_back_to_scripted"] is True

    model_mode("model")
    body = client.get("/health").json()
    assert body["falls_back_to_scripted"] is False


def test_no_duplicate_work_across_two_engines(client, signed_up, db, model_mode, monkeypatch):
    model_mode("auto")

    def dies_immediately(box, message, settings, screening):
        raise RuntimeError("nope")

    monkeypatch.setattr(runner, "_run_model", dies_immediately)
    client.post("/agent/runs", headers=signed_up, json={"message": GOAL})

    titles = db.scalars(select(Task.title)).all()
    assert len(titles) == len(set(titles)), "the same task was created twice"
    assert db.scalar(select(func.count()).select_from(Task)) > 0
