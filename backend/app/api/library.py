from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.comprehension import ComprehensionState
from app.models.paper import Paper, UserPaper
from app.models.user import User
from app.schemas.paper import PapersResponse
from app.utils.mappers import paper_model_to_response

router = APIRouter()


@router.get("/library", response_model=PapersResponse)
async def get_library(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the signed-in user's library, most recently viewed first."""
    papers_result = await db.execute(
        select(Paper, UserPaper.match_acknowledged_at)
        .join(UserPaper, UserPaper.paper_id == Paper.id)
        .where(UserPaper.user_id == current_user.id)
        .order_by(UserPaper.viewed_at.desc())
    )
    rows = papers_result.all()

    # Single query for the deep-dive set; cheap O(N) lookup below.
    deep_dive_ids = set(
        (
            await db.execute(
                select(ComprehensionState.paper_id).where(
                    ComprehensionState.user_id == current_user.id
                )
            )
        ).scalars().all()
    )

    return PapersResponse(
        papers=[
            paper_model_to_response(
                paper,
                match_acknowledged=ack_at is not None,
                has_deep_dive=paper.id in deep_dive_ids,
            )
            for paper, ack_at in rows
        ]
    )
