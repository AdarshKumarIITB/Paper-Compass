from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

ALGO = "HS256"


class InvalidSession(Exception):
    pass


def issue_session_token(user_id: str) -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not configured")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_expiry_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def decode_session_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
    except jwt.PyJWTError as e:
        raise InvalidSession(str(e))
    sub = payload.get("sub")
    if not sub:
        raise InvalidSession("missing sub")
    return sub
