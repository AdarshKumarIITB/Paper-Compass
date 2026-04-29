# Technical Architecture: AI Research Assistant

## 1. LLM Selection and Call Design

### Model Tiering

Two model tiers handle all LLM calls.

**Tier 1 (Fast/Cheap): Claude Sonnet** for classification, summarization and contribution summaries. These calls have constrained output formats, predictable token counts and tolerance for slightly lower reasoning quality.

**Tier 2 (Quality): Claude Opus** for explanation generation, visual generation, evaluation generation and thread responses. These calls require adherence to the Gray & Holyoak and Mayer principles described in Design_choices.md, which demands stronger instruction-following and more sophisticated output.

Alternatives considered: a single model for everything (simpler but either too expensive or too low-quality), an open-source model for Tier 1 (reduces cost further but adds hosting complexity and latency variance for MVP). The two-tier split on the same provider avoids managing multiple inference endpoints.

### Call Specifications by Mode

**Discover Mode**

| Call | Model | Input tokens | Output tokens | Parallelizable | Latency budget | Failure handling |
|------|-------|-------------|---------------|----------------|----------------|------------------|
| Contribution summary (when TLDR missing) | Sonnet | ~500 (abstract + metadata) | ~100 | Yes, batch all missing TLDRs | 3s per summary | Degrade: show abstract instead of summary |

Cost per discovery query: 0-10 Sonnet calls depending on TLDR coverage. Semantic Scholar provides TLDRs for most indexed papers. Estimated cost: $0.01-0.05 per query.

**Evaluate Mode**

| Call | Model | Input tokens | Output tokens | Parallelizable | Latency budget | Failure handling |
|------|-------|-------------|---------------|----------------|----------------|------------------|
| Section classification (per section) | Sonnet | ~1500 (section text + heuristic features + prompt from Visual_explanation_taxonomy.md Section 4.2) | ~150 | Yes, all sections in parallel | 2s | Fall back to heuristic-only classification |
| Evaluation generation | Opus | ~8000 (full paper text + evaluation prompt) | ~1500 (claim summary + method overview + evidence assessment + prerequisite map + reading time estimate) | No (single call) | 15s | Retry once, then surface partial evaluation with missing fields flagged |
| Method visual | Opus | ~3000 (method section + content type + visual prompt) | ~1000 (Mermaid or SVG) | Parallel with evaluation generation after classification completes | 10s | Degrade: show evaluation without visual |

Cost per evaluation: ~1 Opus call + N Sonnet calls (N = section count, typically 6-12). Estimated cost: $0.15-0.30 per paper.

**Comprehend Mode**

| Call | Model | Input tokens | Output tokens | Parallelizable | Latency budget | Failure handling |
|------|-------|-------------|---------------|----------------|----------------|------------------|
| Section explanation + visual | Opus | ~4000 (section text + paper context + depth level + content type + user concept history) | ~2000 (explanation) + ~800 (visual code) | Yes across sections, but load on-demand per section | 12s | Retry once; if visual fails, serve explanation without visual |
| Section deepening | Opus | ~5000 (section text + current explanation + new depth level) | ~2500 (Phase 1 intuitive + Phase 2 formal) + ~1000 (two visuals) | No | 15s | Serve Phase 1 only if Phase 2 times out |
| Thread creation summary | Sonnet | ~3000 (main thread messages up to branch point) | ~150 | No | 3s | Use the branch point message as context instead of a summary |
| Thread response | Opus | ~4000 (parent summary + thread messages + paper context + passage/visual that spawned thread) | ~1000 | No | 10s | Standard retry |
| Thread return summary | Sonnet | ~2000 (thread messages) | ~100 | No | 3s | Skip summary; mark thread as "explored" without injecting summary |
| Inline micro-evaluation | Sonnet | ~500 (cited paper metadata from Semantic Scholar) | ~200 | No | 4s | Show citation metadata only (title, year, citation count) |

Cost per Comprehend section: ~$0.05-0.08 (one Opus call). A 10-section paper at full read-through: $0.50-0.80. With threading and deepening, a thorough session could reach $1.50-2.00.

### Cost Assessment

For a semi-technical professional using the product 3-5 times per week (discovering papers, evaluating 2-3, comprehending 1-2), monthly LLM cost per user is roughly $15-30 at current API pricing. This supports a $30-50/month subscription price point with margin for infrastructure costs. If costs need to come down, the first lever is caching: identical sections at identical depth levels produce identical explanations, so a cache keyed on (paper_id, section_id, depth_level) avoids redundant Opus calls across users reading the same paper.

