"""The agent's tool set (§05).

Each tool is a plain function taking a `Toolbox` plus its arguments, so it can
be called directly by the deterministic planner and tested without a model. The
Bedrock path in `runner.py` wraps these same functions in `@tool` — there is one
implementation, not two.

Every call goes through `Toolbox.record`, which writes a ToolAction row. That
is why there is no `log_agent_action` tool: logging that depends on the model
remembering to log is logging that will sometimes be missing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agent.safety import screen
from app.models import (
    ActionResult,
    AgentRun,
    Appointment,
    AppointmentQuestion,
    Approval,
    Goal,
    Memory,
    MemoryKind,
    PreparationItem,
    Reminder,
    RunStatus,
    SafetyBand,
    SafetyEvent,
    Task,
    TaskOwner,
    TaskStatus,
    ToolAction,
    TrustedContact,
    User,
    utcnow,
)

# Tools that would send something outside the user's account. These never run
# on the agent's own authority — they raise an Approval and wait (§02).
CONSEQUENTIAL = {"share_with_contact"}


@dataclass
class Toolbox:
    """Per-run state the tools act on.

    Held in `invocation_state` on the Bedrock path and passed directly on the
    scripted path, so a tool never reaches for a global session.
    """

    db: Session
    user: User
    run: AgentRun
    goal: Goal | None = None
    actions: list[ToolAction] = field(default_factory=list)
    approvals: list[Approval] = field(default_factory=list)

    def record(
        self,
        tool: str,
        summary: str,
        result: ActionResult = ActionResult.ok,
        result_label: str = "Done",
        detail: str = "",
    ) -> ToolAction:
        action = ToolAction(
            run_id=self.run.id,
            position=len(self.actions),
            tool=tool,
            summary=summary,
            result=result,
            result_label=result_label,
            detail=detail,
        )
        self.db.add(action)
        self.actions.append(action)
        return action


# ---------------------------------------------------------------------------
# 1. get_user_context
# ---------------------------------------------------------------------------


def get_user_context(box: Toolbox) -> dict[str, Any]:
    """Everything already known about the user, so she is never asked twice."""
    profile = box.user.profile
    memories = box.db.scalars(
        select(Memory)
        .where(Memory.user_id == box.user.id, Memory.forgotten_at.is_(None))
        .order_by(Memory.created_at.desc())
        .limit(30)
    ).all()
    open_tasks = box.db.scalars(
        select(Task).where(
            Task.user_id == box.user.id,
            Task.status.notin_([TaskStatus.complete, TaskStatus.cancelled]),
        )
    ).all()
    upcoming = box.db.scalars(
        select(Appointment)
        .where(Appointment.user_id == box.user.id, Appointment.starts_at >= utcnow())
        .order_by(Appointment.starts_at)
        .limit(3)
    ).all()
    contact = box.db.scalars(
        select(TrustedContact).where(TrustedContact.user_id == box.user.id)
    ).first()

    context = {
        "name": box.user.full_name,
        "due_date": profile.due_date.isoformat() if profile else None,
        "gestational_week": profile.gestational_week if profile else None,
        "trimester": profile.trimester if profile else None,
        "care_location": profile.care_location if profile else None,
        "clinician": profile.clinician if profile else None,
        "help_areas": [a for a in (profile.help_areas.splitlines() if profile else []) if a],
        "memories": [{"kind": m.kind.value, "fact": m.fact} for m in memories],
        "open_tasks": [{"id": t.id, "title": t.title, "status": t.status.value} for t in open_tasks],
        "next_appointments": [
            {
                "id": a.id,
                "title": a.title,
                "starts_at": a.starts_at.isoformat(),
                "location": a.location,
                "clinician": a.clinician,
            }
            for a in upcoming
        ],
        "trusted_contact": (
            {"name": contact.name, "relationship": contact.relationship_label} if contact else None
        ),
    }

    summary = "Loaded your pregnancy profile"
    if profile:
        summary = f"Loaded your context — {profile.gestational_week} weeks, {profile.care_location}"
    box.record("get_user_context", summary, result_label="Read")
    return context


# ---------------------------------------------------------------------------
# 2. safety_check
# ---------------------------------------------------------------------------


def safety_check(box: Toolbox, message: str) -> dict[str, Any]:
    """Screen a message for red flags and record the result either way."""
    result = screen(message)
    event = SafetyEvent(
        user_id=box.user.id,
        run_id=box.run.id,
        band=result.band,
        trigger=result.trigger,
        excerpt=result.excerpt,
        guidance=result.guidance,
        automation_stopped=result.stops_automation,
    )
    box.db.add(event)
    box.run.safety_band = result.band

    if result.stops_automation:
        box.record(
            "safety_check",
            f"Screened the request — {result.trigger.lower()} matched an escalation rule",
            result=ActionResult.blocked,
            result_label="Escalated",
            detail=result.guidance,
        )
    else:
        box.record(
            "safety_check",
            "Screened the request for red flags",
            result_label="Noted" if result.band is SafetyBand.routine else "No flags",
        )

    return {
        "band": result.band.value,
        "trigger": result.trigger,
        "guidance": result.guidance,
        "stops_automation": result.stops_automation,
    }


# ---------------------------------------------------------------------------
# 3. create_task
# ---------------------------------------------------------------------------


def create_task(
    box: Toolbox,
    title: str,
    detail: str = "",
    due_date: str | None = None,
    status: str = "To do",
) -> dict[str, Any]:
    """Create a task under the run's goal."""
    task = Task(
        user_id=box.user.id,
        goal_id=box.goal.id if box.goal else None,
        title=title.strip(),
        detail=detail.strip(),
        due_date=_as_date(due_date),
        status=_as_status(status),
        owner=TaskOwner.user,
        created_by=TaskOwner.agent,
    )
    box.db.add(task)
    box.db.flush()
    box.record("create_task", f"Created the task “{task.title}”", result_label="Created")
    return {"id": task.id, "title": task.title, "status": task.status.value}


