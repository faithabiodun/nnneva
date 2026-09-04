"""allow accounts with no password for google sign in

Revision ID: 8589b5703895
Revises: 3a1810805e49
Create Date: 2026-09-04 20:43:21.824320

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8589b5703895'
down_revision: Union[str, Sequence[str], None] = '3a1810805e49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Let users.password_hash be NULL.

    An account created through Google sign-in never has a password. Storing a
    placeholder hash instead would be worse: it would be a real bcrypt hash of
    some known string, and anyone who learned that string could log into every
    Google account through the password form. NULL cannot be verified against
    at all — app/security.py returns False before reaching bcrypt.
    """
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    # Rows with no password cannot satisfy a NOT NULL constraint and there is no
    # honest value to invent for them, so they are removed. Cascades take their
    # profiles, tasks and history with them.
    op.execute("DELETE FROM users WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
