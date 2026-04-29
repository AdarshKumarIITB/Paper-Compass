from typing import Literal

from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


PaperStatus = Literal[
    "discovered",
    "fetching_pdf",
    "awaiting_upload",
    "parsing",
    "awaiting_confirmation",
    "summarizing",
    "ready",
    "failed",
    # legacy values kept so older rows can still be serialized
    "evaluated",
    "reading",
    "completed",
]

MatchVerdict = Literal["match", "mismatch", "uncertain"]


class AuthorSchema(CamelModel):
    name: str
    affiliation: str | None = None


class PaperResponse(CamelModel):
    """Matches frontend Paper interface exactly."""

    id: str
    title: str
    authors: list[AuthorSchema]
    year: int
    venue: str
    abstract: str
    status: PaperStatus
    processing_step: str = ""
    failure_reason: str | None = None
    match_verdict: MatchVerdict | None = None
    match_reason: str | None = None
    match_acknowledged: bool = False
    has_deep_dive: bool = False
    citation_count: int
    influential_citation_count: int
    contribution_summary: str
    last_interaction: str | None = None
    comprehension_progress: int | None = None
    source_query: str | None = None


class PapersResponse(CamelModel):
    papers: list[PaperResponse]


class PaperSubmitRequest(CamelModel):
    type: Literal["url", "doi", "pdf"]
    value: str
