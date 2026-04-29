export type DepthLevel = "conceptual" | "technical" | "formal";

export type PaperStatus =
  | "discovered"
  | "fetching_pdf"
  | "awaiting_upload"
  | "parsing"
  | "awaiting_confirmation"
  | "summarizing"
  | "ready"
  | "failed"
  // legacy values still possible for older rows
  | "evaluated"
  | "reading"
  | "completed";

export type MatchVerdict = "match" | "mismatch" | "uncertain";

export interface Author {
  name: string;
  affiliation?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: Author[];
  year: number;
  venue: string;
  abstract: string;
  status: PaperStatus;
  processingStep?: string;
  failureReason?: string;
  matchVerdict?: MatchVerdict | null;
  matchReason?: string | null;
  matchAcknowledged?: boolean;
  hasDeepDive?: boolean;
  citationCount: number;
  influentialCitationCount: number;
  contributionSummary: string;
  lastInteraction?: string;
  comprehensionProgress?: number;
  sourceQuery?: string;
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  pictureUrl: string | null;
  depthCalibration: DepthLevel;
  onboardingCompleted: boolean;
}

export interface Evaluation {
  id: string;
  paperId: string;
  claimSummary: string;
  methodOverview: string;
  methodVisual: string; // SVG string
  evidenceAssessment: string;
  evidenceStrength: "weak" | "mixed" | "solid" | "strong";
  prerequisites: Prerequisite[];
  readingTimeEstimates: {
    conceptual: number;
    technical: number;
    formal: number;
  };
  createdAt: string;
}

export interface Prerequisite {
  name: string;
  level: "basic" | "intermediate" | "advanced";
}

export interface Section {
  id: string;
  paperId: string;
  title: string;
  order: number;
}

export type VisualStatus = "pending" | "ready" | "skipped" | "failed";

export interface SectionExplanation {
  sectionId: string;
  depthLevel: DepthLevel;
  explanationText: string;
  glossary: GlossaryTerm[];
  visual?: string | null; // SVG string; null while generating
  visualCaption?: string | null;
  visualStatus?: VisualStatus;
  unfamiliarTerms: string[];
}

export interface SectionVisual {
  sectionId: string;
  depthLevel: DepthLevel;
  visual: string | null;
  visualCaption: string | null;
  visualStatus: VisualStatus;
  qualityScore?: number | null;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface ThreadMessage {
  id: string;
  role: "system" | "user";
  content: string;
  createdAt: string;
}

export type ThreadType = "term" | "paper";

export interface Thread {
  id: string;
  threadType: ThreadType;
  term?: string | null;
  selectedText?: string | null;
  sectionId?: string | null;
  messages: ThreadMessage[];
  depthLevel: DepthLevel;
}

export interface CitedPaper {
  id: string;
  title: string;
  authors: Author[];
  year: number;
  microEvaluation: string;
}