### What Breaks If This Is Wrong

If Sonnet proves insufficient for section classification (accuracy below 80% when combined with heuristics), all classification calls move to Opus, roughly doubling per-evaluation cost. The mitigation is that classification calls are short-output, so the cost increase is bounded. If Opus explanations are too slow (>15s per section), the UX degrades because users wait for each section. The mitigation is pre-generating the next 2-3 sections while the user reads the current one.

---

## 2. Paper Ingestion and Chunking

### PDF Parsing: GROBID over Paper Mage

Research_Assistant.md mentions Paper Mage (AI2). After evaluating alternatives:

**GROBID** is the recommended parser.

| Parser | Strengths | Weaknesses |
|--------|-----------|------------|
| GROBID | Mature (10+ years), strong section segmentation, handles references and equations, runs as a service, well-documented REST API, CRF-based so fast and deterministic | Equation extraction is structural only (no semantic parsing), occasional errors on non-standard layouts |
| Paper Mage | Figure/table detection, AI2-maintained, Python-native | Less mature, smaller community, heavier compute requirements, designed for AI2's pipeline rather than general use |
| Nougat | End-to-end neural OCR, handles equations well | Slow (GPU-required), hallucinates on complex layouts, overkill for well-formed PDFs |
| Marker | Fast, good for bulk conversion | Weaker section boundary detection, designed for conversion rather than structured extraction |

GROBID provides structured TEI XML output with section boundaries, reference parsing and metadata extraction. It runs as a Docker service with a REST API, fitting cleanly into the backend. Its section segmentation directly feeds the content type classification pipeline (Visual_explanation_taxonomy.md Section 4).

**What breaks if GROBID is wrong:** Section boundaries are incorrect, which cascades into misclassification and explanation generation targeting the wrong text spans. The mitigation is a post-processing step that validates section boundaries using heuristics (heading font size, numbering patterns) and merges or splits GROBID sections when they violate expected patterns.

### Chunking Strategy

**Step 1: GROBID parsing.** PDF → TEI XML with section boundaries, equations, figures, tables and references identified.

**Step 2: Section extraction.** Map TEI XML sections to the Section entity in the data model. Preserve the section hierarchy (sections and subsections). Each Section gets: title, full text, order index and a reference map (which equations, figures and tables appear in this section, plus cross-references to other sections).

**Step 3: Mixed-type section handling.** Per Visual_explanation_taxonomy.md Section 3.6, sections that mix content types are segmented by the LLM classifier, which identifies content type boundaries at paragraph granularity. The Section entity allows a secondary_content_type field. When a section has two content types, the system generates two visuals, one per content type, positioned at their respective text boundaries.

For sections shorter than ~200 words where segmentation would produce fragments too small to visualize, the system defaults to the primary content type.

**Step 4: Cross-reference preservation.** GROBID extracts reference markers ("as described in Section 3," "see Equation 2"). These are stored as a references array on each Section, containing the target section/equation/figure ID and the reference text. In Comprehend mode, these render as interactive links: section references scroll to the target section, equation references surface the equation inline.

### Data Flow: PDF to Section Entity

```
PDF upload
  → GROBID service (REST API)
  → TEI XML
  → Section extractor (custom parser)
  → Section entities with text, order, references
  → Heuristic pre-classifier (equation density, tables, pseudocode, title patterns)
  → LLM classifier (Sonnet, per Visual_explanation_taxonomy.md Section 4.2 prompt)
  → Sections with content_type and secondary_content_type assigned
  → Stored in database, ready for Evaluate and Comprehend
```

### Semantic Scholar Path (DOI/URL Entry)

When the user provides a DOI or URL instead of a PDF:

1. Query Semantic Scholar API for paper metadata (title, abstract, TLDR, citation data).
2. Check for an open access PDF link via Semantic Scholar's `openAccessPdf` field.
3. If an open access PDF exists, download and parse it through the GROBID pipeline above.
4. If no open access PDF exists, attempt Unpaywall API as a fallback.
5. If no PDF is obtainable, the system operates in **metadata-only mode**: Evaluate produces a limited evaluation using only the abstract. The claim summary and prerequisite map are generated from the abstract. The method overview, evidence assessment and visual are marked as unavailable with a note: "Full evaluation requires the paper PDF. Upload it to get the complete analysis." Comprehend mode is blocked entirely without the full text.

