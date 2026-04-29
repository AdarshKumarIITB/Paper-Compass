from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class VisualIntent(StrEnum):
    METHOD_ARCHITECTURE = "method_architecture"
    CONCEPT_ILLUSTRATION = "concept_illustration"
    DATA_FLOW = "data_flow"
    MATHEMATICAL_RELATIONSHIP = "math_relation"


@dataclass
class VisualResult:
    svg: str | None
    caption: str | None = None
    approved: bool = False
    iterations: int = 0
    score: int | None = None
    quality_notes: list[str] = field(default_factory=list)


def intent_for_depth(depth: str) -> VisualIntent:
    """Map a comprehension depth level to the appropriate diagram intent."""
    if depth == "conceptual":
        return VisualIntent.CONCEPT_ILLUSTRATION
    if depth == "technical":
        return VisualIntent.DATA_FLOW
    if depth == "formal":
        return VisualIntent.MATHEMATICAL_RELATIONSHIP
    return VisualIntent.CONCEPT_ILLUSTRATION
