from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import Paper


async def get_paper_by_slug(db: AsyncSession, slug: str) -> Paper | None:
    result = await db.execute(select(Paper).where(Paper.slug == slug))
    return result.scalar_one_or_none()
