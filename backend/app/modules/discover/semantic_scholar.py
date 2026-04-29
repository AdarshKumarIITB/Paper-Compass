import asyncio
import logging

import httpx
from aiolimiter import AsyncLimiter

from app.config import settings

log = logging.getLogger(__name__)

BASE_URL = "https://api.semanticscholar.org/graph/v1"
FIELDS = "paperId,title,authors,year,venue,abstract,citationCount,influentialCitationCount,tldr,openAccessPdf"

# Stay below S2's 1 req/s cumulative ceiling — release one token every 1.1s.
_limiter = AsyncLimiter(1, 1.1)

# Reuse a single client for connection pooling
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30)
    return _client


async def close_client() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


def _headers() -> dict[str, str]:
    h = {"Accept": "application/json"}
    if settings.semantic_scholar_api_key:
        h["x-api-key"] = settings.semantic_scholar_api_key
    return h


async def _request_with_retry(url: str, params: dict, max_retries: int = 2) -> httpx.Response:
    """Make an HTTP GET with exponential backoff on 429 and transient errors."""
    client = _get_client()
    last_exc = None
    resp: httpx.Response | None = None

    for attempt in range(max_retries):
        try:
            async with _limiter:
                resp = await client.get(url, params=params, headers=_headers())

            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                log.warning("Semantic Scholar 429, retrying in %ds (attempt %d/%d)", wait, attempt + 1, max_retries)
                await asyncio.sleep(wait)
                continue

            resp.raise_for_status()
            return resp

        except (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError) as e:
            last_exc = e
            wait = 2 ** (attempt + 1)
            log.warning("Semantic Scholar request failed (%s), retrying in %ds (attempt %d/%d)", type(e).__name__, wait, attempt + 1, max_retries)
            await asyncio.sleep(wait)

    if last_exc:
        raise last_exc
    if resp is not None:
        resp.raise_for_status()
    raise RuntimeError("Semantic Scholar request failed without a response")


async def search_papers(
    query: str,
    offset: int = 0,
    limit: int = 20,
    year_range: str | None = None,
) -> dict:
    # Note: /paper/search does not accept a `sort` parameter — relevance only.
    # Apply ordering downstream in the API layer.
    params: dict[str, str | int] = {
        "query": query,
        "offset": offset,
        "limit": limit,
        "fields": FIELDS,
    }
    if year_range:
        params["year"] = year_range

    resp = await _request_with_retry(f"{BASE_URL}/paper/search", params)
    return resp.json()


async def get_paper_by_id(paper_id: str) -> dict:
    resp = await _request_with_retry(
        f"{BASE_URL}/paper/{paper_id}",
        {"fields": FIELDS},
    )
    return resp.json()


# Lighter field set for candidate lists — abstract is needed so the LLM can rerank.
_CANDIDATE_FIELDS = "paperId,title,authors,year,venue,abstract,citationCount,influentialCitationCount"


async def get_references(paper_id: str, limit: int = 20) -> list[dict]:
    """Papers cited by this paper. Returns a list of paper dicts (the cited paper, unwrapped)."""
    resp = await _request_with_retry(
        f"{BASE_URL}/paper/{paper_id}/references",
        {"fields": _CANDIDATE_FIELDS, "limit": limit},
    )
    payload = resp.json()
    out: list[dict] = []
    for entry in payload.get("data", []):
        cited = entry.get("citedPaper")
        if cited and cited.get("paperId"):
            out.append(cited)
    return out


async def get_recommendations(paper_id: str, limit: int = 20) -> list[dict]:
    """Papers similar to this one (different S2 product, different base URL)."""
    resp = await _request_with_retry(
        f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}",
        {"fields": _CANDIDATE_FIELDS, "limit": limit},
    )
    payload = resp.json()
    return [p for p in payload.get("recommendedPapers", []) if p.get("paperId")]
