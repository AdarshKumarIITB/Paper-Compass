import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.evaluation import Evaluation
from app.models.user import User
from app.modules.workflow.state import PaperStatus
from app.schemas.evaluation import EvaluationResponse
from app.utils.queries import get_paper_by_slug

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/papers/{paper_id}/evaluate", response_model=EvaluationResponse)
async def evaluate_paper(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read the cached evaluation for a paper. The workflow generates it; this is a read-only fetch."""
    paper = await get_paper_by_slug(db, paper_id)
    if not paper:
        raise HTTPException(404, f"Paper '{paper_id}' not found")

    if paper.status != PaperStatus.READY.value:
        raise HTTPException(409, f"Paper status is '{paper.status}'. Wait for it to reach 'ready'.")

    result = await db.execute(select(Evaluation).where(Evaluation.paper_id == paper.id))
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(404, f"No evaluation persisted for paper '{paper_id}'")

    return EvaluationResponse(
        id=str(evaluation.id),
        paper_id=paper_id,
        claim_summary=evaluation.claim_summary,
        method_overview=evaluation.method_overview,
        method_visual=evaluation.method_visual_svg or "",
        evidence_assessment=evaluation.evidence_assessment,
        evidence_strength=evaluation.evidence_strength,
        prerequisites=evaluation.prerequisites or [],
        reading_time_estimates=evaluation.reading_time_estimates
        or {"conceptual": 10, "technical": 20, "formal": 35},
        created_at=evaluation.created_at.isoformat() if evaluation.created_at else "",
    )
