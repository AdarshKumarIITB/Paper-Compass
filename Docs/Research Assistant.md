#### Area 1: Discovery

Narrow to CS only. Recommendation: Semantic Scholar API as your sole data layer.

What you get out of the box. Pre-computed SPECTER2 embeddings for every paper (so you can do semantic similarity search without running your own model). An "influential citations" classifier that tags whether a citation is substantive or perfunctory — this is the single most useful signal for distinguishing foundational from merely popular papers. AI-generated TLDR summaries. Full citation graphs with both references and citations exposed per paper. Author disambiguation that's tuned for CS specifically.

Implementation path. Authenticated access is free at 1 request/second (100 requests/second with a partner API key, which they grant to research tools). The API returns JSON with clean pagination. For your MVP, you need exactly three endpoints: /paper/search (semantic search by topic), /paper/{id} (metadata, abstract, TLDR, citation counts, influential citation counts), and /paper/{id}/citations + /paper/{id}/references (citation graph traversal). A basic discovery flow is: (1) semantic search to get seed papers, (2) pull citation graphs for top results, (3) rank by influential citation count as a proxy for foundational importance, (4) use publication date + citation velocity for recency weighting.

#### Area 2: How to explain a paper well - principles of our product for it to be useful to end user.

**Gray & Holyoak: Five principles for analogy-based explanation**

Gray & Holyoak's framework (2021, _Mind, Brain, and Education_) distills decades of analogical reasoning research into five conditions under which analogies produce learning rather than confusion. Here's what each means for your product:

**1. Start with a familiar source domain the reader already knows.** The analogy must map from something the reader has experience with. For a semi-technical audience reading a transformer paper, "attention is like a spotlight scanning a crowd" works; "attention is like a bilinear form on a tensor product space" does not. _Product implication:_ Your system needs a reader model that tracks what concepts the user has already encountered or demonstrated understanding of. When generating an explanation, the LLM prompt should include the reader's estimated background and instruct it to select analogies from domains the reader knows.

**2. Make the structural mapping explicit, not implicit.** The analogy should spell out which parts of the familiar thing correspond to which parts of the new thing. Saying "a neural network is like a brain" is almost useless because the mapping is vague. Saying "each layer of the network transforms its input the way each step in a recipe transforms ingredients — the output of step 3 becomes the input to step 4" makes the mapping concrete. _Product implication:_ When your system generates analogies, prompt it to produce explicit A↔B mappings, not just "X is like Y" statements. Consider a visual format: a two-column table or parallel diagram showing the source domain alongside the target domain with explicit correspondence lines.

**3. Highlight where the analogy breaks down.** All analogies have limits, and failing to flag those limits causes misconceptions that are harder to correct than the original confusion. _Product implication:_ Every analogy your system produces should include a "where this breaks down" note. This is counterintuitive from a product perspective — it feels like undermining your own explanation — but the research shows it produces significantly better learning outcomes. Users trust explanations more when limitations are acknowledged.

**4. Use multiple analogies for complex concepts.** A single analogy captures one structural relationship. Complex technical concepts have multiple structural aspects that no single analogy covers. The recommendation is to use 2–3 complementary analogies that each illuminate a different aspect. _Product implication:_ For concepts the user is struggling with (detected via follow-up questions or explicit "I don't get it" signals), offer alternative analogies rather than restating the same one with different words.

**5. Require the reader to generate inferences from the analogy.** Passive reception of analogies produces shallow learning. Asking the reader to predict what should happen next based on the analogy, or to identify which part of the new concept maps to which part of the familiar one, produces durable understanding. _Product implication:_ Consider adding optional "check your understanding" prompts after analogy-based explanations — "Based on this analogy, what would you expect happens when the input sequence gets longer?" This is the hardest principle to implement without feeling like a quiz, but it's the one with the strongest effect size.

**Mayer's Multimedia Learning: The 12 principles ranked by relevance**

