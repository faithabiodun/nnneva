"""The confirmation gate.

An approval is where the agent stopped. Answering it here is the only place the
described action actually happens — declining leaves no trace of a send because
there never was one (§02).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import (
    ActionResult,
    Approval,
    ApprovalStatus,
    MemoryKind,
    Memory,
    RunStatus,
    Task,
    TaskStatus,
    ToolAction,
    TrustedContact,
    utcnow,
)
from app.schemas import ApprovalDecision, ApprovalOut

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalOut])
def list_pending(user: CurrentUser, db: DbSession) -> list[Approval]:
    return list(
        db.scalars(
            select(Approval)
            .where(Approval.user_id == user.id, Approval.status == ApprovalStatus.pending)
            .order_by(Approval.created_at)
        ).all()
    )


@router.post("/{approval_id}", response_model=ApprovalOut)
def decide(
    approval_id: str, payload: ApprovalDecision, user: CurrentUser, db: DbSession
) -> Approval:
    approval = db.get(Approval, approval_id)
    if approval is None or approval.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such approval")
    if approval.status is not ApprovalStatus.pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "That was already answered")

    approval.status = ApprovalStatus.approved if payload.approve else ApprovalStatus.declined
    approval.answered_at = utcnow()

    task = db.get(Task, approval.task_id) if approval.task_id else None
    contact = db.scalars(
        select(TrustedContact).where(TrustedContact.user_id == user.id)
    ).first()
    who = contact.name if contact else "your trusted contact"

    if payload.approve:
        if task is not None:
            task.status = TaskStatus.scheduled
        # The send would happen here. There is no messaging integration in this
        # build, so the record says what was permitted rather than pretending a
        # message went out.
        summary = f"Shared with {who} after you allowed it"
        result, label = ActionResult.ok, "Shared"
        fact = f"Allowed sharing {approval.action.replace('_', ' ')} with {who}."
    else:
        if task is not None:
            task.status = TaskStatus.todo
        summary = f"Did not share with {who} — you declined"
        result, label = ActionResult.blocked, "Declined"
        fact = f"Declined sharing with {who} on {utcnow():%-d %B}."

    if approval.run is not None:
        db.add(
            ToolAction(
                run_id=approval.run.id,
                position=len(approval.run.actions),
                tool="share_with_contact",
                summary=summary,
                result=result,
                result_label=label,
                detail=approval.question,
            )
        )
        approval.run.status = (
            RunStatus.complete
            if all(a.status is not ApprovalStatus.pending for a in approval.run.approvals)
            else RunStatus.awaiting_approval
        )

    # A decision about sharing is exactly the kind of thing Nnneva should not
    # ask about twice.
    db.add(
        Memory(
            user_id=user.id,
            kind=MemoryKind.decision,
            fact=fact,
            source="From an approval you answered",
        )
    )

    db.commit()
    db.refresh(approval)
    return approval