This is a real constraint. Roughly 30-40% of CS papers have open access versions. For the remainder, users must upload the PDF themselves. The UX should make this obvious rather than hiding the limitation.

---

## 3. Visual Generation Pipeline

### Generation Approach: Hybrid

Three approaches evaluated:

**Fully generative** (LLM outputs raw Mermaid/SVG). Pros: maximum flexibility, handles novel content well. Cons: SVG output is unreliable (malformed markup, rendering errors in ~30-40% of complex diagrams), requires validation/retry loops, inconsistent visual quality.

**Template-based** (pre-built templates filled with LLM-extracted content). Pros: guaranteed rendering, consistent visual quality. Cons: rigid, cannot adapt to unusual paper structures, requires building 33 templates (11 content types × 3 depths) before launch.

**Hybrid** (Mermaid for simpler formats, structured SVG generation for complex ones). Pros: Mermaid is well-constrained and renders reliably; SVG is reserved for cases where Mermaid lacks expressiveness. Cons: two rendering paths to maintain.

**Decision: Hybrid approach.**

The mapping, following Visual_explanation_taxonomy.md Section 2:

| Content type | Conceptual | Technical | Formal |
|--------------|-----------|-----------|--------|
| Architecture (2.1) | Mermaid flowchart | Mermaid flowchart | Generated SVG |
| Algorithm (2.2) | Mermaid flowchart | Mermaid flowchart | Generated SVG |
| Training (2.3) | Mermaid with subgraphs | Mermaid with subgraphs | Generated SVG |
| Data Pipeline (2.4) | Mermaid LR flowchart | Mermaid LR flowchart | Mermaid LR flowchart |
| Quantitative Comparison (2.5) | Generated SVG chart | Generated SVG chart | Generated SVG chart |
| Quantitative Distribution (2.6) | Generated SVG | Generated SVG | Generated SVG |
| Qualitative Results (2.7) | HTML grid | HTML grid | HTML grid |
| Theoretical (2.8) | Mermaid TD flowchart | Generated SVG tree | Generated SVG tree |
| Problem Formulation (2.9) | Generated SVG | Generated SVG | Generated SVG |
| Taxonomy (2.10) | Mermaid tree | Generated SVG | Generated SVG |
| System Architecture (2.11) | Mermaid with subgraphs | Mermaid with subgraphs | Generated SVG |

Mermaid covers 15 of 33 combinations. Generated SVG covers 15. HTML covers 3.

For Mermaid generation, the LLM outputs Mermaid syntax, which has a constrained grammar and renders correctly in >95% of cases. Malformed Mermaid is detectable at parse time and can trigger a single retry.

For SVG generation, the LLM outputs a structured JSON specification (nodes, edges, labels, positions, colors) rather than raw SVG markup. A deterministic SVG renderer converts this specification into SVG. This eliminates malformed SVG from the LLM and moves rendering errors into controlled code.

The JSON specification format:

```json
{
  "nodes": [
    { "id": "n1", "label": "Input Embeddings", "type": "process", "x": 100, "y": 50, "width": 160, "height": 60 }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "label": "d_model", "style": "solid" }
  ],
  "groups": [
    { "id": "g1", "label": "Encoder", "contains": ["n1", "n2", "n3"] }
  ],
  "legend": { "blue": "Input", "green": "Processing", "red": "Output" }
}
```

A server-side renderer converts this to SVG with consistent styling (colors per Design_choices.md signaling conventions: blue for input, green for processing, red for output). The renderer handles layout refinement, collision avoidance and edge routing, which are tasks LLMs handle poorly.

### Self-Refinement Loop

**Decision: Deferred for MVP.** The SciSketch generate-render-check-revise loop (Research_Assistant.md) adds one multimodal LLM call per visual (render the SVG/Mermaid to an image, send it to a vision model to check correspondence with the text). At $0.02-0.05 per check and 3-5 seconds of latency per visual, this roughly doubles the cost and time of visual generation.

For MVP, the check is replaced by structural validation: does the Mermaid parse? Does the JSON specification conform to the schema? Are all node references in edges valid? Does the node count respect the 25-node limit? These checks are deterministic and free. Semantic correctness (does the visual accurately represent the paper content?) is left to user feedback via the thumbs up/down mechanism (MVP.md Section 10). Signal data collected in V1 informs whether the self-refinement loop is necessary in V2.

