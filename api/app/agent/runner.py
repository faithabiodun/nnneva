"""Running one agent turn.

`run_agent` owns the whole lifecycle: create the AgentRun, screen the message
before anything else, plan and act, guard the output, then close the run and
write the plan steps the UI reads back.

Two engines sit behind one interface:

  bedrock  — a real Strands Agent over a Bedrock model, with the tool set from
             tools.py and hooks enforcing the safety spine at the tool boundary.
  scripted — the deterministic planner in scripted.py.

Which one ran is stored on the run and returned by the API, so a reader always
knows whether a model was involved.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.agent import scripted
from app.agent import tools as T
from app.agent.prompt import SYSTEM_PROMPT
from app.agent.safety import Screening, screen, scrub
from app.agent.scripted import looks_like_a_question
from app.config import get_settings
from app.models import (
    ActionResult,
    AgentRun,
    Conversation,
    Goal,
    GoalStatus,
    Plan,
    RunStatus,
    TaskOwner,
    User,
    utcnow,
)

log = logging.getLogger("nnneva.agent")


@dataclass
class RunOutcome:
    run: AgentRun
    reply: str
    screening: Screening


def run_agent(
    db: Session,
    user: User,
    message: str,
    goal_title: str | None = None,
    conversation: Conversation | None = None,
) -> RunOutcome:
    """Take one message from the user and do the work it implies."""
    started = time.perf_counter()

    # The screen runs before the run row is even complete, and before any model
    # sees the text. Nothing downstream can lower the band it returns.
    screening = screen(message)

    run = AgentRun(
        user_id=user.id,
        conversation_id=conversation.id if conversation else None,
        prompt=message,
        status=RunStatus.running,
        safety_band=screening.band,
        engine="scripted",
    )
    db.add(run)
    db.flush()

    if conversation is not None:
        conversation.last_message_at = datetime.now(timezone.utc)

    goal = None
    # A question creates no goal. A goal is a piece of work; asking what a
    # glucose test is should not open one, or the plan list fills with entries
    # that were never work.
    if not screening.stops_automation and not looks_like_a_question(message):
        goal = Goal(
            user_id=user.id,
            title=(goal_title or _goal_title(message)),
            detail=message,
            status=GoalStatus.active,
            created_by=TaskOwner.agent,
        )
        db.add(goal)
        db.flush()
        run.goal_id = goal.id

    box = T.Toolbox(db=db, user=user, run=run, goal=goal)

    history = _history_for(conversation, upto=run.id)

    settings = get_settings()
    reply = ""
    if settings.use_bedrock:
        # The attempt runs inside a savepoint. A model that called three tools
        # and then died would otherwise leave that work committed and have the
        # fallback do it again, so the user would see everything twice.
        savepoint = db.begin_nested()
        try:
            reply = _run_bedrock(box, message, settings, screening, history)
            run.engine = "bedrock"
            savepoint.commit()
        except Exception as exc:  # noqa: BLE001 — every Bedrock failure lands here
            savepoint.rollback()
            if settings.bedrock_required:
                # Explicitly configured for Bedrock: say so rather than quietly
                # serving rules that look like a model.
                log.exception("Bedrock run failed and AGENT_ENGINE=bedrock")
                raise BedrockUnavailable(str(exc)) from exc
            log.warning("Bedrock unavailable (%s); using the scripted planner", exc)
            _reset_after_failed_engine(box)
            reply = scripted.run(box, message, screening)
    else:
        reply = scripted.run(box, message, screening)

    # Layer 3. Applies to both engines: the scripted planner's text is fixed,
    # but running it through the same guard means the guarantee is about the
    # product rather than about one code path.
    guarded = scrub(reply)
    if guarded.blocked:
        box.record(
            "output_guardrail",
            f"Blocked the drafted reply — {guarded.reason}",
            result=ActionResult.blocked,
            result_label="Blocked",
            detail="The reply was replaced before it reached you.",
        )
    run.reply = guarded.text

    if screening.stops_automation:
        run.status = RunStatus.escalated
    elif any(a.status.value == "pending" for a in box.approvals):
        run.status = RunStatus.awaiting_approval
    else:
        run.status = RunStatus.complete

    run.duration_ms = (time.perf_counter() - started) * 1000
    run.finished_at = utcnow()

    _write_plan_steps(db, run, box, goal)
    db.commit()

    return RunOutcome(run=run, reply=run.reply, screening=screening)


class BedrockUnavailable(RuntimeError):
    """Raised when AGENT_ENGINE=bedrock and the model could not be reached."""


def _reset_after_failed_engine(box: T.Toolbox) -> None:
    """Forget the abandoned attempt's actions.

    The savepoint has already rolled the rows back; this clears the in-memory
    mirror so the fallback's positions start at zero.
    """
    box.actions.clear()
    box.approvals.clear()


def _goal_title(message: str) -> str:
    """A short title for the goal, taken from the message's first clause."""
    first = message.strip().split(".")[0].strip()
    if len(first) > 90:
        first = first[:87].rstrip() + "…"
    return first or "Untitled goal"


