"""add visual quality columns to evaluations and visuals

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-27 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # evaluations: track method_visual quality
    op.add_column(
        "evaluations",
        sa.Column("method_visual_quality_score", sa.Integer(), nullable=True),
    )
    op.add_column(
        "evaluations",
        sa.Column(
            "method_visual_iterations",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "evaluations",
        sa.Column(
            "method_visual_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # visuals: same trio
    op.add_column("visuals", sa.Column("quality_score", sa.Integer(), nullable=True))
    op.add_column(
        "visuals",
        sa.Column("iterations", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "visuals",
        sa.Column(
            "approved", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )


def downgrade() -> None:
    op.drop_column("visuals", "approved")
    op.drop_column("visuals", "iterations")
    op.drop_column("visuals", "quality_score")
    op.drop_column("evaluations", "method_visual_approved")
    op.drop_column("evaluations", "method_visual_iterations")
    op.drop_column("evaluations", "method_visual_quality_score")
