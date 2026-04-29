from datetime import datetime

from slugify import slugify


def ss_paper_to_response(raw: dict, source_query: str) -> dict:
    authors = [{"name": a.get("name", "")} for a in (raw.get("authors") or [])]

    tldr = raw.get("tldr")
    summary = tldr["text"] if tldr and isinstance(tldr, dict) and tldr.get("text") else ""
    if not summary and raw.get("abstract"):
        # Use first two sentences as fallback
        sentences = raw["abstract"].split(". ")
        summary = ". ".join(sentences[:2])
        if not summary.endswith("."):
            summary += "."

    return {
        "id": slugify(raw.get("title", "untitled")),
        "title": raw.get("title", "Untitled"),
        "authors": authors,
        "year": raw.get("year") or 0,
        "venue": raw.get("venue") or "",
        "abstract": raw.get("abstract") or "",
        "status": "discovered",
        "citationCount": raw.get("citationCount") or 0,
        "influentialCitationCount": raw.get("influentialCitationCount") or 0,
        "contributionSummary": summary,
        "sourceQuery": source_query,
    }


def map_time_range(filter_str: str | None) -> str | None:
    if not filter_str:
        return None
    now_year = datetime.now().year
    mapping = {
        "Last year": f"{now_year - 1}-{now_year}",
        "Last 3 years": f"{now_year - 3}-{now_year}",
        "Last 5 years": f"{now_year - 5}-{now_year}",
    }
    return mapping.get(filter_str)
