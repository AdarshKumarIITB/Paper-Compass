from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:localdev@localhost:5432/papercompass"
    anthropic_api_key: str = ""
    grobid_url: str = "http://localhost:8070"
    semantic_scholar_api_key: str = ""
    # NoDecode keeps pydantic-settings from JSON-parsing the env value before our validator
    # runs, so we can accept either a JSON list or a comma-separated string.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    # OAuth (Google)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Session JWT
    jwt_secret: str = ""
    jwt_expiry_hours: int = 24 * 30
    session_cookie_name: str = "pc_session"
    session_cookie_secure: bool = False  # set True behind HTTPS

    # Frontend (used for OAuth post-login redirect)
    frontend_url: str = "http://localhost:8080"

    # PDF storage
    pdf_storage_dir: str = "./storage/pdfs"

    # When true, FastAPI mounts /app/static at "/" so the built Vite frontend is served
    # from the same origin as the API.
    serve_frontend: bool = True

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        # Railway/Heroku-style URLs use the `postgres://` or `postgresql://` scheme;
        # SQLAlchemy needs the asyncpg driver explicitly.
        if not isinstance(v, str):
            return v
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://") and "+asyncpg" not in v.split("://", 1)[0]:
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors(cls, v):
        # Accept either a JSON list or a comma-separated string from env vars.
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                import json
                return json.loads(s)
            return [o.strip() for o in s.split(",") if o.strip()]
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
