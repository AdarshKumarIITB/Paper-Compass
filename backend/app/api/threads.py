import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.paper import Paper
from app.models.section import Section
from app.models.thread import Thread
from app.models.user import User
from app.schemas.thread import (
    CopilotCreateRequest,
    ThreadCreateRequest,
    ThreadMessageCreateRequest,
    ThreadMessageSchema,
    ThreadResponse,
)
from app.utils.queries import get_paper_by_slug
from app.modules.comprehend.thread_service import (
    create_term_thread,
    find_or_create_copilot_thread,
    reply_to_copilot_thread,
    reply_to_term_thread,
    reply_with_recommendations,
)

router = APIRouter()
log = logging.getLogger(__name__)


def _thread_to_response(thread: Thread) -> ThreadResponse:
    return ThreadResponse(
        id=str(thread.id),
        thread_type=thread.thread_type,
        term=thread.term,
        selected_text=thread.selected_text,
        section_id=str(thread.section_id) if thread.section_id else None,
        depth_level=thread.depth_level,
        messages=[
            ThreadMessageSchema(
                id=str(m.id),
                role=m.role,
                content=m.content,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
            for m in thread.messages
        ],
    )


async def _reload_with_messages(db: AsyncSession, thread_id: uuid.UUID) -> Thread:
    result = await db.execute(
        select(Thread).where(Thread.id == thread_id).options(selectinload(Thread.messages))
    )
    return result.scalar_one()


@router.post("/papers/{paper_id}/threads", response_model=ThreadResponse)
async def create_thread(
    paper_id: str,
    request: ThreadCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new term thread (highlighted-phrase chat)."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    section = await db.get(Section, uuid.UUID(request.section_id))
    if not section or section.paper_id != paper.id:
        raise HTTPException(404, f"Section '{request.section_id}' not found")

    if not request.selected_text.strip():
        raise HTTPException(400, "selected_text must be non-empty")

    try:
        thread = await create_term_thread(
            db,
            user=current_user,
            paper=paper,
            section=section,
            selected_text=request.selected_text,
            depth_level=request.depth_level,
        )
    except Exception:
        log.exception("Failed to create term thread for selection=%s", request.selected_text[:80])
        raise HTTPException(502, "Could not generate response. Please try again.")

    thread = await _reload_with_messages(db, thread.id)
    return _thread_to_response(thread)


@router.post("/papers/{paper_id}/copilot", response_model=ThreadResponse)
async def get_or_create_copilot(
    paper_id: str,
    request: CopilotCreateRequest = CopilotCreateRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find-or-create the user's persistent paper-wide chat. Idempotent."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    thread = await find_or_create_copilot_thread(
        db, user=current_user, paper=paper, depth_level=request.depth_level
    )
    thread = await _reload_with_messages(db, thread.id)
    return _thread_to_response(thread)


@router.get("/papers/{paper_id}/threads", response_model=list[ThreadResponse])
async def list_threads_for_paper(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's threads for this paper. Most-recent first."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    result = await db.execute(
        select(Thread)
        .where(Thread.paper_id == paper.id, Thread.user_id == current_user.id)
        .order_by(Thread.created_at.desc())
        .options(selectinload(Thread.messages))
    )
    threads = result.scalars().all()
    return [_thread_to_response(t) for t in threads]


@router.post("/threads/{thread_id}/messages", response_model=ThreadMessageSchema)
async def create_message(
    thread_id: str,
    request: ThreadMessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Append a user message + generate the assistant reply. Branches by thread_type."""
    result = await db.execute(
        select(Thread)
        .where(Thread.id == uuid.UUID(thread_id))
        .options(selectinload(Thread.messages))
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(404, f"Thread '{thread_id}' not found")
    if thread.user_id is not None and thread.user_id != current_user.id:
        raise HTTPException(403, "You don't have access to this thread")

    paper = await db.get(Paper, thread.paper_id)
    if not paper:
        raise HTTPException(404, "Owning paper missing")

    try:
        if thread.thread_type == "paper":
            if request.intent == "recommend":
                reply = await reply_with_recommendations(db, thread, paper, request.content)
            else:
                reply = await reply_to_copilot_thread(db, thread, paper, request.content)
        else:
            section = await db.get(Section, thread.section_id) if thread.section_id else None
            if section is None:
                raise HTTPException(409, "Term thread is missing its section")
            reply = await reply_to_term_thread(db, thread, paper, section, request.content)
    except HTTPException:
        raise
    except Exception:
        log.exception("Failed to generate reply for thread=%s", thread_id)
        raise HTTPException(502, "Could not generate response. Please try again.")

    return ThreadMessageSchema(
        id=str(reply.id),
        role=reply.role,
        content=reply.content,
        created_at=reply.created_at.isoformat() if reply.created_at else "",
    )
