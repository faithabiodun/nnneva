"""Profile, preferences and the trusted contact's permissions."""

from __future__ import annotations

from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.models import Memory, MemoryKind, PregnancyProfile, User
from app.schemas import ProfileOut, ProfilePatch

router = APIRouter(prefix="/profile", tags=["profile"])

NOTIFICATION_FIELDS = {
    "approvals": "notify_approvals",
    "deadlines": "notify_deadlines",
    "daily_summary": "notify_daily_summary",
    "safety": "notify_safety",
}

CONTACT_PERMISSIONS = {
    "shared_tasks": "can_see_shared_tasks",
    "appointments": "can_see_appointments",
    "forwarded_reminders": "can_get_forwarded_reminders",
    "test_results": "can_see_test_results",
}


def profile_payload(user: User) -> ProfileOut:
    profile = user.profile
    contact = user.contacts[0] if user.contacts else None
    return ProfileOut(
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        due_date=profile.due_date if profile else None,
        gestational_week=profile.gestational_week if profile else None,
        trimester=profile.trimester if profile else None,
        care_location=profile.care_location if profile else None,
        clinician=profile.clinician if profile else None,
        help_areas=[a for a in (profile.help_areas.splitlines() if profile else []) if a],
        contact_window=user.contact_window,
        retention=user.retention,
        notifications={key: getattr(user, field) for key, field in NOTIFICATION_FIELDS.items()},
        trusted_contact=(
            {
                "name": contact.name,
                "relationship": contact.relationship_label,
                "phone": contact.phone,
                "email": contact.email,
                "permissions": {
                    key: getattr(contact, field) for key, field in CONTACT_PERMISSIONS.items()
                },
            }
            if contact
            else None
        ),
        onboarded=profile is not None,
    )


@router.get("", response_model=ProfileOut)
def read_profile(user: CurrentUser) -> ProfileOut:
    return profile_payload(user)


@router.patch("", response_model=ProfileOut)
def update_profile(payload: ProfilePatch, user: CurrentUser, db: DbSession) -> ProfileOut:
    for field in ("full_name", "phone", "contact_window", "retention"):
        value = getattr(payload, field)
        if value is not None:
            setattr(user, field, value)

    # The pregnancy context. A due date is the one field that can bring the
    # profile into existence: everything else describes a pregnancy, so without
    # it there is nothing to attach them to.
    if user.profile is None and payload.due_date is not None:
        user.profile = PregnancyProfile(user_id=user.id, due_date=payload.due_date)
        db.add(user.profile)
        # Same seed as onboarding, so the agent starts with context however the
        # context arrived.
        db.add(Memory(
            user_id=user.id, kind=MemoryKind.context,
            fact=f"Due {payload.due_date:%-d %B %Y}.",
            source="From profile",
        ))

    if user.profile:
        if payload.due_date is not None:
            user.profile.due_date = payload.due_date
        if payload.care_location is not None:
            user.profile.care_location = payload.care_location
        if payload.clinician is not None:
            user.profile.clinician = payload.clinician
        if payload.help_areas is not None:
            user.profile.help_areas = "\n".join(
                a.strip() for a in payload.help_areas if a.strip()
            )

    for key, value in (payload.notifications or {}).items():
        if key in NOTIFICATION_FIELDS:
            setattr(user, NOTIFICATION_FIELDS[key], bool(value))

    if payload.trusted_contact_permissions and user.contacts:
        contact = user.contacts[0]
        for key, value in payload.trusted_contact_permissions.items():
            if key in CONTACT_PERMISSIONS:
                setattr(contact, CONTACT_PERMISSIONS[key], bool(value))

    db.commit()
    db.refresh(user)
    return profile_payload(user)
