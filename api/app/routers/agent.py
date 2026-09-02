"""Talking to the agent."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.agent.runner import BedrockUnavailable, run_agent
from app.deps import CurrentUser, DbSession
from app.models import AgentRun
from app.schemas import AgentMessageIn, RunOut

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/runs", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def start_run(payload: AgentMessageIn, user: CurrentUser, db: DbSession) -> AgentRun:
    """Give Nnneva a goal in plain language and let it do the work.

    Synchronous on purpose: a run is a handful of database writes plus at most
    one model call, and the agent screen wants the finished plan to animate. A
    queue here would add moving parts without changing what the user sees.
    """
    try:
        outcome = run_agent(db, user, payload.message.strip())
    except BedrockUnavailable as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"The model is configured as required but could not be reached: {exc}",
        ) from exc
    db.refresh(outcome.run)
    return outcome.run


@router.get("/runs", response_model=list[RunOut])
def list_runs(user: CurrentUser, db: DbSession, limit: int = 20) -> list[AgentRun]:
    return list(
        db.scalars(
            select(AgentRun)
            .where(AgentRun.user_id == user.id)
            .options(
                selectinload(AgentRun.actions),
                selectinload(AgentRun.plan_steps),
                selectinload(AgentRun.approvals),
            )
            .order_by(AgentRun.created_at.desc())
            .limit(min(limit, 100))
        ).all()
    )


@router.get("/runs/{run_id}", response_model=RunOut)
def read_run(run_id: str, user: CurrentUser, db: DbSession) -> AgentRun:
    run = db.get(AgentRun, run_id)
    if run is None or run.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such run")
    return run
