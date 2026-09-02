"""Demo data.

    python -m app.seed

Creates one user with a realistic pregnancy in progress, then runs the agent
over the blueprint's core message so the app opens on a story rather than on
empty screens. Safe to re-run: it clears the demo user first and leaves any
other account alone.
"""

from __future__ import annotations

import sys
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select

from app.agent.runner import run_agent
from app.db import SessionLocal
from app.models import Appointment, AppointmentQuestion, TrustedContact, User
from app.models import Memory, MemoryKind, PregnancyProfile
from app.security import hash_password

EMAIL = "faith@example.com"
PASSWORD = "nnneva-demo-2026"

GOAL = (
    "I have an antenatal appointment on Thursday. I need to prepare questions, "
    "get my blood test done, and remember everything I need. Can you send the "
    "blood test reminder to my partner Chidi as well?"
)


def seed() -> None:
    db = SessionLocal()

    existing = db.scalars(select(User).where(User.email == EMAIL)).first()
    if existing:
        db.delete(existing)
        db.commit()

    user = User(
        email=EMAIL,
        full_name="Faith Adeyemi",
        phone="+234 803 555 0142",
        password_hash=hash_password(PASSWORD),
        contact_window="Evenings, after 18:00",
    )
    db.add(user)
    db.flush()

    # 32 weeks today, so the story matches the screens' copy.
    due = date.today() + timedelta(weeks=8)
    db.add(
        PregnancyProfile(
            user_id=user.id,
            due_date=due,
            care_location="Lagoon Antenatal Clinic, Victoria Island",
            clinician="Midwife Grace Okonkwo",
            help_areas="Appointments and preparation\nTests and results",
        )
    )
    db.add(
        TrustedContact(
            user_id=user.id,
            name="Chidi Adeyemi",
            relationship_label="Partner",
            can_see_shared_tasks=True,
            can_get_forwarded_reminders=True,
        )
    )

    for kind, fact, source in [
        (MemoryKind.context, f"Due {due:%-d %B %Y}. Currently 32 weeks.", "From onboarding"),
        (MemoryKind.context, "Care at Lagoon Antenatal Clinic, Victoria Island.", "From onboarding"),
        (MemoryKind.context, "Midwife Grace Okonkwo is the usual clinician.",
         "From appointment record"),
        (MemoryKind.preference, "Prefers reminders in the evening, not before 08:00.",
         "From your message"),
        (MemoryKind.preference, "Does not want daily baby-size updates.", "From settings"),
        (MemoryKind.preference, "Travels to the clinic by ride-hailing, needs 40 minutes.",
         "From your message"),
        (MemoryKind.preference, "Chidi is the trusted contact, permissions limited.",
         "From onboarding"),
        (MemoryKind.decision, "Hospital bag target date moved to week 35.", "From your message"),
    ]:
        db.add(Memory(user_id=user.id, kind=kind, fact=fact, source=source))

    # The next visit, plus two past ones so the history is not empty.
    next_thursday = _next_weekday(3)
    upcoming = Appointment(
        user_id=user.id,
        title="Antenatal review",
        starts_at=datetime.combine(next_thursday, time(9, 30), tzinfo=timezone.utc),
        location="Lagoon Antenatal Clinic, Victoria Island",
        clinician="Grace Okonkwo",
    )
    db.add(upcoming)
    db.flush()
    for i, (text, source) in enumerate(
        [
            ("Is my blood pressure still in the normal range for 32 weeks?", "From last visit"),
            ("Can we go through the birth plan at the next visit?", "From last visit"),
        ]
    ):
        db.add(
            AppointmentQuestion(
                appointment_id=upcoming.id, text=text, source=source, position=i
            )
        )

    for days_ago, title, clinician in [
        (19, "Antenatal review", "Grace Okonkwo"),
        (33, "Glucose tolerance test", "Lagoon Lab"),
        (47, "Growth scan", "Dr Bello"),
    ]:
        db.add(
            Appointment(
                user_id=user.id,
                title=title,
                starts_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
                location="Lagoon Antenatal Clinic, Victoria Island",
                clinician=clinician,
                attended=True,
            )
        )

    db.commit()
    db.refresh(user)

    # One real agent run, so activity, tasks, plans and the pending approval all
    # exist as the product produced them rather than as fixtures.
    outcome = run_agent(db, user, GOAL)

    print(f"Seeded {user.full_name} <{EMAIL}> — password: {PASSWORD}")
    print(f"  engine        {outcome.run.engine}")
    print(f"  run status    {outcome.run.status.value}")
    print(f"  tool actions  {len(outcome.run.actions)}")
    print(f"  tasks         {len(user.tasks)}")
    print(f"  next visit    {upcoming.starts_at:%A %-d %B, %H:%M}")
    db.close()


def _next_weekday(index: int) -> date:
    today = date.today()
    return today + timedelta(days=((index - today.weekday()) % 7) or 7)


if __name__ == "__main__":
    try:
        seed()
    except Exception as exc:  # noqa: BLE001 — a seed failure should read plainly
        print(f"Seed failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
