"""Ingestion primitives. Single-responsibility helpers; chained by the workflow orchestrator.

Pieces:
- `ingest_metadata_from_semantic_scholar`: pure metadata fetch + persist (no PDF, no GROBID).
- `parse_and_persist_sections`: GROBID parse + persist sections (skips if sections already exist).
- `ingest_paper_from_pdf_only`: cold-path for user-uploaded PDFs with no S2 metadata available
  (used by the upload entry point on the home page).
"""
from __future__ import annotations

import logging

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import Paper
from app.models.section import Section
from app.modules.discover.semantic_scholar import get_paper_by_id
from app.modules.ingestion.grobid_client import parse_pdf
from app.modules.ingestion.tei_parser import parse_tei_xml

log = logging.getLogger(__name__)


async def _ensure_unique_slug(db: AsyncSession, base_slug: str) -> str:
    slug = base_slug
    counter = 1
    while True:
        result = await db.execute(select(Paper).where(Paper.slug == slug))
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


async def ingest_metadata_from_semantic_scholar(
    db: AsyncSession,
    identifier: str,
) -> Paper:
    """Fetch and persist paper metadata only. Does NOT touch PDFs or GROBID."""
    ss_data = await get_paper_by_id(identifier)

    ss_id = ss_data.get("paperId")
    if ss_id:
        result = await db.execute(select(Paper).where(Paper.semantic_scholar_id == ss_id))
        existing = result.scalar_one_or_none()
        if existing:
            return existing

    title = ss_data.get("title") or "Untitled"
    slug = await _ensure_unique_slug(db, slugify(title))
    paper = Paper(
        slug=slug,
        source="semantic_scholar",
        semantic_scholar_id=ss_id,
        title=title,
        authors=[{"name": a.get("name", "")} for a in (ss_data.get("authors") or [])],
        year=ss_data.get("year") or 0,
        venue=ss_data.get("venue") or "",
        abstract=ss_data.get("abstract") or "",
        citation_count=ss_data.get("citationCount") or 0,
        influential_citation_count=ss_data.get("influentialCitationCount") or 0,
        contribution_summary=(ss_data.get("tldr") or {}).get("text") or "",
        open_access_pdf_url=(ss_data.get("openAccessPdf") or {}).get("url"),
        status="discovered",
    )
    db.add(paper)
    await db.flush()
    return paper


async def parse_pdf_to_paper(pdf_bytes: bytes):
    """GROBID + TEI parse. Returns the ParsedPaper (no DB writes)."""
    tei_xml = await parse_pdf(pdf_bytes)
    return parse_tei_xml(tei_xml)


async def persist_sections(
    db: AsyncSession,
    paper: Paper,
    parsed,
) -> list[Section]:
    """Persist Section rows from a ParsedPaper. Idempotent: skips if sections already exist."""
    existing = await db.execute(
        select(Section).where(Section.paper_id == paper.id).order_by(Section.order)
    )
    cached = existing.scalars().all()
    if cached:
        return list(cached)

    sections: list[Section] = []
    for i, s in enumerate(parsed.sections):
        section = Section(
            paper_id=paper.id,
            title=s.title,
            text=s.text,
            order=i + 1,
        )
        db.add(section)
        sections.append(section)
    await db.flush()
    return sections


async def ingest_paper_from_pdf_only(
    db: AsyncSession,
    pdf_bytes: bytes,
) -> Paper:
    """Cold-path entry: user uploads a standalone PDF with no S2 lookup. Persists paper + sections."""
    tei_xml = await parse_pdf(pdf_bytes)
    parsed = parse_tei_xml(tei_xml)

    slug = await _ensure_unique_slug(db, slugify(parsed.title or "untitled"))
    paper = Paper(
        slug=slug,
        source="user_upload",
        title=parsed.title,
        authors=[{"name": a} for a in parsed.authors],
        year=parsed.year,
        abstract=parsed.abstract,
        status="parsing",
        raw_pdf_stored=True,
    )
    db.add(paper)
    await db.flush()

    for i, s in enumerate(parsed.sections):
        db.add(
            Section(
                paper_id=paper.id,
                title=s.title,
                text=s.text,
                order=i + 1,
            )
        )
    await db.flush()
    return paper
