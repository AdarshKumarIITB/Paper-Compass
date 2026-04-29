"""Section-explanation service: text generated synchronously, visual via background task.

Lifecycle:
- First call (cold): GROBID-parsed Section + paper context → Sonnet → SectionExplanation row.
  Returns immediately with visual_status="pending". A background task is kicked off
  to run the visual subsystem (generate-validate loop) and persist a Visual row.
- Subsequent calls (warm): both rows are cached; we return them directly. visual_status
  is "ready" if the Visual row exists, otherwise still "pending".

The Visual row's existence is the source of truth for whether the diagram is done.
A failed/timed-out generation writes a sentinel Visual with content="" and
approved=False so polling can stop with status="failed".
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.explanation import SectionExplanation
from app.models.paper import Paper
from app.models.section import Section
from app.models.visual import Visual
from app.modules.llm.client import generate
from app.modules.llm.prompts.explanation import SYSTEM_PROMPT, build_explanation_prompt
from app.modules.llm.response_parser import parse_json_response
from app.modules.visuals import generate_visual
from app.modules.visuals.types import intent_for_depth

log = logging.getLogger(__name__)

VisualStatus = Literal["pending", "ready", "skipped", "failed"]


@dataclass
class ExplanationResult:
    explanation: SectionExplanation
    visual_svg: str | None = None
    visual_caption: str | None = None
    visual_status: VisualStatus = "pending"


# Per-paper semaphore registry: cap concurrent visual generations to 3 per paper
# so a hot-loading session doesn't exhaust Anthropic's per-account concurrency.
_paper_visual_semaphores: dict[uuid.UUID, asyncio.Semaphore] = {}


def _get_paper_visual_semaphore(paper_id: uuid.UUID) -> asyncio.Semaphore:
    sem = _paper_visual_semaphores.get(paper_id)
    if sem is None:
        sem = asyncio.Semaphore(3)
        _paper_visual_semaphores[paper_id] = sem
    return sem


async def get_or_generate_explanation(
    db: AsyncSession,
    section: Section,
    paper: Paper,
    depth_level: str,
) -> ExplanationResult:
    """Returns text fast. Visual status reflects the cache state.

    Caller is responsible for kicking off the visual background task when the
    return value's visual_status == "pending".
    """
    cached_expl = (
        await db.execute(
            select(SectionExplanation).where(
                SectionExplanation.section_id == section.id,
                SectionExplanation.depth_level == depth_level,
            )
        )
    ).scalar_one_or_none()

    cached_visual = (
        await db.execute(
            select(Visual).where(
                Visual.section_id == section.id,
                Visual.depth_level == depth_level,
            )
        )
    ).scalar_one_or_none()

    if cached_expl is not None:
        return ExplanationResult(
            explanation=cached_expl,
            visual_svg=cached_visual.content if cached_visual and cached_visual.content else None,
            visual_caption=cached_visual.caption if cached_visual else None,
            visual_status=_visual_status_from_row(cached_visual),
        )

    # Cold path: synchronous text generation
    prompt = build_explanation_prompt(
        section_title=section.title,
        section_text=section.text,
        paper_title=paper.title,
        paper_abstract=paper.abstract or "",
        depth_level=depth_level,
    )
    raw_response = await generate(system_prompt=SYSTEM_PROMPT, user_prompt=prompt)
    parsed = parse_json_response(raw_response)

    explanation_text = parsed.get("explanationText", "")
    visual_caption = parsed.get("visualCaption")

    explanation = SectionExplanation(
        section_id=section.id,
        depth_level=depth_level,
        explanation_text=explanation_text,
        glossary=parsed.get("glossary", []),
        unfamiliar_terms=parsed.get("unfamiliarTerms", []),
        prompt_version=1,
    )
    db.add(explanation)
    await db.commit()
    await db.refresh(explanation)

    return ExplanationResult(
        explanation=explanation,
        visual_svg=None,
        visual_caption=visual_caption,
        # Caller will spawn the background task; until then, the row doesn't exist → pending
        visual_status="pending",
    )


def _visual_status_from_row(row: Visual | None) -> VisualStatus:
    if row is None:
        return "pending"
    if not row.content:
        # Sentinel row written when the loop returns no SVG
        return "failed"
    return "ready"


async def generate_section_visual_in_background(
    section_id: uuid.UUID,
    paper_id: uuid.UUID,
    depth_level: str,
) -> None:
    """Run the visual subsystem and persist the result. Safe to call repeatedly.

    Idempotent: if a Visual row for (section_id, depth_level) already exists, we exit.
    Otherwise we run the generator+validator loop (capped to 3 concurrent per paper),
    then persist either the SVG or a sentinel failure row so polling can terminate.
    """
    sem = _get_paper_visual_semaphore(paper_id)

    async with async_session() as db:
        # Re-check inside the session — another worker may have just written the row
        existing = (
            await db.execute(
                select(Visual).where(
                    Visual.section_id == section_id,
                    Visual.depth_level == depth_level,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            return

        section = await db.get(Section, section_id)
        paper = await db.get(Paper, paper_id)
        explanation = (
            await db.execute(
                select(SectionExplanation).where(
                    SectionExplanation.section_id == section_id,
                    SectionExplanation.depth_level == depth_level,
                )
            )
        ).scalar_one_or_none()

        if section is None or paper is None or explanation is None:
            log.warning(
                "background visual: missing inputs section=%s paper=%s expl=%s",
                section_id, paper_id, bool(explanation),
            )
            return

        if not (explanation.explanation_text or "").strip():
            _persist_visual_sentinel(db, section_id, depth_level)
            await _safe_commit(db)
            return

    # Run the generator outside the session — it makes network calls and we don't
    # want to hold a DB connection during 25–40s of LLM work.
    try:
        async with sem:
            vis = await generate_visual(
                intent=intent_for_depth(depth_level),
                content=explanation.explanation_text,
                paper_title=paper.title,
                section_title=section.title,
                depth=depth_level,
            )
    except Exception:
        log.exception(
            "Visual subsystem raised for section=%s depth=%s", section_id, depth_level
        )
        async with async_session() as db:
            _persist_visual_sentinel(db, section_id, depth_level)
            await _safe_commit(db)
        return

    async with async_session() as db:
        if vis.svg:
            db.add(
                Visual(
                    section_id=section_id,
                    depth_level=depth_level,
                    format="svg",
                    content=vis.svg,
                    caption=None,  # caption is on the explanation, not duplicated here
                    prompt_version=1,
                    quality_score=vis.score,
                    iterations=vis.iterations,
                    approved=vis.approved,
                )
            )
        else:
            _persist_visual_sentinel(db, section_id, depth_level)
        await _safe_commit(db)


def _persist_visual_sentinel(db: AsyncSession, section_id: uuid.UUID, depth_level: str) -> None:
    """Write a 'failed' Visual row so polling terminates."""
    db.add(
        Visual(
            section_id=section_id,
            depth_level=depth_level,
            format="svg",
            content="",
            caption=None,
            prompt_version=1,
            quality_score=None,
            iterations=0,
            approved=False,
        )
    )


async def _safe_commit(db: AsyncSession) -> None:
    """Commit, swallowing duplicate-row IntegrityError (two background tasks raced)."""
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()


async def get_visual_status(
    db: AsyncSession,
    section_id: uuid.UUID,
    depth_level: str,
) -> tuple[Visual | None, VisualStatus]:
    """Return (cached_row_or_none, status). Used by the polling endpoint."""
    row = (
        await db.execute(
            select(Visual).where(
                Visual.section_id == section_id,
                Visual.depth_level == depth_level,
            )
        )
    ).scalar_one_or_none()
    return row, _visual_status_from_row(row)
