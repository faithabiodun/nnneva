"""record when the welcome tour was seen

Revision ID: 8c24faa299df
Revises: 25e465620421
Create Date: 2026-09-06 12:19:18.503208

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c24faa299df'
down_revision: Union[str, Sequence[str], None] = '25e465620421'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remember that someone has already been shown around.

    Existing accounts are marked as having seen it. They have been using the
    app for a while; opening a "welcome, here is how this works" tour in front
    of them would be worse than never showing it at all.
    """
    op.add_column(
        "users", sa.Column("tour_seen_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.execute("UPDATE users SET tour_seen_at = now()")


def downgrade() -> None:
    op.drop_column("users", "tour_seen_at")
