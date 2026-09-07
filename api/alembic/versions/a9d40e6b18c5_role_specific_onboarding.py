"""role specific onboarding

Revision ID: a9d40e6b18c5
Revises: f1a63d92c07b
Create Date: 2026-09-06 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9d40e6b18c5'
down_revision: Union[str, Sequence[str], None] = 'f1a63d92c07b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Let a care profile anchor on a birth rather than a due date.

    due_date becomes nullable so a postpartum profile can exist without one.
    Every existing row has one, so nothing is lost by relaxing it — and the
    route still requires it from anyone who says they are expecting.

    Requests also gain a direction. A supporter signing up asks to help, which
    arrives the opposite way round from the mother asking for help; both are
    accepted by the mother, so both are safe, but the row has to remember
    which way it ran to know whose account the contact belongs under.
    """
    op.alter_column("pregnancy_profiles", "due_date", existing_type=sa.Date(), nullable=True)
    op.add_column("pregnancy_profiles", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column(
        "pregnancy_profiles", sa.Column("feeding", sa.String(length=40), nullable=True)
    )

    kind = sa.Enum("for_help", "to_help", name="request_kind")
    kind.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "contact_requests",
        sa.Column("kind", kind, nullable=False, server_default="for_help"),
    )
    op.alter_column("contact_requests", "kind", server_default=None)


def downgrade() -> None:
    op.drop_column("contact_requests", "kind")
    sa.Enum(name="request_kind").drop(op.get_bind(), checkfirst=True)

    op.drop_column("pregnancy_profiles", "feeding")
    op.drop_column("pregnancy_profiles", "birth_date")
    # Rows with no due date cannot survive the column becoming required again.
    op.execute("DELETE FROM pregnancy_profiles WHERE due_date IS NULL")
    op.alter_column("pregnancy_profiles", "due_date", existing_type=sa.Date(), nullable=False)
