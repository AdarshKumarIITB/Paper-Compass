import uuid
from datetime import datetime

from sqlalchemy import Boolean, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), unique=True)
    claim_summary: Mapped[str] = mapped_column(Text)
    method_overview: Mapped[str] = mapped_column(Text)
    method_visual_svg: Mapped[str] = mapped_column(Text, default="")
    method_visual_quality_score: Mapped[int | None] = mapped_column(Integer)
    method_visual_iterations: Mapped[int] = mapped_column(Integer, default=0)
    method_visual_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_assessment: Mapped[str] = mapped_column(Text)
    evidence_strength: Mapped[str] = mapped_column(String(10))
    prerequisites: Mapped[dict] = mapped_column(JSONB, default=list)
    reading_time_estimates: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
