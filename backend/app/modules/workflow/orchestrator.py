"""Sequential paper-ingestion workflow.

One coroutine drives the whole pipeline:
  fetch PDF → GROBID parse → (relevance check, on user upload only) →
  Claude summary → ready.

Invoked from FastAPI BackgroundTasks; uses its own DB session because the request session
is closed by the time the background task runs. Idempotent: short-circuits if the paper is
already ready or in-flight.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.paper import Paper, UserPaper
from app.modules.evaluate.service import get_or_generate_evaluation
from app.modules.ingestion.service import parse_pdf_to_paper, persist_sections
from app.modules.relevance import check_relevance
from app.modules.storage.pdf_store import get_pdf_store
from app.modules.workflow.state import PaperStatus, is_in_flight

log = logging.getLogger(__name__)


async def _set_status(
    db: AsyncSession,
    paper: Paper,
    status: PaperStatus,
    step: str = "",
) -> None:
    paper.status = status.value
    paper.processing_step = step
    paper.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def _bump_user_paper(db: AsyncSession, user_id: uuid.UUID, paper_id: uuid.UUID) -> None:
    """Idempotent upsert of UserPaper view-tracking timestamps."""
    result = await db.execute(
        select(UserPaper).where(
            UserPaper.user_id == user_id,
            UserPaper.paper_id == paper_id,
        )
    )
    link = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if link is None:
        db.add(UserPaper(user_id=user_id, paper_id=paper_id, viewed_at=now, last_interaction_at=now))
    else:
        link.last_interaction_at = now
    await db.commit()


async def _download_open_access_pdf(url: str) -> bytes | None:
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content if resp.content else None
    except (httpx.HTTPError, httpx.TimeoutException) as e:
        log.warning("Open-access PDF fetch failed for %s: %s", url, e)
        return None


def _to_relevance_input(p) -> dict:
    """Coerce a Paper row or ParsedPaper into the dict the agent expects."""
    if hasattr(p, "authors") and isinstance(getattr(p, "authors", None), list):
        # ParsedPaper has list[str]; Paper.authors is list[{"name": ...}] (JSONB)
        authors = p.authors
    else:
        authors = []
    return {
        "title": getattr(p, "title", None),
        "authors": authors,
        "year": getattr(p, "year", None),
        "abstract": getattr(p, "abstract", None),
    }


async def process_paper(
    paper_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    pdf_override: bytes | None = None,
    skip_relevance_check: bool = False,
) -> None:
    """Drive the full pipeline. Safe to call repeatedly.

    `skip_relevance_check=True` is set by the acknowledge-match route after the user
    explicitly accepts a mismatch verdict — we shouldn't re-prompt them.
    """
    async with async_session() as db:
        paper = await db.get(Paper, paper_id)
        if paper is None:
            log.warning("process_paper: paper %s not found", paper_id)
            return

        if paper.status == PaperStatus.READY.value and pdf_override is None:
            return
        if is_in_flight(paper.status):
            log.info("process_paper: paper %s already in flight (%s)", paper.slug, paper.status)
            return

        try:
            # Step 1 — get PDF bytes (override > open-access fetch > stop)
            await _set_status(
                db, paper, PaperStatus.FETCHING_PDF, "Looking for the open-access PDF"
            )

            pdf_bytes = pdf_override
            source = "user_uploaded" if pdf_override else None
            if pdf_bytes is None and paper.open_access_pdf_url:
                pdf_bytes = await _download_open_access_pdf(paper.open_access_pdf_url)
                if pdf_bytes:
                    source = "fetched_open_access"

            if pdf_bytes is None:
                await _set_status(
                    db,
                    paper,
                    PaperStatus.AWAITING_UPLOAD,
                    "This paper appears to be paywalled — please upload the PDF",
                )
                return

            assert source is not None
            await get_pdf_store().save(
                db,
                user_id=user_id,
                paper_id=paper.id,
                source=source,
                pdf_bytes=pdf_bytes,
            )
            paper.raw_pdf_stored = True
            await db.commit()

            # Step 2 — GROBID parse (we keep the parsed result in memory for the agent).
            # In prod we may not have a reachable GROBID (Hobby plan cost concerns).
            # If parsing fails, fall back to metadata-only mode: skip sections, mark the
            # paper READY using just the Semantic Scholar abstract/metadata. The Evaluate
            # and Comprehend pages will still work for the metadata-driven views.
            await _set_status(db, paper, PaperStatus.PARSING, "Reading the paper structure")
            parsed = None
            try:
                parsed = await parse_pdf_to_paper(pdf_bytes)
                await persist_sections(db, paper, parsed)
                await db.commit()
            except Exception:
                log.warning(
                    "GROBID parse failed for paper=%s — continuing in metadata-only mode",
                    paper.slug,
                    exc_info=True,
                )
                # Don't persist sections, don't crash the workflow. Skip downstream steps
                # that depend on parsed sections.
                await _set_status(
                    db,
                    paper,
                    PaperStatus.READY,
                    "Ready (PDF parsing unavailable — using metadata only)",
                )
                await db.commit()
                return

            # Step 3 — relevance check (only on user uploads of S2-sourced papers)
            should_check = (
                source == "user_uploaded"
                and paper.source == "semantic_scholar"
                and not skip_relevance_check
            )
            if should_check:
                await _set_status(
                    db, paper, PaperStatus.PARSING, "Checking the uploaded PDF matches"
                )
                verdict = await check_relevance(
                    intended=_to_relevance_input(paper),
                    parsed=_to_relevance_input(parsed),
                )
                paper.match_verdict = verdict.verdict
                paper.match_reason = verdict.reason
                if verdict.verdict != "match":
                    log.info(
                        "Relevance verdict=%s for paper=%s reason=%s",
                        verdict.verdict, paper.slug, verdict.reason,
                    )
                    await _set_status(
                        db,
                        paper,
                        PaperStatus.AWAITING_CONFIRMATION,
                        "Confirm the uploaded PDF is the right paper",
                    )
                    return
                await db.commit()

            # Step 4 — generate evaluation (cached globally per-paper inside the function)
            await _set_status(db, paper, PaperStatus.SUMMARIZING, "Generating summary")
            await get_or_generate_evaluation(db, paper)

            await _set_status(db, paper, PaperStatus.READY, "")
            await _bump_user_paper(db, user_id, paper.id)

        except Exception as e:
            log.exception("Workflow failed for paper=%s", paper_id)
            paper.status = PaperStatus.FAILED.value
            paper.processing_step = ""
            paper.failure_reason = str(e)[:480]
            await db.commit()


async def resume_after_confirmation(paper_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """User accepted a mismatch verdict — pick up at summarize."""
    async with async_session() as db:
        paper = await db.get(Paper, paper_id)
        if paper is None:
            return
        if paper.status != PaperStatus.AWAITING_CONFIRMATION.value:
            log.info(
                "resume_after_confirmation: paper %s not awaiting confirmation (%s)",
                paper.slug, paper.status,
            )
            return
        try:
            await _set_status(db, paper, PaperStatus.SUMMARIZING, "Generating summary")
            await get_or_generate_evaluation(db, paper)
            await _set_status(db, paper, PaperStatus.READY, "")
            await _bump_user_paper(db, user_id, paper.id)
        except Exception as e:
            log.exception("Resume failed for paper=%s", paper_id)
            paper.status = PaperStatus.FAILED.value
            paper.processing_step = ""
            paper.failure_reason = str(e)[:480]
            await db.commit()
