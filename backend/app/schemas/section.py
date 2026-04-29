from typing import Literal

from app.schemas.paper import CamelModel

VisualStatus = Literal["pending", "ready", "skipped", "failed"]


class SectionResponse(CamelModel):
    """Matches frontend Section interface exactly."""

    id: str
    paper_id: str
    title: str
    order: int


class GlossaryTermSchema(CamelModel):
    term: str
    definition: str


class SectionExplanationResponse(CamelModel):
    """Matches frontend SectionExplanation interface exactly."""

    section_id: str
    depth_level: Literal["conceptual", "technical", "formal"]
    explanation_text: str
    glossary: list[GlossaryTermSchema]
    visual: str | None = None  # SVG string; null until the background task finishes
    visual_caption: str | None = None
    visual_status: VisualStatus = "pending"
    unfamiliar_terms: list[str]


class SectionVisualResponse(CamelModel):
    """Lightweight polling response for the visual generation status."""

    section_id: str
    depth_level: Literal["conceptual", "technical", "formal"]
    visual: str | None = None
    visual_caption: str | None = None
    visual_status: VisualStatus
    quality_score: int | None = None