**What breaks if this is wrong:** Visuals that render correctly but misrepresent the paper content. The risk is partially mitigated by the generation prompt requiring every visual element to correspond to something in the text (Visual_explanation_taxonomy.md Section 4.3 step 6), which constrains hallucination. If user feedback shows accuracy below 70%, the refinement loop becomes a V1.1 priority.

### Rendering

**Mermaid:** Rendered client-side using mermaid.js. The library is well-maintained, supports all required diagram types (flowchart, sequence, class) and runs in the browser without server-side infrastructure.

**SVG:** The JSON-to-SVG renderer runs server-side as a module (not a separate service). It produces SVG strings that the frontend embeds directly. No headless browser needed.

**HTML (for Qualitative Results):** Rendered client-side as structured HTML with CSS styling. These are grids of input/output pairs with annotations, not complex interactive elements.

### Depth Transitions

Design_choices.md specifies animated transitions when a user deepens a section, so the user tracks which new elements correspond to existing elements.

**Decision: Crossfade with element highlighting for MVP, not true morphing animation.** True morphing (element A at Conceptual smoothly transforms into elements A1, A2, A3 at Technical) requires mapping element identity across depth levels and computing interpolation paths. This is substantial front-end engineering for a V1 feature.

The MVP alternative preserves the pedagogical intent (element correspondence):

1. When deepening, the existing visual fades to 50% opacity.
2. The new visual renders alongside it, with new elements highlighted (pulsing border or background glow).
3. Elements that exist at both depth levels share an ID, and matching pairs are connected by a brief highlight sequence: the old element pulses, then the corresponding new element pulses.
4. After 2 seconds, the old visual fades out completely.

This requires adding a `correspondence_id` field to each node in the visual specification, maintained across depth levels. The LLM generation prompt for a deeper visual receives the previous visual's specification and must assign matching IDs to corresponding elements.

### The 25-Node Constraint

Enforced in two places:

1. **Generation prompt:** The prompt specifies the maximum node count for the content type and depth level (per Visual_explanation_taxonomy.md Section 2 ranges: Conceptual 8-12, Technical 12-20, Formal 20-25).
2. **Post-generation validation:** If the output exceeds the limit, the system returns the visual to the LLM with an instruction to consolidate: "This diagram has {N} nodes. Reduce to {max} by grouping related sub-components." One consolidation pass. If it still exceeds the limit, the overage nodes are cut from the bottom of the specification (least structurally connected nodes first).

When a section genuinely requires more than 25 nodes (e.g., a complex architecture with many sub-components), the generation prompt instructs the LLM to create a two-level visual: an overview diagram within the node limit, with 2-3 groups that can be expanded. Expansion is handled by the same "deepen a section" mechanism, generating a focused sub-diagram for the selected group.

---

## 4. State Management and Persistence

### Database: PostgreSQL with JSONB

The data model (MVP.md Section 8.2) is relational with some semi-structured fields (per_section_depth overrides, paper_sections_referenced on messages). PostgreSQL handles both.

Alternatives considered: MongoDB (more flexible schema but weaker query capabilities for the relational parts of the model, particularly the thread tree and investigation tree), SQLite (insufficient for concurrent access if the product scales beyond a single server).

**Schema design considerations:**

The Section, Visual and ComprehensionState entities use JSONB for fields that vary per paper: section references, visual specifications and per-section depth overrides. The core relational structure (User → Paper → Section, Paper → Conversation → Thread → Message) uses standard foreign keys.

### Visual Caching

**Decision: Cache all generated visuals, keyed on (paper_id, section_id, depth_level).**

When a user who is globally set to Conceptual deepens one section to Technical, the system generates the Technical visual and caches it. If the user switches back to Conceptual, the cached Conceptual visual is served. If another user reads the same paper at the same depth, the cached visual is served without an LLM call.

The cache is stored in the Visual table. Each section can have up to 3 Visual records (one per depth level), created on demand. The ComprehensionState.per_section_depth list drives which cached visual to display. On first access, the visual is generated and cached. On subsequent access, the cache is read.

Cache invalidation: None for MVP. Paper content does not change after ingestion. If the explanation generation prompt changes (during development iteration), a version field on the Visual record allows selective invalidation.

### Thread Tree Queries

