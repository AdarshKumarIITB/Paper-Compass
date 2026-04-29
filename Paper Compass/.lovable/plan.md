

# PaperLens — AI Research Assistant MVP

## Overview
Build a research paper discovery, evaluation, and comprehension tool with three modes, a paper library, and onboarding calibration. All pages use mock data initially.

## Design System Setup
- Custom color palette: warm off-white background (#FAFAF7), near-black text (#1A1A1A), teal accent (#2A7F7F), amber warning (#D4920B), semantic colors for diagrams (blue/green/coral)
- Typography: Lora (serif for reading), DM Sans (sans-serif for UI), JetBrains Mono (monospace)
- Layout system: 720px centered reading column, 240px collapsible left sidebar, 280px right margin panel
- Generous vertical spacing, compact horizontal spacing

## Supabase Schema
Create all tables with RLS: users, papers, evaluations, sections, section_explanations, conversations, threads, messages, comprehension_states, discovery_sessions, paper_lineage

## Pages (built in order)

### 1. Home Page (/)
- Two-panel layout: Discover (search + filters + recent searches) and Evaluate (URL/DOI/PDF input)
- "Your Library" section with 6 recent paper cards + "View all" link

### 2. Discover Results (/discover?q=...)
- Editable query field, filter chips, sortable results
- Paper cards with title, authors, citations, contribution summary, status badges
- Infinite scroll with skeleton loaders

### 3. Evaluate Page (/paper/:id/evaluate)
- Structured 5-section evaluation: claims, method + diagram, evidence strength bar, prerequisites, reading time
- CTA buttons: "Read this paper →" and "Find related papers"

### 4. Comprehend Page (/paper/:id/read)
- Three-column layout: outline sidebar, reading area, thread margin
- Global + per-section depth selector (Conceptual/Technical/Formal)
- Section rendering: glossary, explanation, inline visuals, unfamiliar term highlighting
- Phase 1/Phase 2 blocks for deep dives, citation popovers
- Depth transition animations, progress persistence

### 5. Thread Panel
- Right-margin chat panel triggered by clicking unfamiliar terms
- Independent depth control, chat-style follow-up interface

### 6. Library (/library)
- Filterable/sortable card grid with status chips, progress bars
- Implicit grouping by discovery lineage

### 7. Onboarding (/onboarding)
- 3-step flow: intro → depth calibration with sample content → confirmation

## Reusable Components
SearchInput, PaperEntryInput, PaperCard, EvaluationView, DepthSelector, SectionRenderer, VisualContainer, ThreadPanel, ThreadTrigger, CitationPopover, PaperOutlineSidebar, LibraryGrid, OnboardingFlow, SkeletonLoaders, EvidenceBar, ProgressBar, BreadcrumbNav

## Responsive Behavior
- <1200px: right margin becomes slide-over panel
- <768px: sidebar → hamburger, single-column layouts, stacked visuals

## Mock Data
All pages populated with realistic CS paper data (attention mechanisms, transformers, etc.) — no API integrations yet.

