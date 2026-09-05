"""The five onboarding answers (§06)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.deps import CurrentUser, DbSession
from app.models import Memory, MemoryKind, PregnancyProfile, TrustedContact
from app.schemas import OnboardingIn, ProfileOut
from app.routers.profile import profile_payload

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def complete_onboarding(payload: OnboardingIn, user: CurrentUser, db: DbSession) -> ProfileOut:
    profile = user.profile or PregnancyProfile(user_id=user.id, due_date=payload.due_date)
    profile.due_date = payload.due_date
    profile.care_location = payload.care_location
    profile.clinician = payload.clinician
    profile.help_areas = "\n".join(a.strip() for a in payload.help_areas if a.strip())
    db.add(profile)

    if payload.contact_window:
        user.contact_window = payload.contact_window

    if payload.contact_name:
        contact = user.contacts[0] if user.contacts else TrustedContact(user_id=user.id, name="")
        contact.name = payload.contact_name.strip()
        contact.relationship_label = payload.contact_relationship or "Partner"
        contact.phone = (payload.contact_phone or "").strip() or None
        contact.email = (payload.contact_email or "").strip().lower() or None
        contact.can_see_shared_tasks = payload.contact_can_see_shared_tasks
        db.add(contact)

    # Seed memory from onboarding so the agent's first run already has context
    # and never asks for something the user has just typed (§02).
    db.flush()
    facts = [
        (MemoryKind.context, f"Due {payload.due_date:%-d %B %Y}. Currently "
                             f"{profile.gestational_week} weeks."),
    ]
    if payload.care_location:
        facts.append((MemoryKind.context, f"Care at {payload.care_location}."))
    if payload.contact_name:
        facts.append((
            MemoryKind.preference,
            f"{payload.contact_name} is the trusted contact, permissions limited.",
        ))
    if payload.contact_window:
        facts.append((MemoryKind.preference, f"Prefers contact: {payload.contact_window.lower()}."))
    for kind, fact in facts:
        db.add(Memory(user_id=user.id, kind=kind, fact=fact, source="From onboarding"))

    db.commit()
    db.refresh(user)
    return profile_payload(user)
