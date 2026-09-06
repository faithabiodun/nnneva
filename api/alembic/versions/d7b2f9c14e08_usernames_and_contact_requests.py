"""usernames and contact requests

Revision ID: d7b2f9c14e08
Revises: c3e1a05d7f42
Create Date: 2026-09-06 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7b2f9c14e08'
down_revision: Union[str, Sequence[str], None] = 'c3e1a05d7f42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Give every account a handle, and add the request that precedes a link.

    The column arrives nullable so existing rows can be filled in before the
    NOT NULL lands — an account with no handle would be invisible to search,
    which is the one thing the handle exists for.

    Backfilling in SQL rather than in Python keeps it to one statement and
    inside the migration's transaction. The seed is the full name stripped to
    letters and digits, falling back to the email's local part — the same
    order app/usernames.py uses, so a backfilled account and one created a
    minute later get handles by the same rule. A collision takes a numeric
    suffix from the row's position in its group, so two people called Ada get
    `ada` and `ada2` in a stable order rather than one of them failing.
    """
    op.add_column("users", sa.Column("username", sa.String(length=30), nullable=True))

    op.execute(
        """
        WITH seeds AS (
            SELECT
                id,
                created_at,
                LEFT(REGEXP_REPLACE(LOWER(full_name), '[^a-z0-9]', '', 'g'), 30) AS from_name,
                LEFT(REGEXP_REPLACE(LOWER(SPLIT_PART(email, '@', 1)),
                                    '[^a-z0-9]', '', 'g'), 30) AS from_email
            FROM users
        ),
        chosen AS (
            SELECT
                id,
                created_at,
                CASE
                    WHEN LENGTH(from_name) >= 3 THEN from_name
                    WHEN LENGTH(from_email) >= 3 THEN from_email
                    ELSE 'member'
                END AS seed
            FROM seeds
        ),
        numbered AS (
            SELECT
                id,
                seed,
                ROW_NUMBER() OVER (PARTITION BY seed ORDER BY created_at, id) AS n
            FROM chosen
        )
        UPDATE users
        SET username = CASE
            WHEN numbered.n = 1 THEN numbered.seed
            ELSE LEFT(numbered.seed, 30 - LENGTH(numbered.n::text)) || numbered.n::text
        END
        FROM numbered
        WHERE users.id = numbered.id
        """
    )
    # Anything the rule above could not make at least three characters long —
    # an email like a@b.com — falls back to the row's own id, which is unique
    # by construction and can be changed in the profile afterwards.
    op.execute(
        "UPDATE users SET username = 'member' || LEFT(REPLACE(id, '-', ''), 8) "
        "WHERE username IS NULL OR LENGTH(username) < 3"
    )

    op.alter_column("users", "username", nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.add_column(
        "trusted_contacts",
        sa.Column("linked_user_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_trusted_contacts_linked_user",
        "trusted_contacts",
        "users",
        ["linked_user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_trusted_contacts_linked_user_id", "trusted_contacts", ["linked_user_id"]
    )

    op.create_table(
        "contact_requests",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("requester_id", sa.String(length=36), nullable=False),
        sa.Column("addressee_id", sa.String(length=36), nullable=False),
        sa.Column("relationship_label", sa.String(length=60), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "accepted", "declined", name="request_status"),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["addressee_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("requester_id", "addressee_id", name="uq_contact_request_pair"),
    )
    op.create_index("ix_contact_requests_requester_id", "contact_requests", ["requester_id"])
    op.create_index("ix_contact_requests_addressee_id", "contact_requests", ["addressee_id"])


def downgrade() -> None:
    op.drop_index("ix_contact_requests_addressee_id", table_name="contact_requests")
    op.drop_index("ix_contact_requests_requester_id", table_name="contact_requests")
    op.drop_table("contact_requests")
    sa.Enum(name="request_status").drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_trusted_contacts_linked_user_id", table_name="trusted_contacts")
    op.drop_constraint("fk_trusted_contacts_linked_user", "trusted_contacts", type_="foreignkey")
    op.drop_column("trusted_contacts", "linked_user_id")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")
