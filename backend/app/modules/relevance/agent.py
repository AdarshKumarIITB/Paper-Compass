"""Relevance agent: one short Haiku 4.5 call deciding if two paper descriptions
refer to the same paper.

Contract: never raises. On any failure (timeout, API error, malformed JSON), returns
a permissive `match` verdict — the workflow continues and the user catches mismatches
visually if they slip through. False-positive auto-rejection is impossible by design.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Literal

import anthropic
from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.modules.relevance.prompts import SYSTEM_PROMPT, build_user_prompt

log = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 200
TEMPERATURE = 0.0  # deterministic for the same input
TIMEOUT_SECONDS = 8.0
ABSTRACT_CAP_CHARS = 600
AUTHOR_CAP = 5

Verdict = Literal["match", "mismatch", "uncertain"]


class RelevanceVerdict(BaseModel):
    verdict: Verdict
    reason: str = Field(max_length=240)


_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


def to_agent_payload(p: dict) -> dict:
    """Normalize a paper-shaped dict to exactly what the agent reads."""
    raw_authors = p.get("authors") or []
    authors: list[str] = []
    for a in raw_authors:
        if isinstance(a, dict):
            name = a.get("name") or ""
        else:
            name = str(a)
        if name.strip():
            authors.append(name.strip())
    return {
        "title": (p.get("title") or "").strip(),
        "authors": authors[:AUTHOR_CAP],
        "year": p.get("year") or None,
        "abstract": (p.get("abstract") or "").strip()[:ABSTRACT_CAP_CHARS],
    }


_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


def _parse_response(text: str) -> RelevanceVerdict | None:
    """Tolerant JSON extraction. Some models wrap output in code fences."""
    candidate = text.strip()
    # Strip code fences if present
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.lower().startswith("json"):
            candidate = candidate[4:].lstrip()
    # Fall back to first {...} block in the text
    if not candidate.startswith("{"):
        m = _JSON_BLOCK.search(candidate)
        if not m:
            return None
        candidate = m.group(0)
    try:
        data = json.loads(candidate)
        return RelevanceVerdict(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        log.warning("Relevance agent JSON parse failed: %s | raw=%r", e, text[:200])
        return None


async def check_relevance(intended: dict, parsed: dict) -> RelevanceVerdict:
    """One Haiku call. Defaults to a permissive 'match' on any error."""
    intended_payload = to_agent_payload(intended)
    parsed_payload = to_agent_payload(parsed)
    user_prompt = build_user_prompt(intended_payload, parsed_payload)

    client = _get_client()

    try:
        async with asyncio.timeout(TIMEOUT_SECONDS):
            response = await client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                temperature=TEMPERATURE,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
    except (asyncio.TimeoutError, anthropic.APIError) as e:
        log.warning("Relevance agent call failed: %s", type(e).__name__)
        return RelevanceVerdict(verdict="match", reason="agent unavailable; defaulted to match")

    text = "".join(block.text for block in response.content if hasattr(block, "text"))
    parsed_verdict = _parse_response(text)
    if parsed_verdict is None:
        # Retry once with a stricter user prompt
        try:
            async with asyncio.timeout(TIMEOUT_SECONDS):
                retry = await client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    temperature=TEMPERATURE,
                    system=SYSTEM_PROMPT,
                    messages=[
                        {"role": "user", "content": user_prompt},
                        {"role": "assistant", "content": text},
                        {
                            "role": "user",
                            "content": (
                                "Your previous response was not strict JSON. "
                                "Reply with ONLY the JSON object, nothing else."
                            ),
                        },
                    ],
                )
            text2 = "".join(block.text for block in retry.content if hasattr(block, "text"))
            parsed_verdict = _parse_response(text2)
        except (asyncio.TimeoutError, anthropic.APIError):
            parsed_verdict = None

    if parsed_verdict is None:
        return RelevanceVerdict(
            verdict="match", reason="agent response unparseable; defaulted to match"
        )

    return parsed_verdict
