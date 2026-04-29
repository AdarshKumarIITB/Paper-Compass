"""add match verdict columns to papers and user_papers

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-26 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("papers", sa.Column("match_verdict", sa.String(length=20), nullable=True))
    op.add_column("papers", sa.Column("match_reason", sa.String(length=240), nullable=True))
    op.add_column(
        "user_papers",
        sa.Column("match_acknowledged_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_papers", "match_acknowledged_at")
    op.drop_column("papers", "match_reason")
    op.drop_column("papers", "match_verdict")