# ---------------------------------------------------------------------------
# 4. update_task
# ---------------------------------------------------------------------------


def update_task(
    box: Toolbox,
    task_id: str,
    status: str | None = None,
    due_date: str | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    """Change a task the user already has."""
    task = box.db.get(Task, task_id)
    if task is None or task.user_id != box.user.id:
        box.record(
            "update_task",
            "Tried to update a task that does not exist",
            result=ActionResult.failed,
            result_label="Not found",
        )
        return {"error": "task not found"}

    changed = []
    if title:
        task.title = title.strip()
        changed.append("title")
    if status:
        task.status = _as_status(status)
        task.completed_at = utcnow() if task.status is TaskStatus.complete else None
        changed.append(f"status to {task.status.value}")
    if due_date:
        task.due_date = _as_date(due_date)
        changed.append("due date")

    box.record(
        "update_task",
        f"Updated “{task.title}” — {', '.join(changed) or 'no change'}",
        result_label="Updated",
    )
    return {"id": task.id, "title": task.title, "status": task.status.value}


# ---------------------------------------------------------------------------
# 5. schedule_reminder
# ---------------------------------------------------------------------------


def schedule_reminder(
    box: Toolbox, reason: str, fire_at: str, task_id: str | None = None
) -> dict[str, Any]:
    """Schedule a reminder. `fire_at` is ISO-8601; a bare date means 18:00."""
    when = _as_datetime(fire_at)
    if when is None:
        box.record(
            "schedule_reminder",
            f"Could not read the reminder time “{fire_at}”",
            result=ActionResult.failed,
            result_label="Failed",
        )
        return {"error": "unreadable time"}

    reminder = Reminder(
        user_id=box.user.id,
        task_id=task_id,
        fire_at=when,
        reason=reason.strip(),
    )
    box.db.add(reminder)
    box.db.flush()
    box.record(
        "schedule_reminder",
        f"Scheduled a reminder — {reason.strip()}",
        result_label="Scheduled",
        detail=when.strftime("%a %d %b, %H:%M"),
    )
    return {"id": reminder.id, "fire_at": when.isoformat()}


# ---------------------------------------------------------------------------
# 6. create_appointment
# ---------------------------------------------------------------------------


def create_appointment(
    box: Toolbox,
    starts_at: str,
    title: str = "Antenatal review",
    location: str | None = None,
    clinician: str | None = None,
) -> dict[str, Any]:
    """Record an appointment the user has told Nnneva about.

    Without this the agent could prepare for a visit but never learn one exists,
    which breaks the blueprint's own opening line — "I have an antenatal
    appointment next Thursday" has to leave something behind.

    Place and clinician default to the stored profile so she is not asked for
    what Nnneva already knows (§02).
    """
    when = _as_datetime(starts_at)
    if when is None:
        box.record(
            "create_appointment",
            f"Could not read the appointment time “{starts_at}”",
            result=ActionResult.failed,
            result_label="Failed",
        )
        return {"error": "unreadable time"}

    profile = box.user.profile
    appointment = Appointment(
        user_id=box.user.id,
        title=title.strip() or "Antenatal review",
        starts_at=when,
        location=location or (profile.care_location if profile else None),
        clinician=clinician or (profile.clinician if profile else None),
    )
    box.db.add(appointment)
    box.db.flush()

    box.record(
        "create_appointment",
        f"Added {appointment.title} on {when:%A %-d %B} at {when:%H:%M}",
        result_label="Created",
        detail=appointment.location or "",
    )
    return {
        "id": appointment.id,
        "title": appointment.title,
        "starts_at": when.isoformat(),
    }


# ---------------------------------------------------------------------------
# 7. create_appointment_preparation
# ---------------------------------------------------------------------------


def create_appointment_preparation(
    box: Toolbox,
    appointment_id: str | None = None,
    questions: list[str] | None = None,
    preparation: list[str] | None = None,
) -> dict[str, Any]:
    """Attach questions and preparation items to an appointment.

    With no id, the next upcoming appointment is used — the user says "for
    Thursday", not an identifier.
    """
    appointment = None
    if appointment_id:
        appointment = box.db.get(Appointment, appointment_id)
    if appointment is None:
        appointment = box.db.scalars(
            select(Appointment)
            .where(Appointment.user_id == box.user.id, Appointment.starts_at >= utcnow())
            .order_by(Appointment.starts_at)
        ).first()
    if appointment is None or appointment.user_id != box.user.id:
        box.record(
            "create_appointment_preparation",
            "No upcoming appointment to prepare for",
            result=ActionResult.failed,
            result_label="Nothing to do",
        )
        return {"error": "no appointment"}

    start = len(appointment.questions)
    for i, text in enumerate(questions or []):
        box.db.add(
            AppointmentQuestion(
                appointment_id=appointment.id,
                text=text.strip(),
                source="Nnneva",
                position=start + i,
            )
        )
    start_prep = len(appointment.preparation)
    for i, text in enumerate(preparation or []):
        box.db.add(
            PreparationItem(
                appointment_id=appointment.id, title=text.strip(), position=start_prep + i
            )
        )
    box.db.flush()

    parts = []
    if questions:
        parts.append(f"{len(questions)} question{'s' if len(questions) != 1 else ''}")
    if preparation:
        parts.append(f"{len(preparation)} preparation item{'s' if len(preparation) != 1 else ''}")
    who = appointment.clinician or appointment.title
    box.record(
        "create_appointment_preparation",
        f"Saved {' and '.join(parts) or 'nothing'} for {who}",
        result_label="Prepared",
    )
    return {
        "appointment_id": appointment.id,
        "questions": len(questions or []),
        "preparation": len(preparation or []),
    }


# ---------------------------------------------------------------------------
# 8. save_memory
# ---------------------------------------------------------------------------


def save_memory(box: Toolbox, fact: str, kind: str = "Pregnancy context") -> dict[str, Any]:
    """Remember something so the user does not have to repeat it."""
    memory = Memory(
        user_id=box.user.id,
        kind=_as_memory_kind(kind),
        fact=fact.strip(),
        source=f"From your message, {date.today():%-d %B}",
    )
    box.db.add(memory)
    box.db.flush()
    box.record("save_memory", f"Remembered: {memory.fact}", result_label="Saved")
    return {"id": memory.id, "fact": memory.fact}


# ---------------------------------------------------------------------------
# 9. share_with_contact — the confirmation gate
# ---------------------------------------------------------------------------


def share_with_contact(
    box: Toolbox, what: str, why: str = "", task_id: str | None = None
) -> dict[str, Any]:
    """Ask to send something to the trusted contact.

    This never sends. It records an Approval and stops; the send happens only
    after the user answers, in app/routers/approvals.py. Structurally, the agent
    has no path to share health information on its own.
    """
    contact = box.db.scalars(
        select(TrustedContact).where(TrustedContact.user_id == box.user.id)
    ).first()
    if contact is None:
        box.record(
            "share_with_contact",
            "No trusted contact is set up, so nothing was shared",
            result=ActionResult.failed,
            result_label="Nothing to do",
        )
        return {"error": "no trusted contact"}

    approval = Approval(
        user_id=box.user.id,
        run_id=box.run.id,
        task_id=task_id,
        action="share_with_contact",
        question=f"Send {what} to {contact.name} as well? "
        "This shares a health-related task outside your account.",
        why=why or "Sends health information outside your account, so it waits for you",
    )
    box.db.add(approval)
    box.db.flush()
    box.approvals.append(approval)

    if task_id:
        task = box.db.get(Task, task_id)
        if task is not None and task.user_id == box.user.id:
            task.status = TaskStatus.awaiting_approval

    box.run.status = RunStatus.awaiting_approval
    box.record(
        "share_with_contact",
        f"Asked to share {what} with {contact.name}",
        result=ActionResult.awaiting_approval,
        result_label="Waiting for you",
        detail=approval.question,
    )
    return {"approval_id": approval.id, "status": "awaiting_approval"}


TOOL_FUNCTIONS = {
    "get_user_context": get_user_context,
    "safety_check": safety_check,
    "create_task": create_task,
    "update_task": update_task,
    "schedule_reminder": schedule_reminder,
    "create_appointment": create_appointment,
    "create_appointment_preparation": create_appointment_preparation,
    "save_memory": save_memory,
    "share_with_contact": share_with_contact,
}


# ---------------------------------------------------------------------------
# Coercion helpers
#
# A language model will hand back "Wed 9 Sep", "tomorrow", or a real ISO date.
# Everything below fails to None rather than raising, so one odd argument costs
# a field rather than the whole run.
# ---------------------------------------------------------------------------


def _as_date(value: str | None) -> date | None:
    if not value:
        return None
    text = value.strip().lower()
    today = date.today()
    if text in {"today", "now"}:
        return today
    if text == "tomorrow":
        return today + timedelta(days=1)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d %b %Y", "%d %B %Y", "%a %d %b", "%d %b"):
        try:
            parsed = datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
        # Formats without a year parse as 1900; assume the coming twelve months.
        if parsed.year == 1900:
            parsed = parsed.replace(year=today.year)
            if parsed < today - timedelta(days=30):
                parsed = parsed.replace(year=today.year + 1)
        return parsed
    return None


def _as_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    day = _as_date(value)
    if day is None:
        return None
    # A bare date means the evening, matching the default contact window.
    return datetime.combine(day, time(18, 0), tzinfo=timezone.utc)


def _as_status(value: str | None) -> TaskStatus:
    if not value:
        return TaskStatus.todo
    text = value.strip().lower()
    for status in TaskStatus:
        if text in {status.value.lower(), status.name.lower()}:
            return status
    return TaskStatus.todo


def _as_memory_kind(value: str | None) -> MemoryKind:
    if not value:
        return MemoryKind.context
    text = value.strip().lower()
    for kind in MemoryKind:
        if text in {kind.value.lower(), kind.name.lower()}:
            return kind
    return MemoryKind.context
