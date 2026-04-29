"""Generator agent: Sonnet 4.6 produces an SVG diagram for the given content."""
from __future__ import annotations

import logging

import anthropic

from app.config import settings
from app.modules.visuals.prompts import GENERATOR_SYSTEM_PROMPT, build_generator_prompt
from app.modules.visuals.renderer import safe_extract_and_sanitize

log = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-5-20250929"  # Sonnet 4.6
MAX_TOKENS = 4096
TEMPERATURE = 0.4

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def run_generator(
    *,
    intent: str,
    depth: str,
    paper_title: str,
    section_title: str | None,
    content: str,
    feedback: str | None,
) -> str | None:
    """Returns sanitized SVG markup, or None if the model produced no usable SVG."""
    user_prompt = build_generator_prompt(
        intent=intent,
        depth=depth,
        paper_title=paper_title,
        section_title=section_title,
        content=content,
        feedback=feedback,
    )
    client = _get_client()
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=GENERATOR_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as e:
        log.warning("Visual generator call failed: %s", e)
        return None

    text = "".join(block.text for block in response.content if hasattr(block, "text"))
    return safe_extract_and_sanitize(text)
