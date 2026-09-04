"""Lock the public schema down from the anon and authenticated roles.

Managed Postgres from Supabase ships `anon` and `authenticated` roles with full
privileges on everything in `public`, so PostgREST can serve tables directly to
browsers holding the publishable key. Nnneva does not use PostgREST — the API
connects as the owning role through SQLAlchemy — so those grants are exposure
with no upside. Left alone, anyone with the anon key could read every bcrypt
hash, pregnancy profile and safety event, and TRUNCATE the tables.

`postgres` owns every table and owners bypass RLS (FORCE is deliberately not
set), so none of this touches the application.

Both roles are Supabase-specific. On a plain Postgres they do not exist, and
this migration is a no-op rather than an error.

Revision ID: 3a1810805e49
Revises: 6448b44d381c
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3a1810805e49"
down_revision: str | Sequence[str] | None = "6448b44d381c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MANAGED_ROLES = ("anon", "authenticated")


def _present(connection: sa.engine.Connection) -> list[str]:
    """The managed roles this database actually has."""
    rows = connection.execute(
        sa.text("SELECT rolname FROM pg_roles WHERE rolname = ANY(:names)"),
        {"names": list(MANAGED_ROLES)},
    )
    return [r[0] for r in rows]


def upgrade() -> None:
    connection = op.get_bind()

    # Defence in depth, and it applies everywhere: if a grant is ever restored,
    # no policy still means no access for any role that does not own the table.
    # This runs whether or not the managed roles exist.
    for table in _tables(connection):
        connection.execute(sa.text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY'))

    roles = _present(connection)
    if not roles:
        return

    targets = ", ".join(roles)
    for statement in (
        f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {targets}",
        f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {targets}",
        f"REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM {targets}",
        # Stops a later migration silently re-exposing new tables.
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM {targets}",
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM {targets}",
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM {targets}",
    ):
        connection.execute(sa.text(statement))


def downgrade() -> None:
    """Restores Supabase's defaults.

    Deliberately reopens the tables to the anon key, so only run this if you
    have decided to serve them through PostgREST after all.
    """
    connection = op.get_bind()
    roles = _present(connection)

    for table in _tables(connection):
        connection.execute(sa.text(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY'))

    if roles:
        targets = ", ".join(roles)
        for statement in (
            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {targets}",
            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {targets}",
            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO {targets}",
            f"GRANT ALL ON ALL TABLES IN SCHEMA public TO {targets}",
            f"GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO {targets}",
            f"GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO {targets}",
        ):
            connection.execute(sa.text(statement))


def _tables(connection: sa.engine.Connection) -> list[str]:
    rows = connection.execute(
        sa.text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    )
    return [r[0] for r in rows]
