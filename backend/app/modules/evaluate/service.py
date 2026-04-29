import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import Paper
from app.models.section import Section
from app.models.evaluation import Evaluation
from app.modules.llm.client import generate
from app.modules.llm.response_parser import parse_json_response
from app.modules.llm.prompts.explanation import (
    EVALUATION_SYSTEM_PROMPT,
    build_evaluation_prompt,
)
from app.modules.visuals import VisualIntent, generate_visual

log = logging.getLogger(__name__)


async def get_or_generate_evaluation(
    db: AsyncSession,
    paper: Paper,
) -> Evaluation:
    """Return a cached evaluation or generate a new one via the LLM + visual subsystem."""
    result = await db.execute(select(Evaluation).where(Evaluation.paper_id == paper.id))
    cached = result.scalar_one_or_none()
    if cached:
        return cached

    # Fetch sections for context
    result = await db.execute(
        select(Section).where(Section.paper_id == paper.id).order_by(Section.order)
    )
    sections = result.scalars().all()
    section_texts = [f"## {s.title}\n{s.text}" for s in sections]

    # Step A — content (no SVG anymore)
    prompt = build_evaluation_prompt(
        paper_title=paper.title,
        paper_abstract=paper.abstract or "",
        section_texts=section_texts,
    )
    raw_response = await generate(
        system_prompt=EVALUATION_SYSTEM_PROMPT,
        user_prompt=prompt,
    )
    parsed = parse_json_response(raw_response)
    method_overview = parsed.get("methodOverview", "")

    # Step B — method diagram via the visual subsystem (separate agents w/ verifier loop)
    visual_svg = ""
    visual_score: int | None = None
    visual_iterations = 0
    visual_approved = False
    if method_overview.strip():
        try:
            vis = await generate_visual(
                intent=VisualIntent.METHOD_ARCHITECTURE,
                content=method_overview,
                paper_title=paper.title,
                depth="technical",
            )
            visual_svg = vis.svg or ""
            visual_score = vis.score
            visual_iterations = vis.iterations
            visual_approved = vis.approved
        except Exception:
            log.exception("Visual subsystem failed for paper=%s; persisting eval without diagram", paper.slug)

    evaluation = Evaluation(
        paper_id=paper.id,
        claim_summary=parsed.get("claimSummary", ""),
        method_overview=method_overview,
        method_visual_svg=visual_svg,
        method_visual_quality_score=visual_score,
        method_visual_iterations=visual_iterations,
        method_visual_approved=visual_approved,
        evidence_assessment=parsed.get("evidenceAssessment", ""),
        evidence_strength=parsed.get("evidenceStrength", "mixed"),
        prerequisites=parsed.get("prerequisites", []),
        reading_time_estimates=parsed.get(
            "readingTimeEstimates", {"conceptual": 10, "technical": 20, "formal": 35}
        ),
    )
    db.add(evaluation)
    await db.commit()
    await db.refresh(evaluation)
    return evaluation
