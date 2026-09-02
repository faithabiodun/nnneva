"""The activity history: every run, grouped by day."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession
from app.models import AgentRun, SafetyEvent
from app.schemas import ActivityDayOut, SafetyEventOut

router = APIRouter(tags=["activity"])


def _day_label(when: date) -> str:
    today = date.today()
    if when == today:
        return f"Today, {when:%-d %B}"
    if when == today - timedelta(days=1):
        return f"Yesterday, {when:%-d %B}"
    return f"{when:%A, %-d %B}"


@router.get("/activity", response_model=list[ActivityDayOut])
def activity(user: CurrentUser, db: DbSession, limit: int = 50) -> list[ActivityDayOut]:
    runs = db.scalars(
        select(AgentRun)
        .where(AgentRun.user_id == user.id)
        .options(
            selectinload(AgentRun.actions),
            selectinload(AgentRun.plan_steps),
            selectinload(AgentRun.approvals),
        )
        .order_by(AgentRun.created_at.desc())
        .limit(min(limit, 200))
    ).all()

    days: list[ActivityDayOut] = []
    for run in runs:
        label = _day_label(run.created_at.date())
        if not days or days[-1].label != label:
            days.append(ActivityDayOut(label=label, runs=[]))
        days[-1].runs.append(run)
    return days


@router.get("/safety-events", response_model=list[SafetyEventOut])
def safety_events(user: CurrentUser, db: DbSession) -> list[SafetyEvent]:
    """Every red-flag screen, cleared ones included."""
    return list(
        db.scalars(
            select(SafetyEvent)
            .where(SafetyEvent.user_id == user.id)
            .order_by(SafetyEvent.created_at.desc())
            .limit(100)
        ).all()
    )
