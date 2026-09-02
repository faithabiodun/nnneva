"""Test fixtures.

Tests run against a real PostgreSQL database (TEST_DATABASE_URL, defaulting to
`nnneva_test`) rather than SQLite, because the app uses Postgres enums and
`nulls_last` ordering — an in-memory stand-in would pass tests the real
deployment fails.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

TEST_URL = os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+psycopg://nnneva:nnneva@localhost:5432/nnneva_test",
    ),
)
# Bedrock is never called from tests; the deterministic planner is the thing
# under test, and it is the code path a fresh clone runs anyway.
os.environ["AWS_ACCESS_KEY_ID"] = ""
os.environ["AWS_SECRET_ACCESS_KEY"] = ""
os.environ["SECRET_KEY"] = "test-only-key-long-enough-for-hmac-sha256-signing"

from app.config import get_settings  # noqa: E402
from app.db import Base, get_session  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Appointment, TrustedContact  # noqa: E402

get_settings.cache_clear()

engine = create_engine(TEST_URL, future=True)
TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db(schema):
    session = TestSession()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def clean(schema):
    """Empty every table between tests so one run cannot colour the next."""
    with engine.begin() as conn:
        tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def client(schema):
    def override():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def signed_up(client):
    """A registered, onboarded user with an appointment two days out."""
    r = client.post(
        "/auth/signup",
        json={"full_name": "Faith Adeyemi", "email": "faith@example.com", "password": "hunter2hunter2"},
    )
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    due = (datetime.now(timezone.utc) + timedelta(weeks=8)).date()
    r = client.post(
        "/onboarding",
        headers=headers,
        json={
            "due_date": due.isoformat(),
            "care_location": "Lagoon Antenatal Clinic",
            "clinician": "Midwife Grace Okonkwo",
            "help_areas": ["Appointments and preparation", "Tests and results"],
            "contact_name": "Chidi Adeyemi",
            "contact_relationship": "Partner",
            "contact_can_see_shared_tasks": True,
            "contact_window": "Evenings, after 18:00",
        },
    )
    assert r.status_code == 201, r.text

    session = TestSession()
    user_id = session.execute(text("SELECT id FROM users LIMIT 1")).scalar_one()
    session.add(
        Appointment(
            user_id=user_id,
            title="Antenatal review",
            starts_at=datetime.now(timezone.utc) + timedelta(days=2),
            location="Lagoon Antenatal Clinic, Victoria Island",
            clinician="Grace Okonkwo",
        )
    )
    session.commit()
    session.close()

    return headers
