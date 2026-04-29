"""Two chat agents that share the Thread/ThreadMessage schema:

- Term thread: scoped to a section + a user-highlighted phrase. Each highlight is a
  fresh thread, multi-turn within itself.
- Copilot: one persistent thread per (user, paper) for broad questions. Built with
  paper-level context (abstract + evaluation summary + section list).
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation import Evaluation
from app.models.paper import Paper
from app.models.section import Section
from app.models.thread import Thread, ThreadMessage
from app.models.user import User
from app.modules.discover import semantic_scholar as s2
from app.modules.llm.client import generate
from app.modules.llm.prompts.threads import (
    COPILOT_SYSTEM,
    RECOMMEND_SYSTEM,
    TERM_THREAD_SYSTEM,
)

log = logging.getLogger(__name__)

HISTORY_WINDOW = 6  # last N messages threaded into the prompt
LIMITATION_RE = re.compile(r"\b(limitation|weakness|threat|drawback|caveat|shortcoming)", re.I)
LIMITATION_SECTION_TITLES = ("limitation", "discussion", "threats to validity", "future work", "conclusion")


# ----------------- helpers -----------------


def _format_history(messages: Iterable[ThreadMessage], appended_user: str | None = None) -> str:
    lines = [f"{m.role}: {m.content}" for m in messages]
    if appended_user:
        lines.append(f"user: {appended_user}")
    return "\n".join(lines[-HISTORY_WINDOW:])


async def _load_evaluation_summary(db: AsyncSession, paper: Paper) -> str:
    """Compact stringified evaluation for the copilot prompt. Empty string if missing."""
    row = (
        await db.execute(select(Evaluation).where(Evaluation.paper_id == paper.id))
    ).scalar_one_or_none()
    if not row:
        return ""
    prereqs = row.prerequisites or []
    prereqs_str = ", ".join(
        f"{p.get('name')} ({p.get('level','')})" if isinstance(p, dict) else str(p)
        for p in prereqs[:8]
    )
    return (
        f"Claim: {row.claim_summary}\n"
        f"Method: {row.method_overview}\n"
        f"Evidence ({row.evidence_strength}): {row.evidence_assessment}\n"
        f"Prerequisites: {prereqs_str}"
    )


async def _load_section_titles(db: AsyncSession, paper: Paper) -> list[str]:
    rows = (
        await db.execute(
            select(Section.title).where(Section.paper_id == paper.id).order_by(Section.order)
        )
    ).all()
    return [r[0] for r in rows]


async def _load_limitations_text(db: AsyncSession, paper: Paper, max_chars: int = 1500) -> str:
    """Return the first ~1500 chars of the section whose title looks like a limitations
    or discussion section. Empty string if no match — caller falls back to existing context."""
    rows = (
        await db.execute(
            select(Section.title, Section.text)
            .where(Section.paper_id == paper.id)
            .order_by(Section.order)
        )
    ).all()
    for title, text in rows:
        if not title:
            continue
        lower = title.lower()
        if any(needle in lower for needle in LIMITATION_SECTION_TITLES):
            return f"{title}\n\n{(text or '')[:max_chars]}"
    return ""


# ----------------- term threads -----------------


async def create_term_thread(
    db: AsyncSession,
    *,
    user: User,
    paper: Paper,
    section: Section,
    selected_text: str,
    depth_level: str,
) -> Thread:
    """Create a fresh term thread with an initial AI response addressing the highlight."""
    prompt = (
        f'Paper: "{paper.title}"\n'
        f"Abstract: {paper.abstract or '(unavailable)'}\n\n"
        f"Section title: {section.title}\n"
        f"Section text:\n{section.text[:3000]}\n\n"
        f'User highlighted: "{selected_text}"\n'
        f"User depth preference: {depth_level}\n\n"
        f'Explain the highlighted phrase as it is used in this section of the paper.'
    )
    response_text = await generate(
        system_prompt=TERM_THREAD_SYSTEM,
        user_prompt=prompt,
    )

    thread = Thread(
        user_id=user.id,
        paper_id=paper.id,
        thread_type="term",
        section_id=section.id,
        term=(selected_text[:120] if selected_text else None),
        selected_text=selected_text,
        depth_level=depth_level,
    )
    db.add(thread)
    await db.flush()

    db.add(ThreadMessage(thread_id=thread.id, role="system", content=response_text))
    await db.commit()
    await db.refresh(thread)
    return thread


async def reply_to_term_thread(
    db: AsyncSession,
    thread: Thread,
    paper: Paper,
    section: Section,
    user_content: str,
) -> ThreadMessage:
    user_msg = ThreadMessage(thread_id=thread.id, role="user", content=user_content)
    db.add(user_msg)
    await db.flush()

    history = _format_history(thread.messages, appended_user=user_content)
    prompt = (
        f'Paper: "{paper.title}"\n'
        f"Abstract: {paper.abstract or '(unavailable)'}\n\n"
        f"Section: {section.title}\n{section.text[:2000]}\n\n"
        f'Highlighted phrase: "{thread.selected_text or thread.term or ""}"\n'
        f"Depth: {thread.depth_level}\n\n"
        f"Conversation so far:\n{history}\n\n"
        f"Respond to the user's latest message."
    )
    response_text = await generate(system_prompt=TERM_THREAD_SYSTEM, user_prompt=prompt)

    system_msg = ThreadMessage(thread_id=thread.id, role="system", content=response_text)
    db.add(system_msg)
    await db.commit()
    await db.refresh(system_msg)
    return system_msg


# ----------------- copilot -----------------


async def find_or_create_copilot_thread(
    db: AsyncSession,
    *,
    user: User,
    paper: Paper,
    depth_level: str = "technical",
) -> Thread:
    """Idempotent: returns the user's existing copilot thread for this paper, or creates one."""
    existing = (
        await db.execute(
            select(Thread).where(
                Thread.user_id == user.id,
                Thread.paper_id == paper.id,
                Thread.thread_type == "paper",
            )
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    thread = Thread(
        user_id=user.id,
        paper_id=paper.id,
        thread_type="paper",
        depth_level=depth_level,
    )
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


async def reply_to_copilot_thread(
    db: AsyncSession,
    thread: Thread,
    paper: Paper,
    user_content: str,
) -> ThreadMessage:
    user_msg = ThreadMessage(thread_id=thread.id, role="user", content=user_content)
    db.add(user_msg)
    await db.flush()

    eval_summary = await _load_evaluation_summary(db, paper)
    section_titles = await _load_section_titles(db, paper)

    # When the user is asking about limitations/weaknesses, pull the discussion-like
    # section's text so the LLM has more than just titles to ground on.
    limitations_block = ""
    if LIMITATION_RE.search(user_content):
        limitations_block = await _load_limitations_text(db, paper)

    authors = ", ".join(a.get("name", "") for a in (paper.authors or []) if isinstance(a, dict))
    sections_block = "\n".join(f"  {i+1}. {t}" for i, t in enumerate(section_titles)) or "(none)"
    history = _format_history(thread.messages, appended_user=user_content)

    prompt = (
        f'Paper: "{paper.title}"\n'
        f"Authors: {authors or '(unknown)'}\n"
        f"Abstract: {paper.abstract or '(unavailable)'}\n\n"
        f"Evaluation summary:\n{eval_summary or '(none yet)'}\n\n"
        f"Section list:\n{sections_block}\n\n"
    )
    if limitations_block:
        prompt += f"Discussion/limitations section text:\n{limitations_block}\n\n"
    prompt += (
        f"Depth: {thread.depth_level}\n\n"
        f"Conversation so far:\n{history}\n\n"
        f"Respond to the user's latest message about this paper."
    )
    response_text = await generate(system_prompt=COPILOT_SYSTEM, user_prompt=prompt)

    system_msg = ThreadMessage(thread_id=thread.id, role="system", content=response_text)
    db.add(system_msg)
    await db.commit()
    await db.refresh(system_msg)
    return system_msg


# ----------------- recommendations -----------------


def _format_candidate(p: dict) -> str:
    """Compact text representation of one S2 candidate for the LLM prompt."""
    title = (p.get("title") or "").strip()
    year = p.get("year") or "?"
    authors_list = p.get("authors") or []
    authors = ", ".join(a.get("name", "") for a in authors_list[:3] if isinstance(a, dict))
    if len(authors_list) > 3:
        authors += " et al."
    abstract = (p.get("abstract") or "").strip()
    if len(abstract) > 600:
        abstract = abstract[:600] + "…"
    citations = p.get("citationCount") or 0
    return (
        f"- Title: {title}\n"
        f"  Authors: {authors or '(unknown)'}\n"
        f"  Year: {year}    Citations: {citations}\n"
        f"  Abstract: {abstract or '(no abstract)'}"
    )


def _dedupe_and_filter(candidates: list[dict], max_n: int = 25) -> list[dict]:
    """Drop duplicates by paperId, drop entries without an abstract, and cap the list."""
    seen: set[str] = set()
    out: list[dict] = []
    for p in candidates:
        pid = p.get("paperId")
        if not pid or pid in seen:
            continue
        if not (p.get("abstract") or "").strip():
            continue
        seen.add(pid)
        out.append(p)
        if len(out) >= max_n:
            break
    return out


async def reply_with_recommendations(
    db: AsyncSession,
    thread: Thread,
    paper: Paper,
    user_content: str,
) -> ThreadMessage:
    """Persist the user message, fetch S2 candidates, ask the LLM to pick 3-5, and
    persist the formatted reply. Falls back gracefully on missing s2_id or S2 errors."""
    user_msg = ThreadMessage(thread_id=thread.id, role="user", content=user_content)
    db.add(user_msg)
    await db.flush()

    eval_summary = await _load_evaluation_summary(db, paper)
    candidates: list[dict] = []
    s2_failed = False

    if paper.semantic_scholar_id:
        try:
            refs, recs = await asyncio.gather(
                s2.get_references(paper.semantic_scholar_id, limit=20),
                s2.get_recommendations(paper.semantic_scholar_id, limit=20),
                return_exceptions=False,
            )
            candidates = _dedupe_and_filter(refs + recs, max_n=25)
        except Exception:
            log.exception("S2 references/recommendations failed for paper=%s", paper.semantic_scholar_id)
            s2_failed = True

    if s2_failed:
        response_text = (
            "I couldn't reach our recommendations service just now. "
            "Try again in a moment, or ask me a specific question about this paper "
            "and I'll point you toward what to read next based on the topic."
        )
    elif not candidates:
        # Either no s2_id, or S2 returned nothing useful. Give the LLM a chance to
        # suggest based on the abstract alone, but flag the limitation honestly.
        prompt = (
            f'Source paper: "{paper.title}"\n'
            f"Abstract: {paper.abstract or '(unavailable)'}\n\n"
            f"Evaluation summary:\n{eval_summary or '(none yet)'}\n\n"
            f"Depth: {thread.depth_level}\n\n"
            f"Candidate list:\n(empty — no recommendations index available for this paper)\n\n"
            f"User asked: {user_content}"
        )
        response_text = await generate(system_prompt=RECOMMEND_SYSTEM, user_prompt=prompt)
    else:
        candidates_block = "\n\n".join(_format_candidate(p) for p in candidates)
        prompt = (
            f'Source paper: "{paper.title}"\n'
            f"Abstract: {paper.abstract or '(unavailable)'}\n\n"
            f"Evaluation summary:\n{eval_summary or '(none yet)'}\n\n"
            f"Depth: {thread.depth_level}\n\n"
            f"Candidate list ({len(candidates)} papers — pick 3 to 5 of these):\n\n"
            f"{candidates_block}\n\n"
            f"User asked: {user_content}"
        )
        response_text = await generate(system_prompt=RECOMMEND_SYSTEM, user_prompt=prompt)

    system_msg = ThreadMessage(thread_id=thread.id, role="system", content=response_text)
    db.add(system_msg)
    await db.commit()
    await db.refresh(system_msg)
    return system_msg
