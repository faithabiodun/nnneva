"""record why a run fell back

Revision ID: f1a63d92c07b
Revises: e5c8a1b430f7
Create Date: 2026-09-06 20:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a63d92c07b'
down_revision: Union[str, Sequence[str], None] = 'e5c8a1b430f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """A short note on a run that did something other than what was configured.

    Today that means every model provider failed and the deterministic planner
    answered instead — which the reader deserves to be told, quietly, rather
    than being shown a red error for something that still did the work.
    """
    op.add_column("agent_runs", sa.Column("notice", sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column("agent_runs", "notice")
