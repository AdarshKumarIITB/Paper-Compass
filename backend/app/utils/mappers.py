from app.models.paper import Paper
from app.schemas.paper import AuthorSchema, PaperResponse


def paper_model_to_response(
    paper: Paper,
    *,
    match_acknowledged: bool = False,
    has_deep_dive: bool = False,
) -> PaperResponse:
    return PaperResponse(
        id=paper.slug,
        title=paper.title,
        authors=[AuthorSchema(**a) for a in (paper.authors or [])],
        year=paper.year,
        venue=paper.venue or "",
        abstract=paper.abstract or "",
        status=paper.status,
        processing_step=paper.processing_step or "",
        failure_reason=paper.failure_reason,
        match_verdict=paper.match_verdict,
        match_reason=paper.match_reason,
        match_acknowledged=match_acknowledged,
        has_deep_dive=has_deep_dive,
        citation_count=paper.citation_count,
        influential_citation_count=paper.influential_citation_count,
        contribution_summary=paper.contribution_summary or "",
        source_query=paper.source_query,
    )
