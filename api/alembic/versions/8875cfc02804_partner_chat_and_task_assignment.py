"""partner chat and task assignment

Revision ID: 8875cfc02804
Revises: 8c24faa299df
Create Date: 2026-09-06 12:24:41.718096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8875cfc02804'
down_revision: Union[str, Sequence[str], None] = '8c24faa299df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """A thread between the mother and her trusted contact, and tasks she can
    ask them to take on.

    The contact gets an access token rather than an account: asking a partner to
    sign up before they can help is a barrier, and an account would be a second
    place her data lives. Existing contacts get no token — a link nobody asked
    for should not start working retroactively.
    """
    op.add_column("trusted_contacts", sa.Column("access_token", sa.String(64), nullable=True))
    op.create_unique_constraint(
        "uq_trusted_contacts_access_token", "trusted_contacts", ["access_token"]
    )
    op.add_column(
        "trusted_contacts", sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "trusted_contacts", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True)
    )

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "contact_id", sa.String(36),
            sa.ForeignKey("trusted_contacts.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "user_id", sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("sender", sa.String(10), nullable=False, server_default="user"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index("ix_contact_messages_contact_id", "contact_messages", ["contact_id"])
    op.create_index("ix_contact_messages_user_id", "contact_messages", ["user_id"])

    op.add_column(
        "tasks", sa.Column("assigned_contact_id", sa.String(36), nullable=True)
    )
    op.create_foreign_key(
        "fk_tasks_assigned_contact", "tasks", "trusted_contacts",
        ["assigned_contact_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_tasks_assigned_contact_id", "tasks", ["assigned_contact_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_assigned_contact_id", table_name="tasks")
    op.drop_constraint("fk_tasks_assigned_contact", "tasks", type_="foreignkey")
    op.drop_column("tasks", "assigned_contact_id")

    op.drop_index("ix_contact_messages_user_id", table_name="contact_messages")
    op.drop_index("ix_contact_messages_contact_id", table_name="contact_messages")
    op.drop_table("contact_messages")

    op.drop_column("trusted_contacts", "accepted_at")
    op.drop_column("trusted_contacts", "invited_at")
    op.drop_constraint("uq_trusted_contacts_access_token", "trusted_contacts", type_="unique")
    op.drop_column("trusted_contacts", "access_token")
