"""drop the welcome tour column

Revision ID: b1f4c07a92de
Revises: 8875cfc02804
Create Date: 2026-09-06 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f4c07a92de'
down_revision: Union[str, Sequence[str], None] = '8875cfc02804'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """The welcome walkthrough is gone, so nothing reads this any more.

    Rather than editing 8c24faa299df, which is already applied in production,
    this undoes it forward: the column is added and then dropped, and both the
    old and the new database end up in the same shape.
    """
    op.drop_column("users", "tour_seen_at")


def downgrade() -> None:
    op.add_column(
        "users", sa.Column("tour_seen_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.execute("UPDATE users SET tour_seen_at = now()")
