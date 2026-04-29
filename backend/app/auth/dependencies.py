import uuid

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.auth.jwt import InvalidSession, decode_session_token


def _make_get_current_user():
    """Build the dependency at module import so the cookie alias is fixed to settings."""
    cookie_name = settings.session_cookie_name

    async def get_current_user(
        session_token: str | None = Cookie(default=None, alias=cookie_name),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not session_token:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
        try:
            user_id = decode_session_token(session_token)
        except InvalidSession:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
        user = await db.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
        return user

    return get_current_user


get_current_user = _make_get_current_user()