The thread tree (Research_Assistant.md data model) uses an adjacency list: Thread.parent_thread_id points to the parent. For MVP, thread depth is capped at one level (Design_choices.md), so the tree is at most two levels deep (root + one child). A simple query fetches all threads for a conversation:

```sql
SELECT * FROM threads
WHERE conversation_id = ?
ORDER BY
  CASE WHEN parent_thread_id IS NULL THEN 0 ELSE 1 END,
  created_at;
```

This returns the root thread first, followed by child threads in creation order. For the breadcrumb navigation, the frontend reconstructs the tree from this flat list.

For constructing LLM context for a thread message (summary injection per Research_Assistant.md):

1. At thread creation, the summary of the main thread up to the branch point is generated (one Sonnet call) and stored on the Thread record as `parent_context_summary`.
2. When sending a thread message to the LLM, the system prompt is constructed as: `parent_context_summary` + current thread messages + paper section context.
3. At thread return, the thread summary is generated (one Sonnet call) and stored on the Thread record as `thread_summary`. This summary is appended to the main thread's message history as a system note.

### Session Resumption

When a user returns to a paper, the system restores:

**Persisted (never regenerated):**
- ComprehensionState: global depth, per-section depth overrides, sections expanded, threads opened, bookmarks, last interaction timestamp
- All Thread records with their messages
- All cached Visuals
- The Evaluation record

**Regenerated if missing (e.g., cache eviction under storage pressure):**
- Section explanations (regenerated from section text + depth level; deterministic given the same prompt)
- Visuals (regenerated from section text + content type + depth level)

The last interaction point (which section the user was reading, which thread was open) is stored as `last_position` on ComprehensionState: a JSON object with `{ section_id, thread_id, scroll_offset }`. On resume, the frontend scrolls to this position.

---

## 5. Investigation Branching

### Data Model

The investigation tree described in Design_choices.md ("branching, not abandoning") requires a structure above individual Conversations.

```
Investigation {
  id: string
  user_id: string
  root_paper_id: string
  created_at: datetime
  last_interaction: datetime
}

InvestigationNode {
  id: string
  investigation_id: string
  parent_node_id: string | null       // null = root node
  branch_trigger: string              // "reference_click", "discover_query", "evaluate_from_discover"
  paper_id: string
  mode: "comprehend" | "evaluate" | "discover"
  session_state: JSONB                // mode-specific state (ComprehensionState, DiscoverQuery, etc.)
  status: "active" | "parked"
  created_at: datetime
}
```

The investigation tree is a tree of InvestigationNodes. Each node represents a mode + paper combination. The Conversation/Thread/Message model from Research_Assistant.md lives under the InvestigationNode for Comprehend-mode nodes.

**Example from the prompt's scenario:**

1. User starts Comprehend for Paper A → InvestigationNode(root, paper=A, mode=comprehend, status=active)
2. Clicks reference to Paper B → InvestigationNode(parent=root, paper=B, mode=evaluate, branch_trigger=reference_click). Root node status → parked.
3. From Paper B's evaluation, runs Discover → InvestigationNode(parent=B_node, paper=null, mode=discover, branch_trigger=evaluate_to_discover). B node → parked.
4. Selects Paper C from results → InvestigationNode(parent=discover_node, paper=C, mode=evaluate, branch_trigger=discover_result).
5. Returns to Paper A → traverse up the tree to root node, set status=active, all intermediate nodes → parked.

### Navigation

The user's position in the tree is tracked as `active_node_id` on the Investigation. The breadcrumb bar (Research_Assistant.md frontend recommendation) renders the path from root to active node. Clicking any breadcrumb node sets that node as active and parks the current node.

"Return to where I was" walks up from the current node to the nearest ancestor with mode=comprehend and restores its ComprehensionState. If there are multiple branch points, the breadcrumb provides explicit selection rather than implicit traversal.

### UI State Serialization

Each InvestigationNode.session_state stores the mode-specific state:

- **Comprehend node:** Full ComprehensionState (depth, sections expanded, threads, scroll position)
- **Evaluate node:** The evaluation record ID and the user's position in the evaluation view
- **Discover node:** The query string, filters, result list, scroll position and which results the user examined

On node switch, the frontend serializes current UI state to the departing node's session_state and deserializes the arriving node's session_state. This is a JSON round-trip through the API.

### What Breaks If This Is Wrong

