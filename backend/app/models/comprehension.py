import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ComprehensionState(Base):
    __tablename__ = "comprehension_states"
    __table_args__ = (UniqueConstraint("user_id", "paper_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    paper_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"))
    global_depth: Mapped[str] = mapped_column(String(20), default="conceptual")
    per_section_depth: Mapped[dict] = mapped_column(JSONB, default=dict)
    sections_viewed: Mapped[dict] = mapped_column(JSONB, default=list)
    active_section_id: Mapped[uuid.UUID | None] = mapped_column()
    last_position: Mapped[dict | None] = mapped_column(JSONB)
    comprehension_progress: Mapped[int] = mapped_column(Integer, default=0)
    last_interaction: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
