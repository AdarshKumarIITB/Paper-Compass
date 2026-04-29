import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(30), default="user_upload")
    semantic_scholar_id: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(Text)
    authors: Mapped[dict] = mapped_column(JSONB, default=list)
    year: Mapped[int] = mapped_column(Integer)
    venue: Mapped[str] = mapped_column(String(255), default="")
    abstract: Mapped[str] = mapped_column(Text, default="")
    # Workflow status: discovered | fetching_pdf | awaiting_upload | parsing |
    #                  awaiting_confirmation | summarizing | ready | failed
    status: Mapped[str] = mapped_column(String(30), default="discovered")
    processing_step: Mapped[str] = mapped_column(String(120), default="")
    failure_reason: Mapped[str | None] = mapped_column(String(500))
    # Topic-relevance verdict from the relevance agent (set after GROBID parse).
    # match | mismatch | uncertain | NULL (not checked yet)
    match_verdict: Mapped[str | None] = mapped_column(String(20))
    match_reason: Mapped[str | None] = mapped_column(String(240))
    citation_count: Mapped[int] = mapped_column(Integer, default=0)
    influential_citation_count: Mapped[int] = mapped_column(Integer, default=0)
    contribution_summary: Mapped[str] = mapped_column(Text, default="")
    source_query: Mapped[str | None] = mapped_column(Text)
    open_access_pdf_url: Mapped[str | None] = mapped_column(Text)
    raw_pdf_stored: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class UserPaper(Base):
    __tablename__ = "user_papers"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="discovered")
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    last_interaction_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    # Set when this user explicitly clicked "Use this anyway" past a mismatch banner.
    match_acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CitedPaper(Base):
    __tablename__ = "cited_papers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    citing_paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"))
    semantic_scholar_id: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(Text)
    authors: Mapped[dict] = mapped_column(JSONB, default=list)
    year: Mapped[int | None] = mapped_column(Integer)
    micro_evaluation: Mapped[str | None] = mapped_column(Text)


class PdfFile(Base):
    __tablename__ = "pdf_files"
    __table_args__ = (UniqueConstraint("user_id", "paper_id", name="uq_pdf_files_user_paper"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    # source: fetched_open_access | user_uploaded
    source: Mapped[str] = mapped_column(String(30))
    storage_path: Mapped[str] = mapped_column(Text)
    bytes_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
