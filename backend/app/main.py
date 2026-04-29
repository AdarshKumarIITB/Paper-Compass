from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.config import settings
from app.modules.discover.semantic_scholar import close_client as close_ss_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_ss_client()


app = FastAPI(title="Paper Compass API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"status": "ok"}


# Serve the Vite-built frontend at the root when the static dir exists.
# Place this AFTER the API router so /api/* always wins.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if settings.serve_frontend and STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str, request: Request):
        # API and health are handled before this catch-all by FastAPI's route order;
        # this only fires for non-API paths. Serve the requested file if it exists,
        # otherwise serve index.html so the React Router takes over.
        if full_path.startswith("api/"):
            raise HTTPException(404)
        target = STATIC_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        index = STATIC_DIR / "index.html"
        if index.is_file():
            return FileResponse(index)
        raise HTTPException(404)
