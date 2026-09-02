"""One call that fills the home screen."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession
from app.models import (
    AgentRun,
    Appointment,
    Approval,
    ApprovalStatus,
    Goal,
    GoalStatus,
    Task,
    TaskStatus,
    ToolAction,
    utcnow,
)
from app.schemas import HomeOut

router = APIRouter(tags=["home"])


@router.get("/home", response_model=HomeOut)
def home(user: CurrentUser, db: DbSession) -> HomeOut:
    profile = user.profile
    horizon = date.today() + timedelta(days=1)

    # "Today" is what is due now or overdue, plus anything already in flight —
    # a task that slipped yesterday still belongs at the top of today.
    today = list(
        db.scalars(
            select(Task)
            .where(
                Task.user_id == user.id,
                Task.status.notin_([TaskStatus.complete, TaskStatus.cancelled]),
                (Task.due_date <= horizon) | (Task.status == TaskStatus.in_progress),
            )
            .order_by(Task.due_date.nulls_last(), Task.created_at)
            .limit(6)
        ).all()
    )

    goals = list(
        db.scalars(
            select(Goal)
            .where(Goal.user_id == user.id, Goal.status == GoalStatus.active)
            .options(selectinload(Goal.tasks))
            .order_by(Goal.created_at.desc())
            .limit(4)
        ).all()
    )

    next_appointment = db.scalars(
        select(Appointment)
        .where(Appointment.user_id == user.id, Appointment.starts_at >= utcnow())
        .order_by(Appointment.starts_at)
        .limit(1)
    ).first()

    recent_actions = list(
        db.scalars(
            select(ToolAction)
            .join(AgentRun, ToolAction.run_id == AgentRun.id)
            .where(AgentRun.user_id == user.id)
            .order_by(ToolAction.created_at.desc())
            .limit(6)
        ).all()
    )

    pending = list(
        db.scalars(
            select(Approval)
            .where(Approval.user_id == user.id, Approval.status == ApprovalStatus.pending)
            .order_by(Approval.created_at)
        ).all()
    )

    return HomeOut(
        greeting_name=user.full_name.split(" ")[0],
        gestational_week=profile.gestational_week if profile else None,
        due_date=profile.due_date if profile else None,
        today=today,
        goals=goals,
        next_appointment=next_appointment,
        recent_actions=recent_actions,
        pending_approvals=pending,
    )
