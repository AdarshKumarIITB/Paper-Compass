import uuid
from datetime import datetime

from sqlalchemy import Boolean, String, Integer, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Visual(Base):
    __tablename__ = "visuals"
    __table_args__ = (UniqueConstraint("section_id", "depth_level"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sections.id", ondelete="CASCADE"))
    depth_level: Mapped[str] = mapped_column(String(20))
    format: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    caption: Mapped[str | None] = mapped_column(Text)
    prompt_version: Mapped[int] = mapped_column(Integer, default=1)
    quality_score: Mapped[int | None] = mapped_column(Integer)
    iterations: Mapped[int] = mapped_column(Integer, default=1)
    approved: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
