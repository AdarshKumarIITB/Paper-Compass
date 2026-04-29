"""auth and pdf storage

Revision ID: a1b2c3d4e5f6
Revises: 2859594b3330
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "2859594b3330"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users: identity columns for Google OAuth
    op.add_column("users", sa.Column("google_sub", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(length=320), nullable=True))
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("picture_url", sa.String(length=1024), nullable=True))
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # papers: extend status width + add workflow columns
    op.alter_column(
        "papers",
        "status",
        existing_type=sa.String(length=20),
        type_=sa.String(length=30),
        existing_nullable=False,
    )
    op.add_column(
        "papers",
        sa.Column("processing_step", sa.String(length=120), nullable=False, server_default=""),
    )
    op.add_column("papers", sa.Column("failure_reason", sa.String(length=500), nullable=True))

    # user_papers: timestamps for library ordering
    op.add_column(
        "user_papers",
        sa.Column(
            "viewed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.add_column(
        "user_papers",
        sa.Column(
            "last_interaction_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_user_papers_viewed_at", "user_papers", ["viewed_at"])

    # pdf_files: per-user PDF storage
    op.create_table(
        "pdf_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("paper_id", sa.Uuid(), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("bytes_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["paper_id"], ["papers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "paper_id", name="uq_pdf_files_user_paper"),
    )
    op.create_index("ix_pdf_files_user_id", "pdf_files", ["user_id"])
    op.create_index("ix_pdf_files_paper_id", "pdf_files", ["paper_id"])
    op.create_index("ix_pdf_files_sha256", "pdf_files", ["sha256"])


def downgrade() -> None:
    op.drop_index("ix_pdf_files_sha256", table_name="pdf_files")
    op.drop_index("ix_pdf_files_paper_id", table_name="pdf_files")
    op.drop_index("ix_pdf_files_user_id", table_name="pdf_files")
    op.drop_table("pdf_files")

    op.drop_index("ix_user_papers_viewed_at", table_name="user_papers")
    op.drop_column("user_papers", "last_interaction_at")
    op.drop_column("user_papers", "viewed_at")

    op.drop_column("papers", "failure_reason")
    op.drop_column("papers", "processing_step")
    op.alter_column(
        "papers",
        "status",
        existing_type=sa.String(length=30),
        type_=sa.String(length=20),
        existing_nullable=False,
    )

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "picture_url")
    op.drop_column("users", "name")
    op.drop_column("users", "email")
    op.drop_column("users", "google_sub")