Richard Mayer's framework is based on 30+ years of controlled experiments at UC Santa Barbara. The principles describe when combining visual and verbal information helps versus hurts learning. I've ranked them by relevance to a paper comprehension tool, grouping into three tiers.

**Tier 1 — Build your visual explanation system around these:**

_Multimedia Principle._ People learn better from words + pictures than words alone. This is the foundational result. Effect sizes are large (d ≈ 1.0 across meta-analyses). _For your product:_ This validates the entire visual-first premise. Every paper explanation should have a visual component by default.

_Spatial Contiguity Principle._ Corresponding words and pictures should be physically near each other, not separated. Placing a diagram on one screen and its explanation on another forces the reader to hold one in working memory while looking at the other, which degrades learning. _For your product:_ Inline visual explanations positioned next to the relevant paper text, not in a separate panel. If you use a side-by-side layout, anchor the visual to the specific passage it explains and scroll them together.

_Temporal Contiguity Principle._ Corresponding words and pictures should appear simultaneously, not sequentially. _For your product:_ Don't show an animation first and then explain it. Build explanations where the visual and the text appear together. For step-by-step algorithm visualizations, each step should show both the visual state and the verbal explanation at the same time.

_Signaling Principle._ People learn better when cues highlight the organization of essential material — headings, bold key terms, arrows pointing to relevant parts of a diagram. _For your product:_ In generated diagrams, annotate the parts that correspond to key concepts. Use color coding consistently (e.g., blue for input, green for processing, red for output) and include a legend. Don't produce a raw diagram and expect the reader to figure out what to look at.

_Segmenting Principle._ People learn better when a complex lesson is broken into smaller, user-paced segments rather than presented as one continuous unit. _For your product:_ This directly supports progressive disclosure / depth-adjustable explanation. Start with a high-level overview (3–5 sentence summary + overview diagram), then let the user expand any section for more detail. Each expansion is a segment.

**Tier 2 — Apply these as design constraints:**

_Coherence Principle._ People learn better when extraneous material is excluded. Adding interesting-but-irrelevant visuals, background music, or tangential details hurts learning. _For your product:_ Resist the temptation to make diagrams visually busy. Every element in a generated diagram should correspond to something in the paper. Decorative elements hurt comprehension.

_Redundancy Principle._ People learn better from graphics + narration than from graphics + narration + on-screen text. Adding text that duplicates what the narration says overloads the visual channel. _For your product:_ If you use animations with voiceover or text narration, don't also put the full text on screen. Use short labels on diagrams, not full sentences.

_Pre-training Principle._ People learn more deeply when they already know the names and characteristics of key concepts before encountering the full explanation. _For your product:_ Before diving into a paper's method, present a glossary of the 3–5 key terms the paper relies on, with brief definitions. Semantic Reader's term definition feature does exactly this. Build it.

_Modality Principle._ People learn better from pictures + spoken words than pictures + printed words, because spoken words use the auditory channel while printed words compete with the picture for the visual channel. _For your product:_ If you add audio explanation, pair it with visuals. If the interface is text-only, the modality principle is less applicable — but it suggests that for particularly complex diagrams, an audio walkthrough option would outperform a text caption.

**Tier 3 — Nice to have, lower priority:**

_Personalization Principle._ People learn better from conversational style than formal style. _For your product:_ Generate explanations in second person ("you can think of this as...") rather than impersonal academic prose ("one might observe that...").

_Voice Principle._ People learn better when narration is in a human voice rather than machine voice. _Less relevant for a text-based tool, but worth noting if you add TTS._

_Image Principle._ People don't necessarily learn better when the speaker's image is on screen. _Not relevant for your use case._

**Synthesis: what to build**

The combination of Gray & Holyoak + Mayer suggests a specific explanation architecture:

