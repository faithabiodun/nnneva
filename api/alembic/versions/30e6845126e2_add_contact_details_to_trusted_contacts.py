"""add contact details to trusted contacts

Revision ID: 30e6845126e2
Revises: 8589b5703895
Create Date: 2026-09-05 20:19:13.519133

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30e6845126e2'
down_revision: Union[str, Sequence[str], None] = '8589b5703895'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Give a trusted contact a phone number and an email address.

    Both nullable: a contact is useful for sharing inside the app before any
    channel is known, and asking for a phone number before it is needed would
    collect more than the product promises to.
    """
    op.add_column("trusted_contacts", sa.Column("phone", sa.String(40), nullable=True))
    op.add_column("trusted_contacts", sa.Column("email", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("trusted_contacts", "email")
    op.drop_column("trusted_contacts", "phone")
