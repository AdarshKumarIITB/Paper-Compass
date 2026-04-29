import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SectionExplanation(Base):
    __tablename__ = "section_explanations"
    __table_args__ = (UniqueConstraint("section_id", "depth_level"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sections.id", ondelete="CASCADE"))
    depth_level: Mapped[str] = mapped_column(String(20))
    explanation_text: Mapped[str] = mapped_column(Text)
    glossary: Mapped[dict] = mapped_column(JSONB, default=list)
    unfamiliar_terms: Mapped[dict] = mapped_column(JSONB, default=list)
    prompt_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
