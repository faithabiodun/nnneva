"""Request and response shapes.

Response models mirror what each screen renders, so the frontend never has to
reassemble a page out of four calls.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ORM = ConfigDict(from_attributes=True)


# ---- Auth -----------------------------------------------------------------


class SignUpIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SupabaseAuthIn(BaseModel):
    """The access token the web tier received from Supabase Auth."""

    access_token: str = Field(min_length=1)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    onboarded: bool


# ---- Onboarding -----------------------------------------------------------


class OnboardingIn(BaseModel):
    due_date: date
    care_location: str | None = None
    clinician: str | None = None
    help_areas: list[str] = []
    contact_name: str | None = None
    contact_relationship: str | None = "Partner"
    contact_phone: str | None = None
    contact_email: str | None = None
    contact_can_see_shared_tasks: bool = False
    contact_window: str | None = None


# ---- Core records ---------------------------------------------------------


class TaskOut(BaseModel):
    model_config = ORM
    id: str
    title: str
    detail: str
    status: str
    due_date: date | None
    goal_id: str | None
    created_by: str


class GoalOut(BaseModel):
    model_config = ORM
    id: str
    title: str
    status: str
    progress: int
    created_by: str
    tasks: list[TaskOut]


class ReminderOut(BaseModel):
    model_config = ORM
    id: str
    reason: str
    fire_at: datetime
    task_id: str | None
    sent_at: datetime | None


class QuestionOut(BaseModel):
    model_config = ORM
    id: str
    text: str
    source: str
    asked: bool


class PreparationOut(BaseModel):
    model_config = ORM
    id: str
    title: str
    done: bool


class AppointmentOut(BaseModel):
    model_config = ORM
    id: str
    title: str
    starts_at: datetime
    location: str | None
    clinician: str | None
    attended: bool
    questions: list[QuestionOut]
    preparation: list[PreparationOut]


class AppointmentsOut(BaseModel):
    """Split by the server, which is the only clock worth trusting here.

    A device with a wrong date would otherwise file the next visit under
    "past" and hide the preparation for it.
    """

    upcoming: list[AppointmentOut]
    past: list[AppointmentOut]


class MemoryOut(BaseModel):
    model_config = ORM
    id: str
    kind: str
    fact: str
    source: str
    created_at: datetime


class ActionOut(BaseModel):
    model_config = ORM
    tool: str
    summary: str
    result: str
    result_label: str
    detail: str


class PlanStepOut(BaseModel):
    model_config = ORM
    step_index: int
    title: str
    detail: str
    state: str


class ApprovalOut(BaseModel):
    model_config = ORM
    id: str
    action: str
    question: str
    why: str
    status: str


class RunOut(BaseModel):
    model_config = ORM
    id: str
    prompt: str
    reply: str
    status: str
    engine: str
    safety_band: str
    created_at: datetime
    duration_ms: float | None
    actions: list[ActionOut]
    plan_steps: list[PlanStepOut]
    approvals: list[ApprovalOut]


class SafetyEventOut(BaseModel):
    model_config = ORM
    id: str
    band: str
    trigger: str
    guidance: str
    automation_stopped: bool
    created_at: datetime


# ---- Screen payloads ------------------------------------------------------


class ProfileOut(BaseModel):
    full_name: str
    email: str
    phone: str | None
    avatar: str | None
    due_date: date | None
    gestational_week: int | None
    trimester: str | None
    care_location: str | None
    clinician: str | None
    help_areas: list[str]
    contact_window: str
    retention: str
    notifications: dict[str, bool]
    trusted_contact: dict | None
    # Whether the pregnancy context exists. Google sign-in creates an account
    # without it, so the app has to be able to ask for it later rather than
    # assuming everyone came through onboarding.
    onboarded: bool


class HomeOut(BaseModel):
    greeting_name: str
    gestational_week: int | None
    due_date: date | None
    today: list[TaskOut]
    goals: list[GoalOut]
    next_appointment: AppointmentOut | None
    recent_actions: list[ActionOut]
    pending_approvals: list[ApprovalOut]


class ActivityDayOut(BaseModel):
    label: str
    runs: list[RunOut]


# ---- Mutations ------------------------------------------------------------


class AgentMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class TaskPatch(BaseModel):
    status: str | None = None
    title: str | None = None
    due_date: date | None = None


class QuestionIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ApprovalDecision(BaseModel):
    approve: bool


class ProfilePatch(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    # The pregnancy context, editable after the fact. due_date creates the
    # profile row when there is none, so someone who skipped onboarding can
    # fill it in from their profile instead of being sent back through a wizard.
    due_date: date | None = None
    care_location: str | None = None
    clinician: str | None = None
    help_areas: list[str] | None = None
    contact_window: str | None = None
    retention: str | None = None
    notifications: dict[str, bool] | None = None
    trusted_contact_permissions: dict[str, bool] | None = None
