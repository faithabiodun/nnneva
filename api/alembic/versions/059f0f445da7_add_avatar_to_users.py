"""add avatar to users

Revision ID: 059f0f445da7
Revises: 30e6845126e2
Create Date: 2026-09-06 12:03:12.406250

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '059f0f445da7'
down_revision: Union[str, Sequence[str], None] = '30e6845126e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """A chosen avatar, stored as a key rather than an uploaded image.

    Nullable: no avatar means the initial, which is what every account starts
    with and a perfectly good answer.
    """
    op.add_column("users", sa.Column("avatar", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar")
