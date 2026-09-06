"""Usernames: the handle one person types to find another.

Deliberately not the email address. Searching by email would mean anyone who
already has someone's address can confirm they use a maternity app, which is
more than a search box should ever reveal. A handle is something you choose to
share.

Every account gets one at sign-up rather than being asked for one, because the
Google route has no form to ask in and an account without a handle would be
invisible to the very feature the handle exists for.
"""

from __future__ import annotations

import re

MIN_LENGTH = 3
MAX_LENGTH = 30

# Lowercase, digits, underscore and a single interior dot run. No leading or
# trailing punctuation, so a handle cannot be confused with a filename or made
# to look like another by a trailing dot.
VALID = re.compile(rf"^[a-z0-9](?:[a-z0-9_.]{{{MIN_LENGTH - 2},{MAX_LENGTH - 2}}})[a-z0-9]$")

# Names the product itself needs, or that would let someone impersonate it.
RESERVED = {
    "admin", "administrator", "api", "help", "helping", "me", "nnneva",
    "root", "settings", "support", "system", "you",
}


def is_valid(username: str) -> bool:
    return bool(VALID.match(username or "")) and username not in RESERVED


def problem(username: str) -> str | None:
    """Why this handle cannot be used, phrased for the person choosing it."""
    handle = (username or "").strip()
    if len(handle) < MIN_LENGTH:
        return f"Usernames are at least {MIN_LENGTH} characters."
    if len(handle) > MAX_LENGTH:
        return f"Usernames are at most {MAX_LENGTH} characters."
    if handle != handle.lower():
        return "Usernames are lowercase."
    if handle in RESERVED:
        return "That username is reserved."
    if not VALID.match(handle):
        return (
            "Usernames can use letters, numbers, dots and underscores, and must "
            "start and end with a letter or number."
        )
    return None


def seed_from(full_name: str, email: str) -> str:
    """A first guess at a handle, from whatever the sign-up actually supplied.

    Google sign-in gives a name and an email and nothing else, so both are
    tried before falling back to something generic rather than refusing to
    create the account.
    """
    for source in (full_name, email.split("@")[0] if email else ""):
        candidate = re.sub(r"[^a-z0-9]+", "", (source or "").lower())[:MAX_LENGTH]
        if len(candidate) >= MIN_LENGTH:
            return candidate
    return "member"


def allocate(seed: str, taken: set[str]) -> str:
    """`seed`, or the first numbered variant of it that is free.

    Callers pass the handles already in use rather than a database session, so
    this stays a pure function and the backfill and the sign-up path can share
    it.
    """
    base = seed[:MAX_LENGTH]
    if base not in taken and is_valid(base):
        return base
    for n in range(2, 10_000):
        suffix = str(n)
        candidate = f"{base[: MAX_LENGTH - len(suffix)]}{suffix}"
        if candidate not in taken and is_valid(candidate):
            return candidate
    raise RuntimeError(f"No free username near {seed!r}")


def allocate_username(db, full_name: str, email: str) -> str:
    """A free handle for a new account.

    Reads the handles that could collide rather than every handle in the
    table: the candidates are the seed and its numbered variants, so only rows
    starting with the seed can matter.
    """
    from sqlalchemy import select

    from app.models import User

    seed = seed_from(full_name, email)
    taken = set(
        db.scalars(select(User.username).where(User.username.like(f"{seed}%"))).all()
    )
    return allocate(seed, taken)
