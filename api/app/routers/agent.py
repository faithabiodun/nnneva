"""Talking to the agent."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.agent.runner import BedrockUnavailable, run_agent
from app.deps import CurrentUser, DbSession
from app.models import AgentRun, Conversation
from app.schemas import (
    AgentMessageIn,
    ConversationDetailOut,
    ConversationOut,
    RunOut,
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/runs", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def start_run(payload: AgentMessageIn, user: CurrentUser, db: DbSession) -> AgentRun:
    """Give Nnneva a goal in plain language and let it do the work.

    Synchronous on purpose: a run is a handful of database writes plus at most
    one model call, and the agent screen wants the finished plan to animate. A
    queue here would add moving parts without changing what the user sees.
    """
    message = payload.message.strip()
    conversation = _resolve_conversation(db, user, payload.conversation_id, message)

    try:
        outcome = run_agent(db, user, message, conversation=conversation)
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


def _resolve_conversation(
    db: DbSession, user, conversation_id: str | None, message: str
) -> Conversation:
    """The thread this message belongs to, creating one if it is the first.

    A missing id always means a new thread rather than "the most recent one".
    Guessing would silently graft a new subject onto an old conversation, and
    the model would then read the two as related.
    """
    if conversation_id:
        existing = db.get(Conversation, conversation_id)
        if existing is None or existing.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such conversation")
        return existing

    conversation = Conversation(user_id=user.id, title=_title_from(message))
    db.add(conversation)
    db.flush()
    return conversation


def _title_from(message: str) -> str:
    """A recognisable title, taken from the opening message.

    Not model-generated: a title is worth almost nothing and a model call per
    thread is worth real money and real latency. The first clause of what she
    actually typed is more recognisable than a summary anyway.
    """
    text = " ".join(message.split())
    for stop in (". ", "? ", "! ", " — ", " – "):
        head = text.split(stop)[0]
        if head != text:
            text = head + ("?" if stop.startswith("?") else "")
            break
    return (text[:77] + "…") if len(text) > 78 else (text or "New chat")


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: CurrentUser, db: DbSession, limit: int = 50):
    """The history list: newest activity first."""
    threads = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .options(selectinload(Conversation.runs))
        .order_by(Conversation.last_message_at.desc())
        .limit(min(limit, 200))
    ).all()

    return [
        ConversationOut(
            id=c.id,
            title=c.title,
            last_message_at=c.last_message_at,
            message_count=len(c.runs),
            # The last thing said, so the list reads like a conversation rather
            # than a list of opening lines.
            preview=(c.runs[-1].reply if c.runs and c.runs[-1].reply else c.runs[-1].prompt)
            if c.runs
            else "",
        )
        for c in threads
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
def read_conversation(conversation_id: str, user: CurrentUser, db: DbSession):
    """One thread in full, so it can be picked up where it was left."""
    conversation = db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such conversation")
    return ConversationDetailOut(
        id=conversation.id,
        title=conversation.title,
        last_message_at=conversation.last_message_at,
        runs=conversation.runs,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, user: CurrentUser, db: DbSession) -> None:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such conversation")
    db.delete(conversation)
    db.commit()
