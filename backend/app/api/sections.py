import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.comprehension import ComprehensionState
from app.models.section import Section
from app.models.user import User
from app.schemas.section import (
    SectionExplanationResponse,
    SectionResponse,
    SectionVisualResponse,
)
from app.utils.queries import get_paper_by_slug
from app.modules.comprehend.explanation_service import (
    generate_section_visual_in_background,
    get_or_generate_explanation,
    get_visual_status,
)

router = APIRouter()


async def _record_section_view(
    db: AsyncSession,
    user_id: uuid.UUID,
    paper_id: uuid.UUID,
    section_id: uuid.UUID,
    depth: str,
) -> None:
    """Upsert ComprehensionState for (user, paper). Marks the paper as "deep-dive done"."""
    result = await db.execute(
        select(ComprehensionState).where(
            ComprehensionState.user_id == user_id,
            ComprehensionState.paper_id == paper_id,
        )
    )
    state = result.scalar_one_or_none()
    sid = str(section_id)
    now = datetime.now(timezone.utc)
    if state is None:
        db.add(
            ComprehensionState(
                user_id=user_id,
                paper_id=paper_id,
                global_depth=depth,
                sections_viewed=[sid],
                active_section_id=section_id,
                last_interaction=now,
            )
        )
    else:
        viewed = list(state.sections_viewed or [])
        if sid not in viewed:
            viewed.append(sid)
        state.sections_viewed = viewed
        state.active_section_id = section_id
        state.last_interaction = now
    await db.commit()


@router.get(
    "/papers/{paper_id}/sections",
    response_model=list[SectionResponse],
)
async def get_sections(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    result = await db.execute(
        select(Section).where(Section.paper_id == paper.id).order_by(Section.order)
    )
    sections = result.scalars().all()
    if not sections:
        raise HTTPException(404, f"No sections found for paper '{paper_id}'")

    return [
        SectionResponse(id=str(s.id), paper_id=paper_id, title=s.title, order=s.order)
        for s in sections
    ]


@router.get(
    "/papers/{paper_id}/sections/{section_id}/explain",
    response_model=SectionExplanationResponse,
)
async def explain_section(
    paper_id: str,
    section_id: str,
    background_tasks: BackgroundTasks,
    depth: str = Query(..., description="Depth level: conceptual, technical, or formal"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the section's explanation text fast. Visual is generated lazily in
    a background task; the client polls /visual until visualStatus turns 'ready'."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    section_uuid = uuid.UUID(section_id)
    section = await db.get(Section, section_uuid)
    if not section or section.paper_id != paper.id:
        raise HTTPException(404, f"Section '{section_id}' not found")

    result = await get_or_generate_explanation(db, section, paper, depth)
    await _record_section_view(db, current_user.id, paper.id, section.id, depth)

    # Spawn the visual generator if not already cached. This is idempotent inside
    # the background task — a duplicate spawn just exits early.
    if result.visual_status == "pending":
        background_tasks.add_task(
            generate_section_visual_in_background,
            section.id,
            paper.id,
            depth,
        )

    return SectionExplanationResponse(
        section_id=str(section.id),
        depth_level=result.explanation.depth_level,
        explanation_text=result.explanation.explanation_text,
        glossary=result.explanation.glossary or [],
        unfamiliar_terms=result.explanation.unfamiliar_terms or [],
        visual=result.visual_svg,
        visual_caption=result.visual_caption,
        visual_status=result.visual_status,
    )


@router.get(
    "/papers/{paper_id}/sections/{section_id}/visual",
    response_model=SectionVisualResponse,
)
async def get_section_visual(
    paper_id: str,
    section_id: str,
    background_tasks: BackgroundTasks,
    depth: str = Query(..., description="Depth level: conceptual, technical, or formal"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight poll for the visual generation status. Idempotent."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    section_uuid = uuid.UUID(section_id)
    section = await db.get(Section, section_uuid)
    if not section or section.paper_id != paper.id:
        raise HTTPException(404, f"Section '{section_id}' not found")

    row, status = await get_visual_status(db, section_uuid, depth)

    # If something dropped a pending state on the floor (server restart,
    # background task crashed before writing), re-arm the generator.
    if status == "pending":
        background_tasks.add_task(
            generate_section_visual_in_background, section.id, paper.id, depth
        )

    return SectionVisualResponse(
        section_id=section_id,
        depth_level=depth,
        visual=row.content if row and row.content else None,
        visual_caption=row.caption if row else None,
        visual_status=status,
        quality_score=row.quality_score if row else None,
    )
