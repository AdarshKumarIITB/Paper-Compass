# Build Sequence: AI Research Assistant

## Team Assumptions

3 engineers: one frontend-leaning full-stack (FE), one backend-leaning full-stack (BE), one ML/prompt engineer (ML). All three can write backend code. The ML engineer owns prompt design, visual generation and LLM integration. The BE engineer owns infrastructure, data model, ingestion and API. The FE engineer owns the React SPA, rendering and state management. Overlap is expected and desirable on a team this size.

---

## Phase 1: Visual Generation Spike

**Duration:** 2 engineer-weeks (ML engineer, 2 calendar weeks)

**What you build:**

A standalone script that takes three inputs (a paper section's text, a content type from the 11-type taxonomy, a depth level) and outputs Mermaid syntax or a JSON visual specification. A second script renders the JSON specification to SVG. A third script renders Mermaid to PNG via mermaid-cli.

No UI, no API, no database. The scripts run from the command line.

**Test inputs:** 5 papers covering 7 content types:

1. Vaswani et al. 2017 ("Attention Is All You Need") — Architecture Description (Section 3), Algorithm Walkthrough (Section 3.2.1 scaled dot-product attention), Training Procedure (Section 5.3)
2. Ouyang et al. 2022 ("Training language models to follow instructions with RLHF") — Training/Optimization Procedure (the three-phase RLHF pipeline)
3. Kaplan et al. 2020 ("Scaling Laws for Neural Language Models") — Quantitative Results / Distributions (scaling curves)
4. Goodfellow et al. 2014 ("Generative Adversarial Nets") — Problem Formulation (the minimax objective), Training Procedure (alternating optimization)
5. A survey paper (e.g., Lin et al. 2022 attention survey) — Conceptual Framework / Taxonomy

For each test input, generate at all three depth levels (Conceptual, Technical, Formal). This produces ~20 test visuals covering 7 of 11 content types and all 3 depth levels.

**Pass/fail criteria:**
- Render success: ≥18 of 20 visuals render without errors (Mermaid parses, SVG is well-formed, node count within limits per Visual_explanation_taxonomy.md Section 2).
- Content accuracy: A human reviewer (any team member) rates ≥16 of 20 visuals as accurately representing the paper content (no fabricated components, no missing primary elements, correct data flow direction).
- Depth differentiation: For at least 4 of the 5 papers, the three depth levels produce visibly different visuals (not minor label changes, but structural differences: more nodes exposed, different annotation types, different levels of mathematical formality).
- The attention mechanism example from Design_choices.md (Conceptual/Technical/Formal attention diagrams) must match the described visual content at each level.

**Fallback if the spike fails:**

If render success is below 80%, switch from LLM-generated Mermaid to fully template-based Mermaid for Conceptual depth (pre-built flowchart templates per content type, filled with LLM-extracted labels). This sacrifices adaptability for reliability and reduces the visual generation problem to content extraction rather than diagram design.

If content accuracy is below 70%, the generation prompts need rework. Allocate 1 additional engineer-week for prompt iteration before proceeding. If accuracy remains below 70% after that week, the visual-first differentiator is at risk and the team should discuss scope reduction (visuals for 4-5 high-value content types only: Architecture, Algorithm, Training, Quantitative Comparison).

If depth differentiation fails, the prompts do not adequately separate the three explanation strategies. The fix is more explicit prompt structure: separate system prompts per depth level rather than a parameterized single prompt. Budget 3-4 days for this iteration.

**Dependencies:** None. This is the first phase.

---

## Phase 2: Paper Parsing and Section Classification

**Duration:** 2 engineer-weeks (BE engineer, 2 calendar weeks)

**Parallel with:** Phase 1 (no dependencies between them)

**What you build:**

1. A Docker container running GROBID, accessible via localhost REST API.
2. A parser module that sends a PDF to GROBID and converts the TEI XML response into Section entities (title, text, order, cross-references).
3. The heuristic pre-classifier: a function that takes a Section and returns content type probabilities based on title patterns, equation density, table presence, pseudocode detection, figure reference count and citation density (per Visual_explanation_taxonomy.md Section 4.1).
4. The LLM classifier: a function that takes a Section plus heuristic features and returns primary content type, optional secondary type and boundary (using the prompt from Visual_explanation_taxonomy.md Section 4.2).
5. A script that takes a PDF path and outputs a JSON array of classified sections.

**Test inputs:** The same 5 papers from Phase 1, plus 3 additional papers with non-standard formatting:
- A workshop paper (shorter, less structured)
- A preprint with unusual section naming
- A paper with extensive appendices

8 papers total, ~60-80 sections.

**Pass/fail criteria:**
- Section boundary accuracy: GROBID correctly identifies ≥85% of section boundaries across the 8 papers (verified manually against the PDFs).
- Classification accuracy: The heuristic + LLM pipeline correctly assigns the primary content type for ≥80% of sections (verified against manual labels). The Visual_explanation_taxonomy.md Section 4.1 estimates 70-75% for heuristics alone; adding the LLM should push this above 80%.
- Mixed-type detection: For sections that a human reviewer identifies as mixed-type, the classifier identifies at least the primary type correctly in ≥75% of cases and identifies the secondary type in ≥50%.
- Cross-reference extraction: ≥70% of explicit section references ("as described in Section 3") and equation references are correctly parsed and linked.

**Fallback if parsing fails:**

If GROBID section boundaries are below 80% accuracy, try GROBID with its consolidation mode (which applies heuristic post-processing). If still below 80%, evaluate switching to a heading-detection heuristic on pdftotext output as a fallback for papers where GROBID fails. Accept coarser sections (major headings only, missing subsections) rather than incorrect boundaries.

If classification accuracy is below 75%, increase the LLM model tier for classification from Sonnet to Opus. This roughly doubles classification cost (~$0.02 per section vs. ~$0.01) but is acceptable given that classification is a one-time cost per paper.

**Dependencies:** None (parallel with Phase 1).

---

## Phase 3: Depth-Adjusted Explanation Generation

**Duration:** 2 engineer-weeks (ML engineer, 2 calendar weeks)

**What you build:**

A script that takes a classified Section (from Phase 2's output) and a depth level and produces:
- A text explanation following the principles from Design_choices.md (analogies with explicit mappings at Conceptual, standard terminology at Technical, full mathematical treatment at Formal)
- A visual specification (Mermaid or JSON, using the approach validated in Phase 1)

The output is a structured JSON object containing both the explanation text and the visual specification, ready for rendering.

**Test inputs:** Select 10 sections from the Phase 2 test set, covering at least 6 content types. Generate explanations at all 3 depth levels (30 explanation + visual pairs).

**Pass/fail criteria:**
- Explanation quality: A human reviewer rates ≥24 of 30 explanations as meeting the depth level specification. For Conceptual: plain language, analogies present with A↔B mappings, "where this breaks down" notes present. For Technical: field terminology used, equations presented with verbal interpretation. For Formal: full mathematical treatment, proofs/derivations where applicable.
- Depth distinctness: For each section, the three depth levels produce explanations that a reviewer identifies as genuinely different strategies (per Design_choices.md: "intuition before formalism"). A reviewer who reads the Conceptual and Technical versions should be able to articulate what the Technical version adds beyond rewording. ≥8 of 10 sections must pass this test.
- Visual integration: The visual accompanies and relates to the explanation (not a standalone diagram disconnected from the text). ≥24 of 30 visual-explanation pairs are rated as integrated.
- Gray & Holyoak compliance: At Conceptual depth, ≥8 of 10 explanations include analogies with explicit A↔B mappings (principle 2) and "where this breaks down" notes (principle 3).
- Mayer compliance: ≥8 of 10 visuals include signaling (color coding, annotations per Design_choices.md conventions) and contain no decorative elements (coherence principle).

**Fallback:**

If Conceptual explanations lack proper analogies, the generation prompt needs restructuring. The most common failure mode is the LLM producing vague analogies ("like a filter") without explicit mappings. The fix: add few-shot examples to the prompt showing correct analogy format (the attention mechanism example from Design_choices.md serves as one). Budget 3-4 days for prompt iteration.

If depth levels feel like rewrites rather than different strategies, separate the three depth levels into three distinct system prompts rather than parameterizing a single prompt. Each system prompt encodes the specific explanation strategy for that depth level. Budget 3-4 days.

**Dependencies:** Phase 1 (visual generation approach validated), Phase 2 (classified sections as input).

---

## Phase 4: Evaluate Mode (End-to-End)

**Duration:** 2 engineer-weeks (BE + ML engineers, 2 calendar weeks)

**What you build:**

1. The Evaluation generation pipeline: takes a parsed paper (from Phase 2) and produces the structured evaluation (claim summary, method overview with visual, evidence assessment, prerequisite map, reading time estimate per MVP.md Section 3.2).
2. The Semantic Scholar client module: API wrapper with rate limiting, caching and error handling.
3. The PDF download path for DOI/URL entry: Semantic Scholar openAccessPdf lookup, Unpaywall fallback, metadata-only mode when no PDF is available.
4. The Paper and Evaluation entities in PostgreSQL.
5. A REST API endpoint: POST /evaluate with URL, DOI or PDF upload. Returns the Evaluation JSON.

No frontend yet. Tested via API calls (curl or Postman).

**Test inputs:** 5 papers via different entry paths:
- 2 via arXiv URL (should resolve to PDF via Semantic Scholar)
- 1 via DOI (with open access PDF available)
- 1 via DOI (without open access PDF, testing metadata-only mode)
- 1 via direct PDF upload

**Pass/fail criteria:**
- All 5 inputs produce an Evaluation response within 30 seconds.
- For the 4 papers with full text: claim summary, method overview, evidence assessment and prerequisite map are all present and rated as accurate by a reviewer.
- For the metadata-only paper: the system returns a partial evaluation with clear indication of what's missing and a prompt to upload the PDF.
- The method visual renders correctly and matches the paper's primary method.
- The Semantic Scholar client handles rate limiting correctly (does not exceed 1 req/sec without a partner key).

**Fallback:** If evaluation quality is poor, increase the context window by including more of the paper in the prompt (at higher token cost) or split the evaluation into multiple focused LLM calls (one for claim summary, one for evidence assessment, etc.) rather than a single call.

**Dependencies:** Phase 2 (parser), Phase 3 (explanation + visual generation for the method visual).

---

## Phase 5: Comprehend Mode (Core)

**Duration:** 3 engineer-weeks (all three engineers, 3 calendar weeks)

**What you build:**

1. The ComprehensionState entity and persistence (PostgreSQL).
2. The section-by-section explanation endpoint: GET /papers/{id}/sections/{id}/explain?depth=conceptual returns explanation text + visual specification.
3. The per-section depth override: PATCH /comprehension-state with per_section_depth updates, triggering regeneration of the affected section's explanation and visual.
4. Visual caching: check cache before generating, store after generating.
5. **The Comprehend UI** (FE engineer): section list with expand/collapse, explanation + visual rendering (Mermaid via mermaid.js, SVG inline, HTML for qualitative results), global depth selector, per-section deepen control.
6. The depth transition UX: crossfade with element highlighting (per the architecture document's ADR-1 fallback from full animation).

This is the first phase where all three engineers work in parallel: BE on the API and persistence, ML on the explanation/visual generation refinement, FE on the Comprehend UI.

**Test:** A human tester can:
1. Upload a PDF (the Vaswani attention paper).
2. See the Evaluate output.
3. Click "Read this paper" and enter Comprehend.
4. See sections listed. Expand a section and see explanation + visual at Conceptual depth.
5. Switch global depth to Technical. See explanations and visuals change.
6. Deepen one section to Formal while the rest stays Technical. See the two-phase expansion (Phase 1 intuitive, Phase 2 formal).
7. Close the browser, return, and resume where they left off.

**This is the end-to-end milestone.** Everything before this point is infrastructure and validation. Everything after is iteration and feature completion.

**Pass/fail criteria:**
- Steps 1-7 complete without errors.
- Section explanations at each depth level meet the Phase 3 quality criteria.
- Visual caching works (second load of the same section at the same depth is faster than first load).
- Session resumption restores the correct section, depth settings and scroll position.
- The Comprehend UI renders Mermaid and SVG visuals correctly in Chrome and Safari.

**Fallback:** If the full Comprehend UI is taking too long, ship a minimal version: section list with explanations rendered as markdown (no visual rendering, no depth transitions, no per-section deepening). Visuals are downloadable as images but not inline. This is ugly but functional and lets user testing begin on explanation quality while the UI catches up.

**Dependencies:** Phase 3 (explanation generation), Phase 4 (Evaluate pipeline, since Comprehend is entered from Evaluate).

---

## Phase 6: Thread Model

**Duration:** 2 engineer-weeks (BE + FE engineers, 2 calendar weeks)

**What you build:**

1. Thread and Message entities in PostgreSQL.
2. Thread creation: user selects text or a visual element, types a question. System generates parent context summary (Sonnet call per Research_Assistant.md), creates a Thread record, opens a chat panel.
3. Thread responses: LLM responds in the context of the parent summary + thread messages + paper section.
4. Thread return: system generates thread summary (Sonnet call), appends to main thread as system note, terms explained in the thread lose their "unfamiliar" affordance.
5. Thread UI: slide-over panel with breadcrumb navigation (Main → Thread title). "Back to main" button.
6. The inline affordances: terms the system detects as potentially unfamiliar are highlighted with a clickable indicator that opens a thread pre-seeded with "Explain [term]."

**Test:**
1. In the Comprehend view for a paper, click an unfamiliar term.
2. Thread opens with context from the main explanation.
3. Ask a follow-up question in the thread. The response is grounded in the paper and doesn't repeat what the main explanation already covered.
4. Return to main. The explained term is no longer highlighted as unfamiliar.
5. Open the thread again from the collapsible node. The full conversation is there.

**Pass/fail criteria:**
- Thread responses are contextually appropriate (they reference the paper, they don't contradict the main explanation, they don't re-explain concepts already covered in the main branch). ≥4 of 5 test threads pass a human review.
- Context summaries are accurate (the parent summary captures the main discussion up to the branch point, the thread summary captures what was discussed in the thread). ≥4 of 5.
- Thread state persists across sessions.
- The "unfamiliar term" detection identifies at least 60% of terms that a non-specialist reviewer would flag as needing explanation.

**Fallback:** If summary injection loses critical context (thread responses feel disconnected from the main explanation), increase the summary from 2-3 sentences to a structured summary format: key concepts discussed, current depth level, terms already explained. This uses more tokens per thread message but preserves more context. If that's still insufficient, include the last 3-5 messages from the main thread verbatim instead of a summary (higher token cost, but guaranteed context accuracy).

**Dependencies:** Phase 5 (Comprehend UI exists for threads to live in).

---

## Phase 7: Discover Mode

**Duration:** 1.5 engineer-weeks (BE + FE engineers, 1.5 calendar weeks)

**Parallel with:** Phase 6 (no dependency)

**What you build:**

1. The Discover UI: topic query input, time range and subfield filters, sort toggle (foundational vs. recent).
2. The discovery algorithm: semantic search via Semantic Scholar /paper/search, citation graph traversal via /paper/{id}/citations and /references, ranking by influential citation count, recency weighting.
3. Result display: paper cards with title, authors, year, citation count, influential citation count, TLDR (or generated summary), badge for previously evaluated papers.
4. Discover → Evaluate transition: click a result card, enter Evaluate mode.

**Test:** Search "attention mechanisms in transformers." Results include the Vaswani 2017 paper in the top 5. Results are ranked sensibly (foundational papers with high influential citation counts rank high). Clicking a result transitions to Evaluate.

**Pass/fail criteria:**
- Search returns relevant results for 5 test queries across different CS subfields.
- Ranking puts foundational papers above merely popular ones (tested by verifying that influential citation count correlates with result position).
- The Evaluate transition works end-to-end (from Discover result to Evaluate output).
- Rate limiting works (no 429 errors from Semantic Scholar).

**Fallback:** Discover is the lowest-risk feature. If the Semantic Scholar API has availability issues, cache results aggressively (24-hour TTL for search results, 7-day TTL for paper metadata). If the ranking algorithm produces poor results, fall back to Semantic Scholar's default relevance ranking and defer custom ranking to iteration.

**Dependencies:** Phase 4 (Evaluate mode, for the Discover → Evaluate transition).

---

## Phase 8: Investigation Branching

**Duration:** 2 engineer-weeks (all three engineers, 2 calendar weeks)

**What you build:**

1. Investigation and InvestigationNode entities in PostgreSQL.
2. The branching transitions: Comprehend → Evaluate (click a reference), Comprehend → Discover (explore a cited concept), Evaluate → Discover, Discover → Evaluate.
3. Session state serialization: when branching, the current mode's state is saved to the departing InvestigationNode.
4. The "return to where I was" mechanism: traversing the investigation tree back to a parked node, restoring its session state.
5. Breadcrumb UI: shows the path from root to active node, clickable to navigate.
6. Inline micro-evaluations: clicking a cited paper in Comprehend triggers a 3-sentence summary (Sonnet call) without leaving the Comprehend view.

**Test:** Reproduce the scenario from the architecture document Section 5:
1. Comprehend Paper A.
2. Click a reference to Paper B → Evaluate opens for Paper B. Paper A's Comprehend state is preserved.
3. From Paper B's evaluation, run a Discover query.
4. Select Paper C, evaluate it.
5. Click breadcrumb to return to Paper A's Comprehend. State is fully restored (correct section, depth settings, thread history).

**Pass/fail criteria:**
- The full branching scenario completes without state loss.
- Breadcrumb accurately reflects the investigation tree at each step.
- Returning to a parked node restores the exact UI state (scroll position, expanded sections, depth settings).
- Inline micro-evaluations render within 5 seconds and provide accurate summaries.

**Fallback:** If the full investigation tree is too complex for the timeline, simplify to single-level branching: the user can branch from Comprehend to Evaluate or Discover, but branches cannot spawn further branches. "Return" always goes back to the Comprehend session. This covers the most common use case (checking a reference while reading) without the full tree.

**Dependencies:** Phase 5 (Comprehend), Phase 6 (Threads, since thread state must be preserved during branching), Phase 7 (Discover).

---

## Phase 9: Library, Onboarding and Polish

**Duration:** 2 engineer-weeks (FE + BE engineers, 2 calendar weeks)

**What you build:**

1. Library view: papers grouped by status (Discovered, Evaluated, Reading, Completed), each card showing last interaction point.
2. Implicit grouping: papers linked by investigation lineage displayed as lightweight groups.
3. Onboarding calibration: sample explanation at intermediate depth, user adjusts up or down, calibration stored on User entity.
4. Mismatch detection signal collection: time-per-section and thread-opening-rate tracking, stored per ComprehensionState. No auto-adjustment, just data collection.
5. Edge case handling: paper already in history (show existing evaluation with resume option), discovery surfaces evaluated paper (badge), re-evaluate flow.
6. General polish: loading states, error handling, responsive layout, keyboard navigation.

**Pass/fail criteria:**
- Library accurately reflects all papers the user has touched across sessions.
- Onboarding calibration persists and applies to subsequent Comprehend sessions.
- All edge cases from MVP.md Section 7.4 are handled without errors.

**Fallback:** Onboarding calibration can be deferred (default all users to Conceptual, let them change manually). Library can ship with a flat list if grouping logic is taking too long.

**Dependencies:** All previous phases.

---

## Dependency Graph

```
Phase 1 (Visual Spike) ─────────────────┐
                                         ├──► Phase 3 (Explanations) ──► Phase 4 (Evaluate) ──┐
Phase 2 (Parsing + Classification) ──────┘                                                     │
                                                                                               ▼
                                                                          Phase 5 (Comprehend Core)
                                                                               │           │
                                                                               ▼           ▼
                                                                    Phase 6 (Threads)  Phase 7 (Discover)*
                                                                               │           │
                                                                               ▼           ▼
                                                                          Phase 8 (Investigation Branching)
                                                                                       │
                                                                                       ▼
                                                                          Phase 9 (Library + Polish)

*Phase 7 depends on Phase 4 (for the Discover→Evaluate transition)
 but can run in parallel with Phase 6.
```

**Critical path:** Phase 1 → Phase 3 → Phase 4 → Phase 5 → Phase 8 → Phase 9

Phases 1 and 2 run in parallel (weeks 1-2). Phase 7 runs in parallel with Phase 6 (after Phase 5 completes for the frontend pieces, after Phase 4 completes for the Discover→Evaluate transition).

---

## Milestones and Timeline

| Week | Phase(s) | Engineers | Milestone |
|------|----------|-----------|-----------|
| 1-2 | Phase 1 (Visual Spike) + Phase 2 (Parsing) in parallel | ML + BE | |
| 3-4 | Phase 3 (Explanations) | ML (BE starts Phase 4 infrastructure in week 4) | |
| 5-6 | Phase 4 (Evaluate End-to-End) | BE + ML | **Demo-able Prototype:** paste a URL, get a structured evaluation with a visual |
| 7-9 | Phase 5 (Comprehend Core) | All three | **End-to-End Milestone (end of week 9):** upload PDF → evaluate → comprehend with visuals and depth control |
| 10-11 | Phase 6 (Threads) + Phase 7 (Discover) in parallel | BE+FE on threads, BE on Discover (ML supports both) | |
| 12-13 | Phase 8 (Investigation Branching) | All three | |
| 14-15 | Phase 9 (Library + Polish) | FE + BE | **MVP Ship (end of week 15)** |

**Total: 15 calendar weeks with 3 engineers.**

---

## Timeline Comparison

### 12-Week Target

Cut Phase 8 (Investigation Branching) and Phase 9 (Library + Polish) from the initial ship. The product supports: Discover, Evaluate, Comprehend with visuals and depth control, and threading. Branching from Comprehend to Evaluate/Discover is not available; the user must manually navigate back to the home screen. The library is a flat list of papers without status grouping or implicit lineage. Onboarding calibration is deferred.

This is a coherent product. The core differentiator (visual-first explanations with depth adjustment) is intact. The missing pieces (branching, library management) are convenience features, not core value.

Adjusted timeline:

| Week | Phase(s) |
|------|----------|
| 1-2 | Phase 1 + Phase 2 (parallel) |
| 3-4 | Phase 3 |
| 5-6 | Phase 4 |
| 7-9 | Phase 5 |
| 10-11 | Phase 6 + Phase 7 (parallel) |
| 12 | Bug fixes, edge cases, basic library (flat list) |

### 16-Week Target

The full plan as described above, plus one buffer week at the end for integration testing, performance optimization and bug fixes. The extra week is well-spent on the investigation branching UX, which involves state management complexity that tends to surface late bugs.

---

## What to Cut If Behind

### Must-Ship Tier

These features define the product. Without them, there is no differentiated offering.

- Paper evaluation from URL, DOI or PDF upload (Evaluate mode)
- Section-by-section comprehension with AI-generated explanations (Comprehend mode)
- Visual explanations at Conceptual depth for at least 5 content types (Architecture, Algorithm, Training, Quantitative Comparison, Problem Formulation)
- Global depth control (three levels) with per-section deepening
- Basic Discover mode (search, results, transition to Evaluate)

### Cut-If-Behind Tier

These features improve the product but are not required for the core value proposition to be testable.

- Formal-depth visuals (ship with Conceptual and Technical only; Formal depth provides text explanations without visual)
- Animated depth transitions (ship with a simple swap; the crossfade with highlighting described in Phase 5 is already a reduced version of the spec)
- Threading (ship Comprehend without threads; users can still read explanations and adjust depth; threads add Q&A but the core reading experience works without them)
- Investigation branching (ship with independent mode navigation; users use the home screen to switch between papers)
- Library grouping and implicit lineage (ship with a flat list of papers)
- Onboarding calibration (default to Conceptual, let users change manually)
- Mismatch detection signal collection (defer to post-ship)
- Inline micro-evaluations of cited papers (show citation metadata only)
- Visuals for content types 6 (Quantitative Distributions), 7 (Qualitative Results), 10 (Taxonomy), 11 (System Architecture) — these are lower-frequency content types that can be added incrementally

### The Decision Framework

If the team is 2 weeks behind at the end of Phase 5 (week 11 instead of week 9 for the end-to-end milestone): cut Investigation Branching and Library grouping. Ship Discover, Evaluate, Comprehend with depth and threading. This is the 12-week plan.

If the team is 4 weeks behind at the end of Phase 5 (week 13): cut Threading and Investigation Branching. Ship Discover, Evaluate and Comprehend with depth control only. This is a minimal but coherent product.

If Phase 1 (Visual Spike) fails its test: the team has a fundamental problem. Spend the extra week on prompt iteration. If visuals still don't meet the bar, reduce visual scope to 3-4 content types where LLM-generated Mermaid is most reliable (Architecture, Algorithm, Data Pipeline) and template the rest. This changes the product from "visuals for everything" to "visuals for structural content, text-only for quantitative and theoretical content." The product is weaker but still differentiated from text-only alternatives.

---

## Specific Questions Answered

### 1. The Visual Generation Spike

The spike is Phase 1, described above. It tests 7 content types (of 11) at all 3 depth levels across 5 papers, producing ~20 test visuals. Duration: 2 calendar weeks. The decision point is at the end of week 2: does the hybrid approach (Mermaid + JSON→SVG) produce renderable, accurate, depth-differentiated visuals?

Content types not tested in the spike (Data Pipeline, Quantitative Distribution, Qualitative Results, System Architecture) are lower-frequency and can be validated incrementally during Phase 3. The spike focuses on the content types most likely to appear in the first papers users try.

### 2. Parser Selection

GROBID is provisionally selected before Phase 2 starts (based on the architecture evaluation). Phase 2's test validates the choice. If GROBID's section boundary accuracy falls below 80% on the 8-paper test set, the team evaluates Nougat or a hybrid approach (GROBID for structure + Nougat for equation-heavy sections) during the same phase. The parser commitment is finalized at the end of Phase 2, before Phase 3 starts (since Phase 3 needs classified sections as input).

### 3. End-to-End Milestone

End of Phase 5 (target: week 9). At this point a user can: paste a paper URL → see an evaluation → enter Comprehend → read a section with a visual → adjust depth → resume later. This is the critical milestone. Everything before it is building blocks. Everything after it (threads, branching, library) is layered on top of a functioning core.

### 4. Parallel Work

Two parallelizable streams:
- Phase 1 (Visual Spike, ML engineer) runs in parallel with Phase 2 (Parsing, BE engineer) in weeks 1-2.
- Phase 6 (Threads, BE+FE) runs in parallel with Phase 7 (Discover, BE for API + FE for UI) in weeks 10-11.

The critical path is: Phase 1 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 8 → Phase 9. Length: 15 weeks. Phase 2 runs parallel to Phase 1 and does not extend the critical path. Phase 7 runs parallel to Phase 6 and does not extend the critical path.

The FE engineer is underutilized in weeks 1-6 (the first frontend work starts in Phase 5). During weeks 1-6, the FE engineer should build the frontend shell (routing, layout, component library, Mermaid rendering integration) and the Evaluate UI (displaying the evaluation output), so that Phase 5's frontend work focuses on the Comprehend-specific features rather than starting from scratch.

### 5. What You Cut If Behind

Answered in the "What to Cut If Behind" section above. The short version: threading and branching are the first cuts; visuals at Formal depth and for low-frequency content types are the second cuts; the core of Evaluate + Comprehend with Conceptual/Technical visuals for 5 content types is the last thing standing.
