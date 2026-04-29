from typing import Literal

from pydantic import ConfigDict

from app.schemas.paper import CamelModel


class PrerequisiteSchema(CamelModel):
    name: str
    level: Literal["basic", "intermediate", "advanced"]


class ReadingTimeEstimatesSchema(CamelModel):
    conceptual: int
    technical: int
    formal: int


class EvaluationResponse(CamelModel):
    """Matches frontend Evaluation interface exactly."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    paper_id: str
    claim_summary: str
    method_overview: str
    method_visual: str  # SVG string
    evidence_assessment: str
    evidence_strength: Literal["weak", "mixed", "solid", "strong"]
    prerequisites: list[PrerequisiteSchema]
    reading_time_estimates: ReadingTimeEstimatesSchema
    created_at: str