1. **Pre-train** the reader on key terms (Mayer Pre-training + Semantic Reader's definitions)
2. **Show** an overview diagram + summary simultaneously (Mayer Multimedia + Temporal Contiguity)
3. **Segment** the explanation into expandable depth levels (Mayer Segmenting)
4. **Use analogies** with explicit mappings and acknowledged limitations at each level (Gray & Holyoak principles 1–3)
5. **Annotate** visuals with clear signaling, no decorative elements (Mayer Signaling + Coherence)
6. **Place** visuals inline next to the text they explain (Mayer Spatial Contiguity)
7. **Optionally prompt** for reader inference to deepen understanding (Gray & Holyoak principle 5)

#### Area 3 - How to explain a paper visually?

SCISKETCH (github.com/yale-nlp/SciSketch) generates draw.io XML with a self-refinement loop. The repo is open-source.

#### Area 4 - How to branch conversations effectively

**Recommendation: Tree data model + context summarization, skip the research frameworks**

ContextBranch and CTA are academically interesting but over-engineered for your use case. You don't need Git-like merge semantics or volatile branch auto-discard. You need: (1) the ability to open a side conversation about a sub-topic, (2) the ability to return to the main thread without losing context, and (3) the side conversation to be grounded in the same paper.

**The minimum data model**

Conversation {

  id: string

  paper_id: string

  root_thread_id: string

}

  

Thread {

  id: string

  conversation_id: string

  parent_thread_id: string | null    // null = root thread

  branch_point_message_id: string | null  // which message spawned this thread

  title: string                      // auto-generated from first message

  status: "active" | "parked"

  messages: Message[]

}

  

Message {

  id: string

  thread_id: string

  role: "user" | "assistant"

  content: string

  paper_sections_referenced: string[] // which sections of the paper were used

  timestamp: datetime

}

This is a simple tree: each Thread has one optional parent Thread. No merge, no DAG, no Git semantics. A user branches by clicking "explore this" on any assistant message, which creates a child Thread with branch_point_message_id set to that message.

**Context management: the actual hard part**

When the user is in a branch thread, the LLM needs to know:

- What the main thread was discussing (so it doesn't repeat information)
- What the branch is about (so it stays focused)
- The relevant paper sections (so it stays grounded)

The practical approach, ordered by implementation effort:

**Level 1 (MVP): Summary injection.** When creating a branch, generate a 2–3 sentence summary of the main thread up to the branch point. Prepend this to the branch thread's system prompt as context. When returning to the main thread, generate a 1-sentence summary of what was discussed in the branch and append it as a system note. This is what MemGPT's recursive summarization does, adapted for branching.

Implementation: one LLM call at branch creation, one at branch return. The summaries become part of the thread's message history.

**Technical implementation pattern**

For the frontend, the simplest UX that works:

- **Main view:** Linear chat with the paper, identical to existing tools.
- **Branch trigger:** On any assistant message, a small "Explore this" button. Clicking it opens a new chat panel (slide-over or tab) pre-seeded with the branch context.
- **Navigation:** A breadcrumb bar at the top showing the thread tree: "Main → Attention Mechanisms → Multi-Head vs Single-Head." Clicking any node switches to that thread.
- **Return:** A "Back to main" button that optionally injects a summary.

For the backend, use the tree data model above. Each thread maintains its own message array. When sending a request to the LLM, construct the message history from the current thread's messages, prepended with the parent thread summary. Store paper section references per message so that branch threads can retrieve from the same paper sections the parent was discussing.

**What to use from existing open source**

**LobeChat** (github.com/lobehub/lobe-chat) already implements conversation branching with a tree structure and could serve as a reference implementation for the UI patterns. Its branching is conversation-level (create a new conversation from any message) rather than in-conversation threading, but the data model is similar.

For context management, the recursive summarization approach from Wang et al. (arXiv:2308.15022) is the most practical. Their method: after every N turns, generate a summary of the oldest messages and replace them with the summary, keeping the most recent messages in full. Adapt this per-thread rather than per-conversation.

**The one thing to get right**

The critical UX decision is **how the user returns to the main thread**.