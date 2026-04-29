"""Google OIDC (Authorization Code) flow.

Two functions: build the authorize URL, and exchange the code for the user profile.
authlib handles the heavy lifting (token endpoint POST, ID-token verification).
"""
from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.jose import jwt as jose_jwt
import httpx

from app.config import settings

GOOGLE_AUTHZ = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs"
SCOPES = ["openid", "email", "profile"]


def build_authorize_url(state: str) -> str:
    if not settings.google_client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured")
    client = AsyncOAuth2Client(
        client_id=settings.google_client_id,
        redirect_uri=settings.google_redirect_uri,
        scope=" ".join(SCOPES),
    )
    url, _ = client.create_authorization_url(GOOGLE_AUTHZ, state=state)
    return url


async def exchange_code_for_profile(code: str) -> dict:
    """Exchange an OAuth code for a token, then return the verified ID-token claims.

    Returns a dict with at least: sub, email, email_verified, name, picture.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise RuntimeError("Google OAuth credentials are not configured")

    async with AsyncOAuth2Client(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=settings.google_redirect_uri,
    ) as client:
        token = await client.fetch_token(GOOGLE_TOKEN, code=code, grant_type="authorization_code")

    id_token = token.get("id_token")
    if not id_token:
        raise RuntimeError("Google did not return an id_token")

    async with httpx.AsyncClient(timeout=10) as c:
        jwks = (await c.get(GOOGLE_JWKS)).json()
    claims = jose_jwt.decode(id_token, jwks)
    claims.validate()  # exp/iat/nbf
    return dict(claims)
