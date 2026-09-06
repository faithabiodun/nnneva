"""The data models from §04 of the blueprint.

User → PregnancyProfile → Goals → Plans → Tasks
                        ↘ Appointments → Questions / Preparation
                        ↘ Reminders
                        ↘ Memories
                        ↘ AgentRuns → ToolActions
                        ↘ SafetyEvents

Everything the agent does is written here, because §02 requires that every
important action be visible in an activity history the user can read.
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Enumerations
#
# These are the vocabularies the UI reads, so they are stored as names rather
# than integers — a row should be legible in psql without a lookup table.
# ---------------------------------------------------------------------------


class TaskStatus(str, enum.Enum):
    todo = "To do"
    in_progress = "In progress"
    scheduled = "Scheduled"
    awaiting_approval = "Awaiting approval"
    complete = "Complete"
    cancelled = "Cancelled"


class TaskOwner(str, enum.Enum):
    user = "user"
    agent = "agent"


class GoalStatus(str, enum.Enum):
    active = "active"
    complete = "complete"
    abandoned = "abandoned"


class RunStatus(str, enum.Enum):
    running = "running"
    complete = "complete"
    awaiting_approval = "awaiting_approval"
    escalated = "escalated"
    failed = "failed"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    declined = "declined"


class SafetyBand(str, enum.Enum):
    """How urgently a message needs a human clinician.

    `none` still records the check: proving that a message was screened and
    cleared matters as much as catching the one that was not.
    """

    none = "none"
    routine = "routine"
    same_day = "same_day"
    emergency = "emergency"


class MemoryKind(str, enum.Enum):
    context = "Pregnancy context"
    preference = "Preferences"
    decision = "Decisions"


class ActionResult(str, enum.Enum):
    ok = "ok"
    blocked = "blocked"
    awaiting_approval = "awaiting_approval"
    failed = "failed"


# ---------------------------------------------------------------------------
# Identity and context
# ---------------------------------------------------------------------------


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Nullable: an account created through Google sign-in has no password.
    # app/security.py refuses to verify against a missing hash, so such a row
    # cannot be logged into with the password form.
    password_hash: Mapped[str | None] = mapped_column(String(255), default=None)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40), default=None)
    # One of a fixed set of drawn avatars, or None for the initial. Stored as a
    # key rather than an image: no uploads, nothing to moderate, and it renders
    # the same everywhere without a round trip.
    avatar: Mapped[str | None] = mapped_column(String(20), default=None)
    # Notification and retention preferences, kept as plain columns rather than
    # a JSON blob so they can be queried when reminders are dispatched.
    notify_approvals: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_deadlines: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_daily_summary: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_safety: Mapped[bool] = mapped_column(Boolean, default=True)
    contact_window: Mapped[str] = mapped_column(String(60), default="Evenings, after 18:00")
    retention: Mapped[str] = mapped_column(String(40), default="12 months")

    profile: Mapped[PregnancyProfile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    goals: Mapped[list[Goal]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tasks: Mapped[list[Task]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    appointments: Mapped[list[Appointment]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    memories: Mapped[list[Memory]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    runs: Mapped[list[AgentRun]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    conversations: Mapped[list[Conversation]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Conversation.last_message_at.desc()",
    )
    safety_events: Mapped[list[SafetyEvent]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    contacts: Mapped[list[TrustedContact]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class PregnancyProfile(Base, TimestampMixin):
    __tablename__ = "pregnancy_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    due_date: Mapped[date] = mapped_column(Date)
    care_location: Mapped[str | None] = mapped_column(String(160), default=None)
    clinician: Mapped[str | None] = mapped_column(String(120), default=None)
    # What the user asked Nnneva to take on, one label per line. The agent acts
    # only inside these areas; anything else stays a suggestion (§02).
    help_areas: Mapped[str] = mapped_column(Text, default="")

    user: Mapped[User] = relationship(back_populates="profile")

    @property
    def gestational_week(self) -> int:
        """Weeks completed, derived from the due date rather than stored.

        A stored week is wrong the day after it is written; 40 weeks minus the
        weeks remaining is always current.
        """
        days_to_go = (self.due_date - date.today()).days
        return max(0, min(42, 40 - (days_to_go // 7)))

    @property
    def trimester(self) -> str:
        week = self.gestational_week
        if week < 13:
            return "first trimester"
        return "second trimester" if week < 28 else "third trimester"


class TrustedContact(Base, TimestampMixin):
    """Someone helping the mother. Every permission here defaults to off.

    Nothing reaches this person without an explicit approval on the specific
    action, even when a permission below is switched on — the permission says
    what *may* be asked for, not what may be sent (§02).
    """

    __tablename__ = "trusted_contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(120))
    relationship_label: Mapped[str] = mapped_column(String(60), default="Partner")

    # How to actually reach them. Both optional: a contact is useful for
    # sharing inside the app before any channel is known, and asking for a
    # phone number before it is needed would be asking for more than §02 allows.
    phone: Mapped[str | None] = mapped_column(String(40), default=None)
    email: Mapped[str | None] = mapped_column(String(255), default=None)

    # The secret in their invite link. A capability, not a password: holding it
    # is the whole authorisation, so it is long, random, and revocable by
    # regenerating. They get no account — asking a partner to sign up to help is
    # a barrier, and an account would be a second place her data lives.
    access_token: Mapped[str | None] = mapped_column(String(64), unique=True, default=None)
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    can_see_shared_tasks: Mapped[bool] = mapped_column(Boolean, default=False)
    can_see_appointments: Mapped[bool] = mapped_column(Boolean, default=False)
    can_get_forwarded_reminders: Mapped[bool] = mapped_column(Boolean, default=False)
    can_see_test_results: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="contacts")
    messages: Mapped[list["ContactMessage"]] = relationship(
        back_populates="contact",
        cascade="all, delete-orphan",
        order_by="ContactMessage.created_at",
    )


class ContactMessage(Base, TimestampMixin):
    """One message between the mother and her trusted contact.

    Kept apart from the agent's conversations on purpose: this is a thread
    between two people and the agent is not in it. Nothing here is sent to a
    model, and nothing the agent knows leaks into it — what the contact learns
    is only what she types or explicitly shares.
    """

    __tablename__ = "contact_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    contact_id: Mapped[str] = mapped_column(
        ForeignKey("trusted_contacts.id", ondelete="CASCADE"), index=True
    )
    # Denormalised so a message can be scoped to its owner without a join, which
    # every read here does.
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    body: Mapped[str] = mapped_column(Text)
    # "user" for the mother, "contact" for the partner.
    sender: Mapped[str] = mapped_column(String(10), default="user")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    contact: Mapped["TrustedContact"] = relationship(back_populates="messages")


# ---------------------------------------------------------------------------
# Goals, plans and the work they produce
# ---------------------------------------------------------------------------


class Goal(Base, TimestampMixin):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(240))
    detail: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), default=GoalStatus.active)
    target_date: Mapped[date | None] = mapped_column(Date, default=None)
    created_by: Mapped[TaskOwner] = mapped_column(Enum(TaskOwner), default=TaskOwner.agent)

    user: Mapped[User] = relationship(back_populates="goals")
    plans: Mapped[list[Plan]] = relationship(back_populates="goal", cascade="all, delete-orphan")
    tasks: Mapped[list[Task]] = relationship(back_populates="goal", cascade="all, delete-orphan")

    @property
    def progress(self) -> int:
        """Percentage of this goal's tasks that are complete."""
        if not self.tasks:
            return 0
        done = sum(1 for t in self.tasks if t.status is TaskStatus.complete)
        return round(100 * done / len(self.tasks))