def _write_plan_steps(db: Session, run: AgentRun, box: T.Toolbox, goal: Goal | None) -> None:
    """Turn the tool calls into the plan the agent screen renders.

    The plan is derived from what actually happened rather than from what the
    model said it would do, so the two can never disagree.
    """
    if goal is None:
        return
    state_for = {
        ActionResult.ok: "done",
        ActionResult.blocked: "flag",
        ActionResult.awaiting_approval: "approval",
        ActionResult.failed: "stopped",
    }
    for index, action in enumerate(box.actions):
        db.add(
            Plan(
                goal_id=goal.id,
                run_id=run.id,
                step_index=index,
                title=action.summary,
                detail=action.detail or action.result_label,
                state=state_for[action.result],
            )
        )


# ---------------------------------------------------------------------------
# The Bedrock path
# ---------------------------------------------------------------------------


def _run_bedrock(
    box: T.Toolbox,
    message: str,
    settings,
    screening: Screening,
    history: list[dict] | None = None,
) -> str:
    """Run a real Strands agent over Bedrock.

    Imported lazily so the service starts, and the scripted path works, without
    boto3 credentials or a network round trip at import time.
    """
    from strands import Agent, ToolContext, tool
    from strands.hooks import BeforeToolCallEvent, HookRegistry
    from strands.models import BedrockModel

    def bound(name: str):
        """Wrap a tool function so it receives the run's Toolbox."""

        def call(**kwargs):
            return T.TOOL_FUNCTIONS[name](box, **kwargs)

        return call

    @tool(name="get_user_context")
    def _context() -> dict:
        """Read everything already known about the user: due date, stage, clinic,
        clinician, saved memories, open tasks and upcoming appointments."""
        return bound("get_user_context")()

    @tool(name="safety_check")
    def _safety(message: str) -> dict:
        """Screen a message for obstetric red flags. Returns a band and whether
        normal task automation must stop."""
        return bound("safety_check")(message=message)

    @tool(name="create_task")
    def _create_task(title: str, detail: str = "", due_date: str = "", status: str = "To do") -> dict:
        """Create a task. due_date is ISO-8601 (YYYY-MM-DD)."""
        return bound("create_task")(
            title=title, detail=detail, due_date=due_date or None, status=status
        )

    @tool(name="update_task")
    def _update_task(task_id: str, status: str = "", due_date: str = "", title: str = "") -> dict:
        """Change an existing task's status, due date or title."""
        return bound("update_task")(
            task_id=task_id, status=status or None, due_date=due_date or None, title=title or None
        )

    @tool(name="schedule_reminder")
    def _reminder(reason: str, fire_at: str, task_id: str = "") -> dict:
        """Schedule a reminder. fire_at is ISO-8601."""
        return bound("schedule_reminder")(
            reason=reason, fire_at=fire_at, task_id=task_id or None
        )

    @tool(name="create_appointment")
    def _appointment(
        starts_at: str,
        title: str = "Antenatal review",
        location: str = "",
        clinician: str = "",
    ) -> dict:
        """Record an appointment the user has told you about. starts_at is
        ISO-8601. Place and clinician default to her stored profile."""
        return bound("create_appointment")(
            starts_at=starts_at,
            title=title,
            location=location or None,
            clinician=clinician or None,
        )

    @tool(name="create_appointment_preparation")
    def _prep(
        questions: list[str] | None = None,
        preparation: list[str] | None = None,
        appointment_id: str = "",
    ) -> dict:
        """Save questions and preparation items against the next appointment."""
        return bound("create_appointment_preparation")(
            questions=questions, preparation=preparation, appointment_id=appointment_id or None
        )

    @tool(name="save_memory")
    def _memory(fact: str, kind: str = "Pregnancy context") -> dict:
        """Remember a fact so the user never has to repeat it. kind is one of
        'Pregnancy context', 'Preferences' or 'Decisions'."""
        return bound("save_memory")(fact=fact, kind=kind)

    @tool(name="share_with_contact")
    def _share(what: str, why: str = "", task_id: str = "") -> dict:
        """Ask the user whether something may be sent to her trusted contact.
        This never sends: it raises an approval and stops."""
        return bound("share_with_contact")(what=what, why=why or "", task_id=task_id or None)

    class SafetySpine:
        """Enforces the guardrails at the tool boundary rather than in the prompt.

        Once the screen has stopped automation, the only tools that still run
        are the two that read or record. A model that decides to create tasks
        anyway is cancelled here, not asked nicely in a system prompt.
        """

        ALLOWED_WHEN_STOPPED = {"get_user_context", "safety_check"}

        def __init__(self, screening: Screening, toolbox: T.Toolbox) -> None:
            self.screening = screening
            self.box = toolbox

        def register_hooks(self, registry: HookRegistry, **_: object) -> None:
            registry.add_callback(BeforeToolCallEvent, self.before_tool)

        def before_tool(self, event: BeforeToolCallEvent) -> None:
            name = event.tool_use.get("name", "")
            if self.screening.stops_automation and name not in self.ALLOWED_WHEN_STOPPED:
                self.box.record(
                    name,
                    f"Blocked “{name}” — automation is stopped for this message",
                    result=ActionResult.blocked,
                    result_label="Blocked",
                    detail=self.screening.guidance,
                )
                event.cancel_tool = (
                    "Automation is stopped for this message because a red flag was "
                    "detected. Do not create or change anything. Tell the user what "
                    "to do and how soon, then stop."
                )

    model = BedrockModel(
        model_id=settings.bedrock_model_id,
        region_name=settings.aws_region,
        max_tokens=2048,
        temperature=0.2,
    )
    agent = Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        # The thread so far. Without it every message is the first one, and
        # "book it for then" has nothing to point at.
        messages=history or [],
        tools=[
            _context, _safety, _create_task, _update_task,
            _reminder, _appointment, _prep, _memory, _share,
        ],
        hooks=[SafetySpine(screening, box)],
        callback_handler=None,  # no stdout streaming; the API returns the result
    )

    result = agent(message)
    return _text_of(result)


def _history_for(conversation: Conversation | None, upto: str) -> list[dict]:
    """Earlier turns of this thread, in the shape Strands expects.

    Capped at the last twelve exchanges. A pregnancy conversation can run for
    months, and sending all of it would cost more with every message while
    adding nothing — what matters for "book it then" is the recent past.

    The current run is excluded: it is already in the database by the time this
    is called, and passing it as history as well would show the model its own
    question twice.
    """
    if conversation is None:
        return []
    turns: list[dict] = []
    for past in conversation.runs:
        if past.id == upto or not past.reply:
            continue
        turns.append({"role": "user", "content": [{"text": past.prompt}]})
        turns.append({"role": "assistant", "content": [{"text": past.reply}]})
    return turns[-24:]


def _text_of(result) -> str:
    """Pull the assistant's text out of a Strands AgentResult."""
    message = getattr(result, "message", None) or {}
    blocks = message.get("content", []) if isinstance(message, dict) else []
    parts = [b["text"] for b in blocks if isinstance(b, dict) and "text" in b]
    return "\n".join(p.strip() for p in parts if p.strip()) or str(result)
