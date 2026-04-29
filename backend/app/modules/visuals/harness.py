"""Generate-validate loop coordinator."""
from __future__ import annotations

import logging

from app.modules.visuals.generator import run_generator
from app.modules.visuals.renderer import SvgRenderError, svg_to_png
from app.modules.visuals.types import VisualIntent, VisualResult
from app.modules.visuals.validator import run_validator

log = logging.getLogger(__name__)

DEFAULT_MAX_ITERATIONS = 3


async def generate_visual(
    *,
    intent: VisualIntent,
    content: str,
    paper_title: str,
    depth: str,
    section_title: str | None = None,
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
) -> VisualResult:
    """Drive the generate-validate loop. Always returns a VisualResult.

    On success, `svg` is approved markup. On exhaustion, returns the highest-
    scoring attempt seen (still rendered). On total failure, `svg` is None.
    """
    feedback: str | None = None
    best: dict | None = None  # {"svg": str, "score": int|None, "issues": list[str]}

    for i in range(1, max_iterations + 1):
        svg = await run_generator(
            intent=intent.value,
            depth=depth,
            paper_title=paper_title,
            section_title=section_title,
            content=content,
            feedback=feedback,
        )
        if not svg:
            feedback = (
                "Your previous output had no parseable <svg>...</svg> block. "
                "Return ONLY the SVG markup, starting with <svg and ending with </svg>."
            )
            log.info("visual loop iter=%d: empty svg", i)
            continue

        try:
            png = svg_to_png(svg)
        except SvgRenderError as e:
            feedback = (
                f"Your SVG failed to render: {e}. Common fixes: close all tags, "
                "escape ampersands as &amp;, ensure viewBox is valid."
            )
            log.info("visual loop iter=%d: render error: %s", i, e)
            continue

        verdict = await run_validator(
            intent=intent.value, depth=depth, content=content, png_bytes=png
        )
        if verdict is None:
            # Validator unreachable: accept the SVG as-is (don't punish on infra error)
            log.warning("visual loop iter=%d: validator unavailable, accepting svg", i)
            return VisualResult(
                svg=svg,
                approved=False,
                iterations=i,
                score=None,
                quality_notes=["validator unavailable"],
            )

        # Track best-so-far for fallback after exhaustion
        if best is None or (verdict.score or 0) > (best["score"] or 0):
            best = {"svg": svg, "score": verdict.score, "issues": list(verdict.issues)}

        log.info(
            "visual loop iter=%d intent=%s score=%d approved=%s issues=%d",
            i, intent.value, verdict.score, verdict.approved, len(verdict.issues),
        )

        if verdict.approved:
            return VisualResult(
                svg=svg,
                approved=True,
                iterations=i,
                score=verdict.score,
                quality_notes=[],
            )

        feedback = "Issues to fix:\n" + "\n".join(f"- {x}" for x in verdict.issues)

    # Exhausted iterations
    if best is None:
        return VisualResult(
            svg=None,
            approved=False,
            iterations=max_iterations,
            score=None,
            quality_notes=["all attempts failed to render or produce SVG"],
        )
    return VisualResult(
        svg=best["svg"],
        approved=False,
        iterations=max_iterations,
        score=best["score"],
        quality_notes=best["issues"],
    )
