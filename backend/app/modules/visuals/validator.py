"""Validator agent: Haiku 4.5 with vision evaluates a rendered diagram PNG."""
from __future__ import annotations

import base64
import json
import logging
import re
from dataclasses import dataclass
from typing import Literal

import anthropic
from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.modules.visuals.prompts import VALIDATOR_SYSTEM_PROMPT, build_validator_text_prompt

log = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 400
TEMPERATURE = 0.0

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


class ValidatorVerdict(BaseModel):
    approved: bool
    score: int = Field(ge=0, le=10)
    issues: list[str] = Field(default_factory=list)
    summary: str = ""


_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


def _parse_verdict(text: str) -> ValidatorVerdict | None:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.lower().startswith("json"):
            candidate = candidate[4:].lstrip()
    if not candidate.startswith("{"):
        m = _JSON_BLOCK.search(candidate)
        if not m:
            return None
        candidate = m.group(0)
    try:
        data = json.loads(candidate)
        return ValidatorVerdict(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        log.warning("Validator JSON parse failed: %s | raw=%r", e, text[:200])
        return None


async def run_validator(
    *,
    intent: str,
    depth: str,
    content: str,
    png_bytes: bytes,
) -> ValidatorVerdict | None:
    """Send rendered PNG + source content to Haiku. Return verdict or None on error."""
    text_prompt = build_validator_text_prompt(intent=intent, depth=depth, content=content)
    image_b64 = base64.standard_b64encode(png_bytes).decode("ascii")

    client = _get_client()
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=VALIDATOR_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": text_prompt},
                    ],
                }
            ],
        )
    except anthropic.APIError as e:
        log.warning("Visual validator call failed: %s", e)
        return None

    text = "".join(block.text for block in response.content if hasattr(block, "text"))
    return _parse_verdict(text)
