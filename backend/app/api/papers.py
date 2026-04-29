import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.paper import Paper, UserPaper
from app.models.user import User
from app.modules.discover.semantic_scholar import search_papers
from app.modules.ingestion.service import (
    ingest_metadata_from_semantic_scholar,
    ingest_paper_from_pdf_only,
)
from app.modules.workflow import process_paper, resume_after_confirmation
from app.modules.workflow.state import PaperStatus
from app.schemas.paper import PaperResponse, PaperSubmitRequest
from app.utils.mappers import paper_model_to_response
from app.utils.queries import get_paper_by_slug

router = APIRouter()
log = logging.getLogger(__name__)

DOI_RE = re.compile(r"(10\.\d{4,}/[^\s]+)")
SS_ID_RE = re.compile(r"semanticscholar\.org/paper/[^/]*/([a-f0-9]{40})", re.I)
ARXIV_RE = re.compile(r"arxiv\.org/(?:abs|pdf)/(\d+\.\d+)")

MAX_PDF_BYTES = 25 * 1024 * 1024  # 25 MB
PDF_MAGIC = b"%PDF-"


def _validate_pdf_bytes(pdf_bytes: bytes) -> None:
    """Reject obvious non-PDFs and oversized files at the edge."""
    if not pdf_bytes:
        raise HTTPException(400, "The uploaded file is empty.")
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(
            413,
            f"File is too large ({len(pdf_bytes) // (1024 * 1024)} MB). "
            f"Maximum is {MAX_PDF_BYTES // (1024 * 1024)} MB.",
        )
    # PDF spec: the file must start with %PDF-<version>. We allow up to 1 KB of
    # leading garbage (some PDFs do this) by scanning the first 1024 bytes.
    head = pdf_bytes[:1024]
    if PDF_MAGIC not in head:
        raise HTTPException(
            400,
            "This file doesn't look like a PDF. The %PDF header is missing — "
            "make sure you're uploading the actual paper, not a renamed file.",
        )


def _extract_identifier(value: str) -> str:
    """Extract a Semantic Scholar-compatible identifier from a URL, DOI, or plain ID."""
    if m := SS_ID_RE.search(value):
        return m.group(1)
    if m := ARXIV_RE.search(value):
        return f"ARXIV:{m.group(1)}"
    if m := DOI_RE.search(value):
        return m.group(1)
    return value


async def _link_user_to_paper(db: AsyncSession, user_id, paper_id) -> UserPaper:
    """Idempotent UserPaper upsert. Caller commits. Returns the link row."""
    result = await db.execute(
        select(UserPaper).where(
            UserPaper.user_id == user_id,
            UserPaper.paper_id == paper_id,
        )
    )
    link = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if link is None:
        link = UserPaper(
            user_id=user_id, paper_id=paper_id, viewed_at=now, last_interaction_at=now
        )
        db.add(link)
    else:
        link.last_interaction_at = now
    return link


def _is_acknowledged(link: UserPaper | None) -> bool:
    return bool(link and link.match_acknowledged_at is not None)


