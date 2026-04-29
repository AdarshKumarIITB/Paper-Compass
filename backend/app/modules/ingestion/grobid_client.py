import httpx

from app.config import settings


class GrobidError(Exception):
    pass


async def is_grobid_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.grobid_url}/api/isalive")
            return resp.status_code == 200
    except httpx.HTTPError:
        return False


async def parse_pdf(pdf_bytes: bytes) -> str:
    """Send a PDF to GROBID and return TEI XML string."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.grobid_url}/api/processFulltextDocument",
            files={"input": ("paper.pdf", pdf_bytes, "application/pdf")},
            data={"consolidateHeader": "1", "consolidateCitations": "0"},
        )
    if resp.status_code != 200:
        raise GrobidError(f"GROBID returned status {resp.status_code}: {resp.text[:200]}")
    return resp.text