class Plan(Base, TimestampMixin):
    """The agent's structured approach to a goal: one row per step.

    Steps are kept even when a run is superseded, because the activity history
    has to show what the agent intended, not only what it managed to do.
    """

    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    goal_id: Mapped[str] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"), default=None, index=True
    )

    step_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(240))
    detail: Mapped[str] = mapped_column(Text, default="")
    state: Mapped[str] = mapped_column(String(30), default="done")

    goal: Mapped[Goal] = relationship(back_populates="plans")
    run: Mapped[AgentRun | None] = relationship(back_populates="plan_steps")


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    goal_id: Mapped[str | None] = mapped_column(
        ForeignKey("goals.id", ondelete="CASCADE"), default=None, index=True
    )

    title: Mapped[str] = mapped_column(String(240))
    detail: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.todo)
    due_date: Mapped[date | None] = mapped_column(Date, default=None)
    owner: Mapped[TaskOwner] = mapped_column(Enum(TaskOwner), default=TaskOwner.user)
    created_by: Mapped[TaskOwner] = mapped_column(Enum(TaskOwner), default=TaskOwner.agent)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    # Set when she asks her partner to do this one. The task stays hers — it is
    # on her list, in her account; the contact is only being asked.
    assigned_contact_id: Mapped[str | None] = mapped_column(
        ForeignKey("trusted_contacts.id", ondelete="SET NULL"), default=None, index=True
    )

    user: Mapped[User] = relationship(back_populates="tasks")
    assigned_contact: Mapped["TrustedContact | None"] = relationship()
    goal: Mapped[Goal | None] = relationship(back_populates="tasks")
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )


class Reminder(Base, TimestampMixin):
    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), default=None, index=True
    )

    fire_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str] = mapped_column(String(240))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped[User] = relationship(back_populates="reminders")
    task: Mapped[Task | None] = relationship(back_populates="reminders")


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(160), default="Antenatal review")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String(200), default=None)
    clinician: Mapped[str | None] = mapped_column(String(120), default=None)
    attended: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")

    user: Mapped[User] = relationship(back_populates="appointments")
    questions: Mapped[list[AppointmentQuestion]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )
    preparation: Mapped[list[PreparationItem]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )


class AppointmentQuestion(Base, TimestampMixin):
    __tablename__ = "appointment_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    appointment_id: Mapped[str] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), index=True
    )

    text: Mapped[str] = mapped_column(Text)
    # Where the question came from — "Nnneva", "You, 3 Sep", "From last visit".
    # Shown next to the question so the user can tell hers from the agent's.
    source: Mapped[str] = mapped_column(String(80), default="Nnneva")
    position: Mapped[int] = mapped_column(Integer, default=0)
    asked: Mapped[bool] = mapped_column(Boolean, default=False)

    appointment: Mapped[Appointment] = relationship(back_populates="questions")


class PreparationItem(Base, TimestampMixin):
    __tablename__ = "preparation_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    appointment_id: Mapped[str] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(240))
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    appointment: Mapped[Appointment] = relationship(back_populates="preparation")


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------


class Memory(Base, TimestampMixin):
    """A fact worth reusing so the user never re-explains her context (§01)."""

    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    kind: Mapped[MemoryKind] = mapped_column(Enum(MemoryKind), default=MemoryKind.context)
    fact: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(160), default="From your message")
    forgotten_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped[User] = relationship(back_populates="memories")


# ---------------------------------------------------------------------------
# Agent runs, the actions inside them, and the approvals they wait on
# ---------------------------------------------------------------------------


class Conversation(Base, TimestampMixin):
    """A thread of exchanges with the agent.

    Runs were standalone: each message was answered and forgotten, so nothing
    could be followed up and "as we discussed" meant nothing. A conversation
    gives them an order and a shared history, which is what lets a later turn
    refer to an earlier one.

    The title is taken from the opening message rather than generated, so it is
    recognisable in a list without costing a model call per thread.
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120), default="New chat")
    # Bumped on every run, so the list orders by real activity rather than by
    # when the thread happened to be started.
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped[User] = relationship(back_populates="conversations")
    runs: Mapped[list[AgentRun]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AgentRun.created_at",
    )


class AgentRun(Base, TimestampMixin):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[str | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), default=None, index=True
    )
    goal_id: Mapped[str | None] = mapped_column(
        ForeignKey("goals.id", ondelete="SET NULL"), default=None, index=True
    )

    prompt: Mapped[str] = mapped_column(Text)
    reply: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[RunStatus] = mapped_column(Enum(RunStatus), default=RunStatus.running)
    # "bedrock" or "scripted" — the API reports which planner produced the run
    # so a reader is never misled about whether a model was involved.
    engine: Mapped[str] = mapped_column(String(20), default="scripted")
    safety_band: Mapped[SafetyBand] = mapped_column(Enum(SafetyBand), default=SafetyBand.none)
    duration_ms: Mapped[float | None] = mapped_column(Float, default=None)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped[User] = relationship(back_populates="runs")
    conversation: Mapped[Conversation | None] = relationship(back_populates="runs")
    goal: Mapped[Goal | None] = relationship()
    actions: Mapped[list[ToolAction]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ToolAction.position"
    )
    plan_steps: Mapped[list[Plan]] = relationship(
        back_populates="run", order_by="Plan.step_index"
    )
    approvals: Mapped[list[Approval]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class ToolAction(Base, TimestampMixin):
    """One tool call. Written by the run recorder, not by the model.

    The blueprint lists `log_agent_action` as a tool, but a model that has to
    remember to log is a model that will sometimes forget. Recording every call
    at the tool boundary makes the history complete by construction.
    """

    __tablename__ = "tool_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id", ondelete="CASCADE"), index=True)

    position: Mapped[int] = mapped_column(Integer, default=0)
    tool: Mapped[str] = mapped_column(String(60))
    summary: Mapped[str] = mapped_column(String(240))
    result: Mapped[ActionResult] = mapped_column(Enum(ActionResult), default=ActionResult.ok)
    result_label: Mapped[str] = mapped_column(String(60), default="Done")
    detail: Mapped[str] = mapped_column(Text, default="")

    run: Mapped[AgentRun] = relationship(back_populates="actions")


class Approval(Base, TimestampMixin):
    """An action with real consequences, held until the user answers.

    The action is described here rather than performed and undone: nothing
    leaves the account before the answer arrives (§02).
    """

    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="CASCADE"), default=None, index=True
    )
    task_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), default=None
    )

    action: Mapped[str] = mapped_column(String(60))
    question: Mapped[str] = mapped_column(Text)
    why: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.pending
    )
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    run: Mapped[AgentRun | None] = relationship(back_populates="approvals")


class SafetyEvent(Base, TimestampMixin):
    """A red-flag screen and what was decided.

    Cleared screens are recorded too: showing that a message was checked and
    found clear is part of the guarantee, not noise.
    """

    __tablename__ = "safety_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="CASCADE"), default=None, index=True
    )

    band: Mapped[SafetyBand] = mapped_column(Enum(SafetyBand), default=SafetyBand.none)
    trigger: Mapped[str] = mapped_column(String(240), default="")
    excerpt: Mapped[str] = mapped_column(Text, default="")
    guidance: Mapped[str] = mapped_column(Text, default="")
    automation_stopped: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped[User] = relationship(back_populates="safety_events")