@router.post("/papers", response_model=PaperResponse)
async def submit_paper(
    request: PaperSubmitRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a paper by URL or DOI. Fetches metadata, links to user, kicks off background ingest."""
    if request.type == "pdf":
        raise HTTPException(501, "Use POST /papers/upload for PDF files")

    identifier = _extract_identifier(request.value)
    try:
        paper = await ingest_metadata_from_semantic_scholar(db, identifier)
    except Exception:
        log.exception("Failed to fetch metadata for identifier=%s", identifier)
        raise HTTPException(502, "Could not fetch paper metadata. Please check the URL or DOI.")

    link = await _link_user_to_paper(db, current_user.id, paper.id)
    await db.commit()
    await db.refresh(paper)

    if paper.status == PaperStatus.DISCOVERED.value:
        background_tasks.add_task(process_paper, paper.id, current_user.id)

    return paper_model_to_response(paper, match_acknowledged=_is_acknowledged(link))


@router.post("/papers/upload", response_model=PaperResponse)
async def upload_paper_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cold-path upload: a PDF with no S2 metadata. Parses + summarizes via the workflow."""
    pdf_bytes = await file.read()
    _validate_pdf_bytes(pdf_bytes)
    try:
        paper = await ingest_paper_from_pdf_only(db, pdf_bytes)
    except Exception:
        log.exception("Failed to parse uploaded PDF")
        raise HTTPException(502, "Could not parse the PDF. Is GROBID running?")

    link = await _link_user_to_paper(db, current_user.id, paper.id)
    await db.commit()
    await db.refresh(paper)

    # Sections already persisted; orchestrator will skip parse and run summarize step.
    background_tasks.add_task(process_paper, paper.id, current_user.id, pdf_override=pdf_bytes)
    return paper_model_to_response(paper, match_acknowledged=_is_acknowledged(link))


@router.post("/papers/{paper_id}/upload", response_model=PaperResponse)
async def upload_pdf_for_paywalled_paper(
    paper_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resume the workflow for a paper stuck in `awaiting_upload` (or failed) with the user's PDF."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")
    if paper.status not in (
        PaperStatus.AWAITING_UPLOAD.value,
        PaperStatus.AWAITING_CONFIRMATION.value,
        PaperStatus.FAILED.value,
        PaperStatus.DISCOVERED.value,
    ):
        raise HTTPException(409, f"Paper status is '{paper.status}', not awaiting an upload")

    pdf_bytes = await file.read()
    _validate_pdf_bytes(pdf_bytes)

    link = await _link_user_to_paper(db, current_user.id, paper.id)
    # Re-uploading clears the previous match verdict + acknowledgment so the agent
    # gets a fresh chance against the new PDF.
    paper.failure_reason = None
    paper.match_verdict = None
    paper.match_reason = None
    link.match_acknowledged_at = None
    await db.commit()
    await db.refresh(paper)

    background_tasks.add_task(process_paper, paper.id, current_user.id, pdf_override=pdf_bytes)
    return paper_model_to_response(paper, match_acknowledged=False)


@router.post("/papers/{paper_id}/acknowledge-match", response_model=PaperResponse)
async def acknowledge_match(
    paper_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User has accepted a mismatch verdict and wants to proceed with the uploaded PDF."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")
    if paper.status != PaperStatus.AWAITING_CONFIRMATION.value:
        raise HTTPException(
            409, f"Paper is not awaiting confirmation (status='{paper.status}')"
        )

    link = await _link_user_to_paper(db, current_user.id, paper.id)
    link.match_acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(paper)

    background_tasks.add_task(resume_after_confirmation, paper.id, current_user.id)
    return paper_model_to_response(paper, match_acknowledged=True)


@router.get("/papers/{paper_id}", response_model=PaperResponse)
async def get_paper(
    paper_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a paper by slug. Auto-ingests metadata from S2 + kicks off workflow on first view."""
    paper = await get_paper_by_slug(db, paper_id)

    if paper is None:
        # Cold path: slug came from a search-result click but POST /papers wasn't called.
        # Resolve back to S2 by re-searching the deslugified title.
        title_query = paper_id.replace("-", " ")
        try:
            raw = await search_papers(title_query, limit=5)
        except Exception:
            log.warning("Auto-ingest lookup failed for slug=%s", paper_id, exc_info=True)
            raise HTTPException(404, f"Paper '{paper_id}' not found")
        match = next(
            (
                r for r in (raw.get("data") or [])
                if slugify(r.get("title", "")) == paper_id and r.get("paperId")
            ),
            None,
        )
        if not match:
            raise HTTPException(404, f"Paper '{paper_id}' not found")
        paper = await ingest_metadata_from_semantic_scholar(db, match["paperId"])
        await db.commit()
        await db.refresh(paper)

    link = await _link_user_to_paper(db, current_user.id, paper.id)
    await db.commit()
    await db.refresh(paper)

    # If this is the first time we've seen the paper for any user (or a previous run died
    # before reaching a terminal state), kick off the workflow.
    if paper.status == PaperStatus.DISCOVERED.value:
        background_tasks.add_task(process_paper, paper.id, current_user.id)

    return paper_model_to_response(paper, match_acknowledged=_is_acknowledged(link))
