from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.comprehension import CalibrateRequest

router = APIRouter()


@router.post("/users/calibrate")
async def calibrate_user(
    request: CalibrateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Persist the user's default comprehension depth."""
    current_user.depth_calibration = request.default_depth
    current_user.onboarding_completed = True
    await db.commit()
    return {"status": "ok", "defaultDepth": request.default_depth}
