"""ask who the person is

Revision ID: e5c8a1b430f7
Revises: d7b2f9c14e08
Create Date: 2026-09-06 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5c8a1b430f7'
down_revision: Union[str, Sequence[str], None] = 'd7b2f9c14e08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Whether someone is expecting, has given birth, or is supporting another.

    Nullable, and null is meaningful: it is what sends a new account to the
    first-run step. Existing accounts are marked `expecting` rather than left
    null — every one of them signed up through a flow that asked for a due
    date, so the answer is already known, and asking again would be a
    first-run screen shown to someone on their fiftieth run.
    """
    role = sa.Enum("expecting", "postpartum", "supporter", name="user_role")
    role.create(op.get_bind(), checkfirst=True)
    op.add_column("users", sa.Column("role", role, nullable=True))
    op.execute("UPDATE users SET role = 'expecting'")


def downgrade() -> None:
    op.drop_column("users", "role")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
