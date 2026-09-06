"""drop the avatar column

Revision ID: c3e1a05d7f42
Revises: b1f4c07a92de
Create Date: 2026-09-06 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e1a05d7f42'
down_revision: Union[str, Sequence[str], None] = 'b1f4c07a92de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """The drawn avatars are gone; the profile shows an initial instead."""
    op.drop_column("users", "avatar")


def downgrade() -> None:
    op.add_column("users", sa.Column("avatar", sa.String(length=20), nullable=True))
