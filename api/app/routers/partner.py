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
from sqlalchemy import func

from app.models import ContactMessage, Task, TaskStatus, TrustedContact
from app.schemas import (
    ContactMessageIn,
    ContactMessageOut,
    PartnerTaskOut,
    PartnerViewOut,
    TrustedContactIn,
    TrustedContactOut,
    TrustedContactPatch,
)

# The permission columns, keyed by the name the API uses. Kept here rather than
# imported from profile.py so the two screens cannot drift apart silently.
PERMISSIONS = {
    "shared_tasks": "can_see_shared_tasks",
    "appointments": "can_see_appointments",
    "forwarded_reminders": "can_get_forwarded_reminders",
    "test_results": "can_see_test_results",
}

router = APIRouter(tags=["partner"])


# ---- Her side --------------------------------------------------------------


def _hers(db: DbSession, user, contact_id: str) -> TrustedContact:
    """One of her contacts, by id.

    404 rather than 403 for someone else's contact: a helper id is a random
    uuid, and telling the difference between "not yours" and "not real" would
    make this a way to confirm one exists.
    """
    contact = db.get(TrustedContact, contact_id)
    if contact is None or contact.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such contact")
    return contact


def _message_out(m: ContactMessage) -> ContactMessageOut:
    return ContactMessageOut(
        id=m.id, body=m.body, sender=m.sender, created_at=m.created_at
    )


def _unread(db: DbSession, contact: TrustedContact, from_sender: str) -> int:
    return db.scalar(
        select(func.count())
        .select_from(ContactMessage)
        .where(
            ContactMessage.contact_id == contact.id,
            ContactMessage.sender == from_sender,
            ContactMessage.read_at.is_(None),
        )
    ) or 0


def _contact_out(db: DbSession, contact: TrustedContact) -> TrustedContactOut:
    return TrustedContactOut(
        id=contact.id,
        name=contact.name,
        relationship=contact.relationship_label,
        phone=contact.phone,
        email=contact.email,
        invited=contact.access_token is not None,
        accepted=contact.accepted_at is not None,
        access_token=contact.access_token,
        username=contact.linked_user.username if contact.linked_user else None,
        unread=_unread(db, contact, "contact"),
        permissions={key: getattr(contact, field) for key, field in PERMISSIONS.items()},
    )


@router.get("/contacts", response_model=list[TrustedContactOut])
def list_contacts(user: CurrentUser, db: DbSession) -> list[TrustedContactOut]:
    """Everyone helping her. A pregnancy is rarely one person's job."""
    return [_contact_out(db, c) for c in user.contacts]


