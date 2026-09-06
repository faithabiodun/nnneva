"""The trusted contact: her side, and theirs.

Two audiences in one file because they are two halves of one feature, and
keeping them together makes the asymmetry visible: she authenticates with a
session and sees everything; they hold a link and see only what her
permissions allow.

The link is a capability. Holding it is the whole authorisation — there is no
password and no account, because asking a partner to sign up before they can
help is a barrier, and an account would be a second place her data lives. That
puts real weight on the token: it is 43 characters of `secrets`, it is never
logged, and she can revoke it by generating a new one.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import ContactMessage, Task, TaskStatus, TrustedContact
from app.schemas import (
    ContactMessageIn,
    ContactMessageOut,
    PartnerTaskOut,
    PartnerViewOut,
    TrustedContactOut,
)

router = APIRouter(tags=["partner"])


# ---- Her side --------------------------------------------------------------


def _her_contact(db: DbSession, user) -> TrustedContact:
    contact = db.scalars(
        select(TrustedContact).where(TrustedContact.user_id == user.id)
    ).first()
    if contact is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No trusted contact yet. Add one in your profile first.",
        )
    return contact


def _message_out(m: ContactMessage) -> ContactMessageOut:
    return ContactMessageOut(
        id=m.id, body=m.body, sender=m.sender, created_at=m.created_at
    )


@router.get("/contact", response_model=TrustedContactOut)
def read_contact(user: CurrentUser, db: DbSession) -> TrustedContactOut:
    contact = _her_contact(db, user)
    return TrustedContactOut(
        id=contact.id,
        name=contact.name,
        relationship=contact.relationship_label,
        phone=contact.phone,
        email=contact.email,
        invited=contact.access_token is not None,
        accepted=contact.accepted_at is not None,
        access_token=contact.access_token,
    )


@router.post("/contact/invite", response_model=TrustedContactOut)
def invite_contact(user: CurrentUser, db: DbSession) -> TrustedContactOut:
    """Mint (or replace) the link her contact uses.

    Calling this again rotates the token, which is also how she revokes access:
    the old link stops working the moment a new one exists.
    """
    contact = _her_contact(db, user)
    contact.access_token = secrets.token_urlsafe(32)
    contact.invited_at = datetime.now(timezone.utc)
    contact.accepted_at = None
    db.commit()
    db.refresh(contact)
    return read_contact(user, db)


@router.delete("/contact/invite", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invite(user: CurrentUser, db: DbSession) -> None:
    contact = _her_contact(db, user)
    contact.access_token = None
    contact.accepted_at = None
    db.commit()


@router.get("/contact/messages", response_model=list[ContactMessageOut])
def list_messages(user: CurrentUser, db: DbSession) -> list[ContactMessageOut]:
    contact = _her_contact(db, user)
    # Anything they sent is now seen.
    for m in contact.messages:
        if m.sender == "contact" and m.read_at is None:
            m.read_at = datetime.now(timezone.utc)
    db.commit()
    return [_message_out(m) for m in contact.messages]


@router.post(
    "/contact/messages", response_model=ContactMessageOut, status_code=status.HTTP_201_CREATED
)
def send_message(
    payload: ContactMessageIn, user: CurrentUser, db: DbSession
) -> ContactMessageOut:
    contact = _her_contact(db, user)
    message = ContactMessage(
        contact_id=contact.id, user_id=user.id, body=payload.body.strip(), sender="user"
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_out(message)


@router.post("/tasks/{task_id}/assign", response_model=PartnerTaskOut)
def assign_task(task_id: str, user: CurrentUser, db: DbSession) -> PartnerTaskOut:
    """Ask her contact to take a task on.

    The task stays hers. Assigning is a request, not a transfer: it remains on
    her list, and she can take it back by unassigning.
    """
    contact = _her_contact(db, user)
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")
    task.assigned_contact_id = contact.id
    db.commit()
    db.refresh(task)
    return PartnerTaskOut(
        id=task.id, title=task.title, detail=task.detail,
        due_date=task.due_date, done=task.status == TaskStatus.complete,
    )


@router.delete("/tasks/{task_id}/assign", status_code=status.HTTP_204_NO_CONTENT)
def unassign_task(task_id: str, user: CurrentUser, db: DbSession) -> None:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")
    task.assigned_contact_id = None
    db.commit()


# ---- Their side ------------------------------------------------------------


def _by_token(db: DbSession, token: str) -> TrustedContact:
    """The contact this link belongs to.

    A wrong token is 404, never 403: a different status would confirm that some
    tokens exist, which is the one thing a guesser learns something from.
    """
    contact = db.scalars(
        select(TrustedContact).where(TrustedContact.access_token == token)
    ).first()
    if contact is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This link is not valid")
    return contact


@router.get("/partner/{token}", response_model=PartnerViewOut)
def partner_view(token: str, db: DbSession) -> PartnerViewOut:
    """Everything the contact may see, and nothing else.

    Tasks appear only when she has switched on `can_see_shared_tasks`, and even
    then only the ones she has assigned to them. There is no route here to her
    appointments, her memories, her agent runs or her profile.
    """
    contact = _by_token(db, token)
    if contact.accepted_at is None:
        contact.accepted_at = datetime.now(timezone.utc)

    for m in contact.messages:
        if m.sender == "user" and m.read_at is None:
            m.read_at = datetime.now(timezone.utc)
    db.commit()

    tasks: list[PartnerTaskOut] = []
    if contact.can_see_shared_tasks:
        rows = db.scalars(
            select(Task)
            .where(Task.assigned_contact_id == contact.id)
            .order_by(Task.due_date.nulls_last(), Task.created_at)
        ).all()
        tasks = [
            PartnerTaskOut(
                id=t.id, title=t.title, detail=t.detail,
                due_date=t.due_date, done=t.status == TaskStatus.complete,
            )
            for t in rows
        ]

    return PartnerViewOut(
        contact_name=contact.name,
        relationship=contact.relationship_label,
        # Her first name only. A trusted contact knows who she is; her full
        # name is not this link's to hand out.
        mother_name=contact.user.full_name.split(" ")[0],
        can_see_tasks=contact.can_see_shared_tasks,
        tasks=tasks,
        messages=[_message_out(m) for m in contact.messages],
    )


@router.post(
    "/partner/{token}/messages",
    response_model=ContactMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def partner_reply(token: str, payload: ContactMessageIn, db: DbSession) -> ContactMessageOut:
    contact = _by_token(db, token)
    message = ContactMessage(
        contact_id=contact.id,
        user_id=contact.user_id,
        body=payload.body.strip(),
        sender="contact",
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_out(message)


@router.post("/partner/{token}/tasks/{task_id}/done", response_model=PartnerTaskOut)
def partner_complete(token: str, task_id: str, db: DbSession) -> PartnerTaskOut:
    """Mark an assigned task done.

    Only a task she assigned to this contact can be touched, and only its
    status: the link is not a way to edit her list.
    """
    contact = _by_token(db, token)
    if not contact.can_see_shared_tasks:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tasks are not shared with you")

    task = db.get(Task, task_id)
    if task is None or task.assigned_contact_id != contact.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")

    task.status = TaskStatus.complete
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return PartnerTaskOut(
        id=task.id, title=task.title, detail=task.detail,
        due_date=task.due_date, done=True,
    )
