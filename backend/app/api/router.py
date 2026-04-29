from fastapi import APIRouter

from app.api import auth, discover, papers, evaluate, sections, threads, library, onboarding

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(discover.router, tags=["discover"])
api_router.include_router(papers.router, tags=["papers"])
api_router.include_router(evaluate.router, tags=["evaluate"])
api_router.include_router(sections.router, tags=["sections"])
api_router.include_router(threads.router, tags=["threads"])
api_router.include_router(library.router, tags=["library"])
api_router.include_router(onboarding.router, tags=["onboarding"])