If the investigation tree grows deep (5+ levels of branching), breadcrumb navigation becomes unwieldy. For MVP, this is acceptable because the one-level thread constraint and the typical investigation pattern (rarely more than 3 levels deep) keep the tree manageable. If user data shows deeper trees, a tree visualization (sidebar showing the full investigation structure) replaces the breadcrumb in V2.

---

## 6. API and Service Boundaries

### Decision: Modular Monolith

For MVP with a team of 2-3 engineers, a modular monolith with clean internal boundaries. Separate services add deployment complexity, inter-service communication overhead and operational burden that a small team cannot absorb while also iterating on the core product.

**Module boundaries:**

```
┌──────────────────────────────────────────────────────────┐
│                     API Gateway / Router                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Discover     │  │  Evaluate     │  │  Comprehend    │  │
│  │  Module       │  │  Module       │  │  Module        │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│  ┌──────▼───────────────────────────────────────────┐   │
│  │            LLM Orchestration Module               │   │
│  │  (prompt construction, call management,           │   │
│  │   response parsing, retry logic, model routing)   │   │
│  └──────┬──────────────────────────────┬────────────┘   │
│         │                              │                 │
│  ┌──────▼───────────┐   ┌─────────────▼─────────────┐  │
│  │  Visual Generation│   │  Semantic Scholar Client   │  │
│  │  Module           │   │  (API wrapper, caching,    │  │
│  │  (classification, │   │   rate limiting)           │  │
│  │   JSON spec gen,  │   └───────────────────────────┘  │
│  │   SVG renderer,   │                                   │
│  │   Mermaid output) │                                   │
│  └──────────────────┘                                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Paper Ingestion Module                  │   │
│  │  (GROBID client, TEI XML parser, section          │   │
│  │   extractor, PDF download for DOI/URL path)       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Persistence Module                      │   │
│  │  (PostgreSQL, all entity CRUD, visual cache,      │   │
│  │   investigation tree, session state)              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                     External Services                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ GROBID     │  │ Semantic   │  │ Anthropic API      │ │
│  │ (Docker)   │  │ Scholar API│  │ (Claude)           │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                        │
│  React + mermaid.js                                      │
│  Communicates with API Gateway via REST/WebSocket         │
└──────────────────────────────────────────────────────────┘
```

**Module justifications:**

**Visual Generation as a separate module** (not merged into LLM Orchestration): Visual generation has different failure modes (rendering errors vs. LLM errors), different retry strategies (structural validation vs. response quality) and a different output pipeline (JSON spec → SVG renderer). Keeping it separate makes these concerns testable independently.

**Paper Ingestion as a separate module:** Ingestion is a batch process (parse once, read many). It talks to GROBID, which runs as a separate Docker container. Isolating it allows the ingestion pipeline to be tested and iterated without touching the rest of the system.

**GROBID as an external service (Docker container):** GROBID is a Java application with its own dependencies. Running it in a sidecar container keeps it isolated from the main application. Communication via REST API on localhost. If GROBID proves unreliable or needs replacement, swapping it requires changes only in the Paper Ingestion module.

**Frontend as a separate SPA:** Standard separation. The frontend communicates with the backend via REST for CRUD operations and WebSocket for streaming LLM responses (explanations and visuals that stream incrementally as the LLM generates them).

### The Candidate for Extraction Post-MVP

If the product scales, Visual Generation is the first module to extract into a separate service. It has the clearest interface boundary (content type + depth level + section text in, visual specification out), the most independent failure domain and the most distinct scaling characteristics (GPU-bound if the self-refinement loop with vision models is added in V2).

---

## Architecture Decision Records

### ADR-1: Hybrid Visual Generation (Mermaid + Structured JSON → SVG)

**Context:** The product requires 33 content type × depth level visual format combinations. The Visual_explanation_taxonomy.md specifies Mermaid for simpler formats and SVG for complex ones. The LLM must produce renderable output reliably.

**Options considered:**
1. Fully generative SVG from LLM for all combinations
2. Pre-built templates (33 templates) filled with LLM-extracted content
3. Hybrid: Mermaid where the taxonomy specifies it, structured JSON → deterministic SVG renderer elsewhere

**Decision:** Option 3.

**Rationale:** Option 1 fails on reliability. LLMs produce malformed SVG ~30-40% of the time for complex diagrams, and retry loops add unacceptable latency. Option 2 guarantees rendering but sacrifices adaptability; papers vary too much for rigid templates to cover well, and maintaining 33 templates is a significant upfront investment. Option 3 gets the reliability of constrained output formats (Mermaid syntax for 15 combinations, a JSON schema for 15 more, HTML for 3) while preserving adaptability. The deterministic SVG renderer handles layout, styling and edge routing, which are the operations LLMs do worst.

