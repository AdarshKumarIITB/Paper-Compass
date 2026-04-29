import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.paper import PapersResponse
from app.modules.discover.semantic_scholar import search_papers
from app.modules.discover.transform import ss_paper_to_response, map_time_range

router = APIRouter()
log = logging.getLogger(__name__)


def _apply_sort(papers: list[dict], sort: str | None) -> list[dict]:
    if sort == "foundational":
        return sorted(
            papers,
            key=lambda p: (p.get("citationCount", 0), p.get("influentialCitationCount", 0)),
            reverse=True,
        )
    if sort == "recent":
        return sorted(papers, key=lambda p: p.get("year", 0), reverse=True)
    return papers


@router.get("/discover", response_model=PapersResponse)
async def discover_papers(
    q: str = Query(..., description="Search query"),
    timeRange: str = Query(None, description="Time range filter"),
    sort: str = Query(None, description="Sort order: foundational or recent"),
    current_user: User = Depends(get_current_user),
):
    """Search/discover papers via the Semantic Scholar API.

    /paper/search only supports relevance ranking. Sorting is applied
    in-process to the relevance window.
    """
    year_range = map_time_range(timeRange)

    try:
        raw = await search_papers(q, limit=20, year_range=year_range)
    except Exception:
        log.exception("Semantic Scholar search failed for query=%s", q)
        raise HTTPException(502, "Semantic Scholar unavailable. Please try again.")

    papers = [ss_paper_to_response(p, source_query=q) for p in raw.get("data") or []]
    papers = _apply_sort(papers, sort.lower() if sort else None)

    return PapersResponse(papers=papers)
