"""Finding someone by their handle, asking them, and being asked.

A trusted contact can arrive two ways. The older one is an invite link, for
someone with no account — that lives in partner.py. This is the other one: two
people who both use Nnneva, where the helper signs in as themselves.

The asymmetry is deliberate and it runs one way. The mother sends the request,
because she is the one deciding who gets to see anything; accepting grants the
helper only what her permissions already say, which is nothing until she turns
something on. There is no reverse flow where a stranger asks to be let in.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.deps import CurrentUser, DbSession
from app.models import (
    ContactMessage,
    ContactRequest,
    RequestStatus,
    Task,
    TaskStatus,
    TrustedContact,
    User,
)
from app.schemas import (
    ContactMessageIn,
    ContactMessageOut,
    ContactRequestIn,
    ContactRequestOut,
    ContactRequestsOut,
    HelpingOut,
    PartnerTaskOut,
    PersonOut,
)

router = APIRouter(prefix="/people", tags=["people"])

SEARCH_LIMIT = 10


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---- Search ----------------------------------------------------------------


@router.get("/search", response_model=list[PersonOut])
def search(user: CurrentUser, db: DbSession, q: str = Query(min_length=2, max_length=30)):
    """Handles beginning with `q`.

    A prefix match, not a contains match: `%ada%` would turn the box into a way
    to enumerate the user table one letter at a time. A prefix still needs you
    to know roughly what you are looking for, which is what someone who was
    told a handle actually has.
    """
    term = q.strip().lower()
    if not term:
        return []

    people = db.scalars(
        select(User)
        .where(User.username.startswith(term), User.id != user.id)
        .order_by(func.length(User.username), User.username)
        .limit(SEARCH_LIMIT)
    ).all()

    linked = {
        c.linked_user_id
        for c in db.scalars(
            select(TrustedContact).where(
                TrustedContact.user_id == user.id, TrustedContact.linked_user_id.is_not(None)
            )
        ).all()
    }
    requests = db.scalars(
        select(ContactRequest).where(
            ContactRequest.status == RequestStatus.pending,
            or_(
                ContactRequest.requester_id == user.id,
                ContactRequest.addressee_id == user.id,
            ),
        )
    ).all()
    outgoing = {r.addressee_id for r in requests if r.requester_id == user.id}
    incoming = {r.requester_id for r in requests if r.addressee_id == user.id}

    def state_of(other: User) -> str:
        if other.id in linked:
            return "connected"
        if other.id in outgoing:
            return "pending_outgoing"
        if other.id in incoming:
            return "pending_incoming"
        return "none"

    return [
        PersonOut(username=p.username, full_name=p.full_name, state=state_of(p))
        for p in people
    ]


# ---- Requests --------------------------------------------------------------


def _request_out(request: ContactRequest, other: User) -> ContactRequestOut:
    return ContactRequestOut(
        id=request.id,
        username=other.username,
        full_name=other.full_name,
        relationship=request.relationship_label,
        status=request.status.value,
        created_at=request.created_at,
    )


@router.get("/requests", response_model=ContactRequestsOut)
def list_requests(user: CurrentUser, db: DbSession) -> ContactRequestsOut:
    """Both directions, pending only. Answered ones are history, not a to-do."""
    rows = db.scalars(
        select(ContactRequest).where(
            ContactRequest.status == RequestStatus.pending,
            or_(
                ContactRequest.requester_id == user.id,
                ContactRequest.addressee_id == user.id,
            ),
        )
    ).all()
    return ContactRequestsOut(
        incoming=[_request_out(r, r.requester) for r in rows if r.addressee_id == user.id],
        outgoing=[_request_out(r, r.addressee) for r in rows if r.requester_id == user.id],
    )


@router.post("/requests", response_model=ContactRequestOut, status_code=status.HTTP_201_CREATED)
def send_request(payload: ContactRequestIn, user: CurrentUser, db: DbSession) -> ContactRequestOut:
    handle = payload.username.strip().lower()
    other = db.scalars(select(User).where(User.username == handle)).first()

    # 404 for both "no such handle" and "that's you". Distinguishing them would
    # make this endpoint a way to test whether a handle exists.
    if other is None or other.id == user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account with that username")

    already = db.scalars(
        select(TrustedContact).where(
            TrustedContact.user_id == user.id, TrustedContact.linked_user_id == other.id
        )
    ).first()
    if already is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{other.full_name} is already a contact")

    existing = db.scalars(
        select(ContactRequest).where(
            ContactRequest.requester_id == user.id, ContactRequest.addressee_id == other.id
        )
    ).first()
    if existing is not None:
        if existing.status == RequestStatus.pending:
            raise HTTPException(status.HTTP_409_CONFLICT, "That request is already waiting")
        # A declined request can be sent once more — people change their minds,
        # and the pair is unique so this reuses the row rather than stacking.
        existing.status = RequestStatus.pending
        existing.relationship_label = payload.relationship.strip() or "Partner"
        existing.responded_at = None
        db.commit()
        return _request_out(existing, other)

    request = ContactRequest(
        requester_id=user.id,
        addressee_id=other.id,
        relationship_label=payload.relationship.strip() or "Partner",
    )
    db.add(request)
    db.commit()
    return _request_out(request, other)


def _incoming(db: DbSession, request_id: str, user: User) -> ContactRequest:
    request = db.get(ContactRequest, request_id)
    # 404 rather than 403 for someone else's request: the requester should not
    # learn that an id they guessed is real.
    if request is None or request.addressee_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such request")
    if request.status != RequestStatus.pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "That request was already answered")
    return request


@router.post("/requests/{request_id}/accept", response_model=ContactRequestOut)
def accept_request(request_id: str, user: CurrentUser, db: DbSession) -> ContactRequestOut:
    """Become the requester's trusted contact.

    Accepting grants nothing on its own. The contact row is created with every
    permission off, exactly as a hand-added contact is, and she turns things on
    afterwards — so "accept" means "yes, you may ask me", not "yes, take it".
    """
    request = _incoming(db, request_id, user)
    request.status = RequestStatus.accepted
    request.responded_at = _now()

    db.add(
        TrustedContact(
            user_id=request.requester_id,
            linked_user_id=user.id,
            name=user.full_name,
            relationship_label=request.relationship_label,
            email=user.email,
            accepted_at=_now(),
        )
    )
    db.commit()
    return _request_out(request, request.requester)


@router.post("/requests/{request_id}/decline", response_model=ContactRequestOut)
def decline_request(request_id: str, user: CurrentUser, db: DbSession) -> ContactRequestOut:
    request = _incoming(db, request_id, user)
    request.status = RequestStatus.declined
    request.responded_at = _now()
    db.commit()
    return _request_out(request, request.requester)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_request(request_id: str, user: CurrentUser, db: DbSession) -> None:
    """Take back a request you sent, before it is answered."""
    request = db.get(ContactRequest, request_id)
    if request is None or request.requester_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such request")
    db.delete(request)
    db.commit()


# ---- The helper's own side -------------------------------------------------


@router.get("/helping", response_model=list[HelpingOut])
def helping(user: CurrentUser, db: DbSession) -> list[HelpingOut]:
    """The people this account is a trusted contact for.

    The mirror of /contacts. Someone can be on both sides at once — two
    friends who are both pregnant — so this is not an account type, just a
    list that happens to be empty for most people.
    """
    links = db.scalars(
        select(TrustedContact).where(TrustedContact.linked_user_id == user.id)
    ).all()

    out = []
    for contact in links:
        tasks = []
        if contact.can_see_shared_tasks:
            tasks = db.scalars(
                select(Task)
                .where(Task.assigned_contact_id == contact.id)
                .order_by(Task.due_date.is_(None), Task.due_date)
            ).all()
        unread = db.scalar(
            select(func.count())
            .select_from(ContactMessage)
            .where(
                ContactMessage.contact_id == contact.id,
                ContactMessage.sender == "user",
                ContactMessage.read_at.is_(None),
            )
        )
        out.append(
            HelpingOut(
                contact_id=contact.id,
                mother_name=contact.user.full_name,
                mother_username=contact.user.username,
                relationship=contact.relationship_label,
                can_see_tasks=contact.can_see_shared_tasks,
                tasks=[
                    PartnerTaskOut(
                        id=t.id,
                        title=t.title,
                        detail=t.detail or "",
                        due_date=t.due_date,
                        done=t.status == TaskStatus.complete,
                    )
                    for t in tasks
                ],
                unread=unread or 0,
            )
        )
    return out


def _theirs(db: DbSession, user: User, contact_id: str) -> TrustedContact:
    """A link where this signed-in account is the helper.

    Same 404-not-403 rule as everywhere else: an id that is not yours reads as
    an id that does not exist.
    """
    contact = db.get(TrustedContact, contact_id)
    if contact is None or contact.linked_user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such person")
    return contact


@router.get("/helping/{contact_id}/messages", response_model=list[ContactMessageOut])
def read_thread(contact_id: str, user: CurrentUser, db: DbSession) -> list[ContactMessageOut]:
    contact = _theirs(db, user, contact_id)
    for m in contact.messages:
        if m.sender == "user" and m.read_at is None:
            m.read_at = _now()
    db.commit()
    return [
        ContactMessageOut(id=m.id, body=m.body, sender=m.sender, created_at=m.created_at)
        for m in contact.messages
    ]


@router.post(
    "/helping/{contact_id}/messages",
    response_model=ContactMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def reply(
    contact_id: str, payload: ContactMessageIn, user: CurrentUser, db: DbSession
) -> ContactMessageOut:
    """The helper's side of the thread.

    Stored with sender "contact" — the same value the invite-link portal
    writes — so a contact who starts on a link and later signs in has one
    thread, not two.
    """
    contact = _theirs(db, user, contact_id)
    message = ContactMessage(
        contact_id=contact.id,
        user_id=contact.user_id,
        body=payload.body.strip(),
        sender="contact",
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return ContactMessageOut(
        id=message.id, body=message.body, sender=message.sender, created_at=message.created_at
    )


@router.post("/helping/{contact_id}/tasks/{task_id}/done", response_model=PartnerTaskOut)
def complete_task(
    contact_id: str, task_id: str, user: CurrentUser, db: DbSession
) -> PartnerTaskOut:
    """Mark a task she asked for as done.

    Only a task assigned to this link, and only when she has actually turned
    task sharing on: the permission says what may be seen, and something that
    may not be seen may not be completed either.
    """
    contact = _theirs(db, user, contact_id)
    if not contact.can_see_shared_tasks:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Task sharing is switched off")

    task = db.get(Task, task_id)
    if task is None or task.assigned_contact_id != contact.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such task")

    task.status = TaskStatus.complete
    db.commit()
    db.refresh(task)
    return PartnerTaskOut(
        id=task.id,
        title=task.title,
        detail=task.detail or "",
        due_date=task.due_date,
        done=True,
    )
