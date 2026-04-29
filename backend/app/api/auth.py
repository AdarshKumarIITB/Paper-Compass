import logging
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.jwt import issue_session_token
from app.auth.oauth import build_authorize_url, exchange_code_for_profile
from app.config import settings
from app.database import get_db
from app.models.user import User

router = APIRouter()
log = logging.getLogger(__name__)

OAUTH_STATE_COOKIE = "pc_oauth_state"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.jwt_expiry_hours * 3600,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/")


@router.get("/auth/google/start")
async def google_start():
    """Kick off Google OAuth. Sets a state cookie and redirects to Google."""
    state = secrets.token_urlsafe(24)
    url = build_authorize_url(state=state)
    response = RedirectResponse(url=url, status_code=302)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        max_age=600,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


@router.get("/auth/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    state_cookie: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    """Exchange the OAuth code, upsert the user, set the session cookie, redirect to FRONTEND_URL."""
    if not state_cookie or state_cookie != state:
        raise HTTPException(400, "OAuth state mismatch")

    try:
        claims = await exchange_code_for_profile(code)
    except Exception:
        log.exception("Google OAuth exchange failed")
        raise HTTPException(502, "Google sign-in failed")

    sub = claims.get("sub")
    email = claims.get("email")
    if not sub or not email:
        raise HTTPException(502, "Google profile missing sub/email")

    # Upsert user by google_sub
    result = await db.execute(select(User).where(User.google_sub == sub))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            google_sub=sub,
            email=email,
            name=claims.get("name") or "",
            picture_url=claims.get("picture") or "",
        )
        db.add(user)
    else:
        user.email = email
        user.name = claims.get("name") or user.name
        user.picture_url = claims.get("picture") or user.picture_url
    await db.commit()
    await db.refresh(user)

    token = issue_session_token(str(user.id))
    response = RedirectResponse(url=settings.frontend_url + "/home", status_code=302)
    _set_session_cookie(response, token)
    response.delete_cookie(key=OAUTH_STATE_COOKIE, path="/")
    return response


@router.get("/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "pictureUrl": current_user.picture_url,
        "depthCalibration": current_user.depth_calibration,
        "onboardingCompleted": current_user.onboarding_completed,
    }


@router.post("/auth/logout")
async def logout(response: Response):
    _clear_session_cookie(response)
    return {"status": "ok"}