**What breaks if wrong:** If the JSON → SVG renderer produces visuals that look poor (bad layout, overlapping labels), the fully generative approach for SVG may produce better-looking results despite lower reliability. Mitigation: invest in the renderer's auto-layout algorithm (force-directed or hierarchical layout) during the visual generation spike.

### ADR-2: GROBID for PDF Parsing

**Context:** The system needs to parse academic PDFs into structured sections with equation, figure and table detection. The section boundaries directly feed content type classification, which drives visual generation and explanation structure.

**Options considered:**
1. Paper Mage (AI2) — Python-native, figure/table detection
2. GROBID — mature, CRF-based, TEI XML output, strong section segmentation
3. Nougat — neural end-to-end, strong equation handling
4. Marker — fast, designed for bulk conversion

**Decision:** GROBID.

**Rationale:** Section boundary accuracy is the critical requirement. Misidentified sections cascade into misclassification, wrong visual types and broken explanations. GROBID has the strongest track record on section segmentation across diverse paper formats. It runs as a stateless service (easy to deploy, scale and replace). TEI XML output is well-specified and parseable. The tradeoff is weaker equation semantic parsing, but the LLM classification step compensates by reading equation-heavy sections in full text.

**What breaks if wrong:** GROBID fails on papers with non-standard formatting (workshop papers, preprints with unusual templates). Mitigation: a fallback pipeline that uses heading-detection heuristics on raw text extraction (via pdftotext) when GROBID confidence is low. This fallback produces coarser sections but prevents complete parsing failures.

### ADR-3: Modular Monolith (Not Microservices)

**Context:** MVP built by 2-3 engineers over 12-16 weeks. Six logical modules with distinct concerns. The question is whether to deploy them as separate services or as modules within a single application.

**Options considered:**
1. Microservices from the start (separate deployments, inter-service communication)
2. Modular monolith (single deployment, internal module boundaries, shared database)
3. Monolith without explicit module boundaries

**Decision:** Option 2.

**Rationale:** Option 1 adds deployment complexity (container orchestration, service discovery, distributed tracing) and communication overhead (serialization, network latency, partial failure handling) that a small team cannot absorb while iterating on product-level questions (are the visuals good enough? does the depth mechanism work?). Option 3 leads to entangled code that is hard to reason about and hard to extract later. Option 2 gives the development speed of a monolith with module boundaries that make future extraction feasible. The critical boundary (Visual Generation) is identified for extraction if needed.

**What breaks if wrong:** If the product grows to need independent scaling of modules (e.g., visual generation needs GPU resources while the rest runs on CPU), the monolith becomes a bottleneck. Mitigation: the clean module boundaries allow extracting Visual Generation into a service without rewriting the rest of the system. The interface (function calls with well-defined input/output types) is the same whether the call is local or remote.

---

## Ambiguities and Assumptions

**1. Copyright and paper text display.** MVP.md Section 3.3 mentions "the paper's original text (or a close paraphrase where copyright constraints apply)" in Comprehend mode. The architecture assumes the system stores and displays the parsed full text. If legal review prohibits this, the system must paraphrase all section text via an additional LLM call per section, roughly doubling Comprehend mode's cost. This needs a legal determination before build.

**2. Concurrent users on the same paper.** The visual cache is shared across users (keyed on paper_id + section_id + depth_level). The architecture assumes this is desirable (faster loads, lower cost). If users need personalized visuals (e.g., incorporating their demonstrated knowledge level into the visual, per Design_choices.md thread model), the cache key must include user_id, eliminating cross-user caching. For MVP, shared caching is assumed.

**3. Streaming vs. complete responses.** The architecture assumes explanation and visual generation stream to the frontend (users see text appearing progressively). This requires WebSocket connections and a streaming-capable LLM client. If streaming adds too much frontend complexity for MVP, the fallback is complete responses with a loading indicator, at the cost of perceived latency (users wait 10-15s seeing nothing instead of seeing text appear incrementally).

**4. GROBID availability.** GROBID runs as a Docker sidecar. If the hosting environment restricts Docker-in-Docker or sidecar containers, GROBID must run as an external service. The Paper Ingestion module communicates with GROBID via REST regardless, so this is a deployment concern, not an architecture change.