@router.post("/contacts", response_model=TrustedContactOut, status_code=status.HTTP_201_CREATED)
def add_contact(payload: TrustedContactIn, user: CurrentUser, db: DbSession) -> TrustedContactOut:
    """Add someone by hand — a person with no Nnneva account.

    Every permission starts off, as it does for a contact who arrives by
    accepting a request. Adding someone is not sharing with them.
    """
    contact = TrustedContact(
        user_id=user.id,
        name=payload.name.strip(),
        relationship_label=payload.relationship.strip() or "Partner",
        phone=payload.phone,
        email=payload.email,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _contact_out(db, contact)


@router.get("/contacts/{contact_id}", response_model=TrustedContactOut)
def read_contact(contact_id: str, user: CurrentUser, db: DbSession) -> TrustedContactOut:
    return _contact_out(db, _hers(db, user, contact_id))


@router.patch("/contacts/{contact_id}", response_model=TrustedContactOut)
def update_contact(
    contact_id: str, payload: TrustedContactPatch, user: CurrentUser, db: DbSession
) -> TrustedContactOut:
    contact = _hers(db, user, contact_id)

    if payload.name is not None:
        contact.name = payload.name.strip()
    if payload.relationship is not None:
        contact.relationship_label = payload.relationship.strip() or "Partner"
    if payload.phone is not None:
        contact.phone = payload.phone
    if payload.email is not None:
        contact.email = payload.email
    for key, value in (payload.permissions or {}).items():
        if key in PERMISSIONS:
            setattr(contact, PERMISSIONS[key], bool(value))

    db.commit()
    db.refresh(contact)
    return _contact_out(db, contact)


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_contact(contact_id: str, user: CurrentUser, db: DbSession) -> None:
    """Remove a contact, and with them the thread and the link.

    Tasks assigned to them survive — they are her tasks, and losing one because
    a helper left would be the wrong kind of tidy.
    """
    contact = _hers(db, user, contact_id)
    for task in db.scalars(select(Task).where(Task.assigned_contact_id == contact.id)).all():
        task.assigned_contact_id = None
    db.delete(contact)
    db.commit()


@router.post("/contacts/{contact_id}/invite", response_model=TrustedContactOut)
def invite_contact(contact_id: str, user: CurrentUser, db: DbSession) -> TrustedContactOut:
    """Mint (or replace) the link this contact uses.

    Calling this again rotates the token, which is also how she revokes access:
    the old link stops working the moment a new one exists.

    A contact who arrived by accepting a request does not need one — they sign
    in as themselves — so this refuses rather than creating a second way in.
    """
    contact = _hers(db, user, contact_id)
    if contact.linked_user_id is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{contact.name} has a Nnneva account and signs in to help; no link is needed.",
        )
    contact.access_token = secrets.token_urlsafe(32)
    contact.invited_at = datetime.now(timezone.utc)
    contact.accepted_at = None
    db.commit()
    db.refresh(contact)
    return _contact_out(db, contact)


@router.delete("/contacts/{contact_id}/invite", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invite(contact_id: str, user: CurrentUser, db: DbSession) -> None:
    contact = _hers(db, user, contact_id)
    contact.access_token = None
    contact.accepted_at = None
    db.commit()


@router.get("/contacts/{contact_id}/messages", response_model=list[ContactMessageOut])
def list_messages(contact_id: str, user: CurrentUser, db: DbSession) -> list[ContactMessageOut]:
    contact = _hers(db, user, contact_id)
    # Anything they sent is now seen.
    for m in contact.messages:
        if m.sender == "contact" and m.read_at is None:
            m.read_at = datetime.now(timezone.utc)
    db.commit()
    return [_message_out(m) for m in contact.messages]


@router.post(
    "/contacts/{contact_id}/messages",
    response_model=ContactMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    contact_id: str, payload: ContactMessageIn, user: CurrentUser, db: DbSession
) -> ContactMessageOut:
    contact = _hers(db, user, contact_id)
    message = ContactMessage(
        contact_id=contact.id, user_id=user.id, body=payload.body.strip(), sender="user"
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_out(message)


@router.post("/contacts/{contact_id}/tasks/{task_id}", response_model=PartnerTaskOut)
def assign_task(
    contact_id: str, task_id: str, user: CurrentUser, db: DbSession
) -> PartnerTaskOut:
    """Ask a contact to take a task on.

    The task stays hers. Assigning is a request, not a transfer: it remains on
    her list, and she can take it back by unassigning.
    """
    contact = _hers(db, user, contact_id)
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")
    task.assigned_contact_id = contact.id
    db.commit()
    db.refresh(task)
    return _task_out(task)


@router.delete("/tasks/{task_id}/assign", status_code=status.HTTP_204_NO_CONTENT)
def unassign_task(task_id: str, user: CurrentUser, db: DbSession) -> None:
    task = db.get(Task, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")
    task.assigned_contact_id = None
    db.commit()


def _task_out(task: Task) -> PartnerTaskOut:
    return PartnerTaskOut(
        id=task.id,
        title=task.title,
        detail=task.detail or "",
        due_date=task.due_date,
        done=task.status == TaskStatus.complete,
    )


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
