"""Onboarding, which is a different set of questions for each kind of person.

Three roles, three flows, and deliberately no shared "and also" questions that
only apply to one of them. Someone supporting a friend has no due date and no
clinic; asking anyway and then treating the blanks as missing data is how a
product ends up nagging people for things they cannot give it.

What the three do have in common is the shape: ask only for what is needed,
say what each answer is for, and seed memory from the answers so the agent's
first run already has context (§02, §06).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import (
    ContactRequest,
    Memory,
    MemoryKind,
    PregnancyProfile,
    RequestKind,
    RequestStatus,
    TrustedContact,
    User,
    UserRole,
)
from app.schemas import OnboardingIn, ProfileOut
from app.routers.profile import profile_payload

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def complete_onboarding(payload: OnboardingIn, user: CurrentUser, db: DbSession) -> ProfileOut:
    # An account that reaches here without having answered the first-run
    # question is treated as expecting, which is what it was before the
    # question existed and what the migration assumed for older rows.
    role = user.role or UserRole.expecting
    if user.role is None:
        user.role = role

    if role is UserRole.supporter:
        _supporter(payload, user, db)
    else:
        _mother(payload, user, db, role)

    if payload.contact_window:
        user.contact_window = payload.contact_window

    db.commit()
    db.refresh(user)
    return profile_payload(user)


# ---- Someone expecting, or newly a parent ----------------------------------


def _mother(payload: OnboardingIn, user: User, db: DbSession, role: UserRole) -> None:
    """The care profile, anchored on whichever date the role implies."""
    expecting = role is UserRole.expecting

    if expecting and payload.due_date is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "A due date is needed to set this up."
        )
    if not expecting and payload.birth_date is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "A date of birth is needed to set this up.",
        )

    profile = user.profile or PregnancyProfile(user_id=user.id)
    # Only ever one of the two. Setting both would leave the week count
    # ambiguous, and clearing the other is what makes "I have given birth"
    # something an existing account could later say.
    profile.due_date = payload.due_date if expecting else None
    profile.birth_date = None if expecting else payload.birth_date
    profile.feeding = None if expecting else payload.feeding
    profile.care_location = payload.care_location
    profile.clinician = payload.clinician
    profile.help_areas = "\n".join(a.strip() for a in payload.help_areas if a.strip())
    db.add(profile)

    if payload.contact_name:
        contact = user.contacts[0] if user.contacts else TrustedContact(user_id=user.id, name="")
        contact.name = payload.contact_name.strip()
        contact.relationship_label = payload.contact_relationship or "Partner"
        contact.phone = (payload.contact_phone or "").strip() or None
        contact.email = (payload.contact_email or "").strip().lower() or None
        contact.can_see_shared_tasks = payload.contact_can_see_shared_tasks
        db.add(contact)

    db.flush()

    if expecting:
        anchor = (
            f"Due {payload.due_date:%-d %B %Y}. Currently {profile.gestational_week} weeks."
        )
    else:
        anchor = (
            f"Baby born {payload.birth_date:%-d %B %Y}. "
            f"Currently {profile.postnatal_week} weeks postpartum."
        )
    facts = [(MemoryKind.context, anchor)]

    if not expecting and payload.feeding:
        facts.append((MemoryKind.context, f"Feeding: {payload.feeding.lower()}."))
    if payload.care_location:
        facts.append((MemoryKind.context, f"Care at {payload.care_location}."))
    if payload.contact_name:
        facts.append((
            MemoryKind.preference,
            f"{payload.contact_name} is the trusted contact, permissions limited.",
        ))
    _remember(db, user, payload, facts)


# ---- Someone helping another person ----------------------------------------


def _supporter(payload: OnboardingIn, user: User, db: DbSession) -> None:
    """No care profile at all — they are not the one being cared for.

    The one thing this flow can do is put them in touch. A request from this
    side runs the opposite way to the usual one, and is still answered by the
    person being supported, so nothing is shared until she says yes.
    """
    facts: list[tuple[MemoryKind, str]] = []

    handle = (payload.supporting_username or "").strip().lower()
    if handle:
        other = db.scalars(select(User).where(User.username == handle)).first()
        # 404 for "no such handle" and for their own, exactly as /people does:
        # telling them apart would make this a way to test whether a handle
        # exists without signing in as anyone in particular.
        if other is None or other.id == user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No account with that username")

        already = db.scalars(
            select(ContactRequest).where(
                ContactRequest.requester_id == user.id,
                ContactRequest.addressee_id == other.id,
            )
        ).first()
        if already is None:
            db.add(
                ContactRequest(
                    requester_id=user.id,
                    addressee_id=other.id,
                    relationship_label=payload.contact_relationship or "Partner",
                    kind=RequestKind.to_help,
                )
            )
        elif already.status is not RequestStatus.pending:
            already.status = RequestStatus.pending
            already.kind = RequestKind.to_help
            already.responded_at = None

        facts.append((
            MemoryKind.preference,
            f"Supporting @{other.username} as their "
            f"{(payload.contact_relationship or 'partner').lower()}.",
        ))

    _remember(db, user, payload, facts)


def _remember(db: DbSession, user: User, payload: OnboardingIn, facts: list) -> None:
    """Seed memory so the agent's first run never asks for what was just typed."""
    if payload.contact_window:
        facts.append(
            (MemoryKind.preference, f"Prefers contact: {payload.contact_window.lower()}.")
        )
    for kind, fact in facts:
        db.add(Memory(user_id=user.id, kind=kind, fact=fact, source="From onboarding"))
