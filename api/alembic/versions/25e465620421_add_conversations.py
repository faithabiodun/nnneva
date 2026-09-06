"""add conversations

Revision ID: 25e465620421
Revises: 059f0f445da7
Create Date: 2026-09-06 12:10:17.039703

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25e465620421'
down_revision: Union[str, Sequence[str], None] = '059f0f445da7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Group agent runs into conversations.

    Existing runs are each given their own conversation rather than being
    lumped into one: they were separate exchanges when they happened, and
    inventing a thread between them would put words in the agent's mouth.
    """
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(120), nullable=False, server_default="New chat"),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])

    op.add_column(
        "agent_runs",
        sa.Column("conversation_id", sa.String(36), nullable=True),
    )
    op.create_foreign_key(
        "fk_agent_runs_conversation", "agent_runs", "conversations",
        ["conversation_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_agent_runs_conversation_id", "agent_runs", ["conversation_id"])

    # Backfill: one conversation per existing run, titled from its prompt.
    op.execute("""
        INSERT INTO conversations (id, user_id, title, last_message_at, created_at, updated_at)
        SELECT gen_random_uuid()::text, r.user_id,
               left(r.prompt, 80), r.created_at, r.created_at, r.created_at
        FROM agent_runs r
    """)
    op.execute("""
        UPDATE agent_runs r SET conversation_id = c.id
        FROM conversations c
        WHERE c.user_id = r.user_id
          AND c.created_at = r.created_at
          AND r.conversation_id IS NULL
    """)


def downgrade() -> None:
    op.drop_index("ix_agent_runs_conversation_id", table_name="agent_runs")
    op.drop_constraint("fk_agent_runs_conversation", "agent_runs", type_="foreignkey")
    op.drop_column("agent_runs", "conversation_id")
    op.drop_index("ix_conversations_user_id", table_name="conversations")
    op.drop_table("conversations")
