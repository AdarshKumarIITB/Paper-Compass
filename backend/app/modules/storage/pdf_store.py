"""PDF storage abstraction. Local filesystem now; S3 later by adding an alt class."""
from __future__ import annotations

import hashlib
import uuid
from pathlib import Path
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.paper import PdfFile


class PdfStore(Protocol):
    async def save(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        paper_id: uuid.UUID,
        source: str,
        pdf_bytes: bytes,
    ) -> PdfFile: ...

    async def read(self, pdf_file: PdfFile) -> bytes: ...

    async def delete(self, db: AsyncSession, pdf_file: PdfFile) -> None: ...


class LocalPdfStore:
    """Stores PDFs at {pdf_storage_dir}/{user_id}/{paper_id}.pdf and persists a PdfFile row."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)

    def _path_for(self, user_id: uuid.UUID, paper_id: uuid.UUID) -> Path:
        return self.root / str(user_id) / f"{paper_id}.pdf"

    async def save(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        paper_id: uuid.UUID,
        source: str,
        pdf_bytes: bytes,
    ) -> PdfFile:
        path = self._path_for(user_id, paper_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(pdf_bytes)
        sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        # Upsert: if a PdfFile already exists for this user+paper, replace its metadata.
        result = await db.execute(
            select(PdfFile).where(
                PdfFile.user_id == user_id,
                PdfFile.paper_id == paper_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.source = source
            existing.storage_path = str(path)
            existing.bytes_size = len(pdf_bytes)
            existing.sha256 = sha256
            await db.flush()
            return existing

        pdf = PdfFile(
            user_id=user_id,
            paper_id=paper_id,
            source=source,
            storage_path=str(path),
            bytes_size=len(pdf_bytes),
            sha256=sha256,
        )
        db.add(pdf)
        await db.flush()
        return pdf

    async def read(self, pdf_file: PdfFile) -> bytes:
        return Path(pdf_file.storage_path).read_bytes()

    async def delete(self, db: AsyncSession, pdf_file: PdfFile) -> None:
        path = Path(pdf_file.storage_path)
        if path.exists():
            path.unlink()
        await db.delete(pdf_file)


_singleton: LocalPdfStore | None = None


def get_pdf_store() -> PdfStore:
    global _singleton
    if _singleton is None:
        _singleton = LocalPdfStore(settings.pdf_storage_dir)
    return _singleton
