"""thread types: user_id, thread_type, selected_text + nullable term/section_id

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("threads", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_threads_user_id",
        "threads",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_threads_user_id", "threads", ["user_id"])

    op.add_column(
        "threads",
        sa.Column("thread_type", sa.String(length=10), nullable=False, server_default="term"),
    )
    op.create_index("ix_threads_thread_type", "threads", ["thread_type"])

    op.add_column("threads", sa.Column("selected_text", sa.Text(), nullable=True))

    # Loosen NOT NULL on term + section_id (paper threads have neither).
    op.alter_column("threads", "term", existing_type=sa.Text(), nullable=True)
    op.alter_column("threads", "section_id", existing_type=sa.Uuid(), nullable=True)

    # Per-user-paper uniqueness for copilot threads only.
    op.create_index(
        "ux_threads_paper_copilot_per_user",
        "threads",
        ["user_id", "paper_id"],
        unique=True,
        postgresql_where=sa.text("thread_type = 'paper'"),
    )


def downgrade() -> None:
    op.drop_index("ux_threads_paper_copilot_per_user", table_name="threads")
    op.alter_column("threads", "section_id", existing_type=sa.Uuid(), nullable=False)
    op.alter_column("threads", "term", existing_type=sa.Text(), nullable=False)
    op.drop_column("threads", "selected_text")
    op.drop_index("ix_threads_thread_type", table_name="threads")
    op.drop_column("threads", "thread_type")
    op.drop_index("ix_threads_user_id", table_name="threads")
    op.drop_constraint("fk_threads_user_id", "threads", type_="foreignkey")
    op.drop_column("threads", "user_id")
