import type {
  Paper,
  Evaluation,
  Section,
  SectionExplanation,
  SectionVisual,
  Thread,
  ThreadMessage,
  CitedPaper,
  DepthLevel,
  User,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || res.statusText);
  }
  return res.json();
}

export async function apiFetchSignal<T>(
  path: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, { ...init, signal });
}

async function apiFetchForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || res.statusText);
  }
  return res.json();
}

// -- Auth --

export function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export const googleSignInUrl = `${BASE_URL}/auth/google/start`;

// -- Discover --

export function searchPapers(
  query: string,
  timeRange?: string,
  sort?: string,
): Promise<{ papers: Paper[] }> {
  const params = new URLSearchParams({ q: query });
  if (timeRange) params.set("timeRange", timeRange);
  if (sort) params.set("sort", sort);
  return apiFetch(`/discover?${params}`);
}

// -- Papers --

export function getPaper(id: string): Promise<Paper> {
  return apiFetch(`/papers/${id}`);
}

export function submitPaper(input: { type: string; value: string }): Promise<Paper> {
  return apiFetch("/papers", { method: "POST", body: JSON.stringify(input) });
}

export function uploadPaperPdf(file: File): Promise<Paper> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetchForm("/papers/upload", formData);
}

export function uploadPdfForPaper(paperId: string, file: File): Promise<Paper> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetchForm(`/papers/${paperId}/upload`, formData);
}

export function acknowledgeMatch(paperId: string): Promise<Paper> {
  return apiFetch(`/papers/${paperId}/acknowledge-match`, { method: "POST" });
}

// -- Evaluation --

export function getEvaluation(paperId: string): Promise<Evaluation> {
  return apiFetch(`/papers/${paperId}/evaluate`);
}

// -- Sections --

export function getSections(paperId: string): Promise<Section[]> {
  return apiFetch(`/papers/${paperId}/sections`);
}

export function getSectionExplanation(
  paperId: string,
  sectionId: string,
  depth: DepthLevel,
  signal?: AbortSignal,
): Promise<SectionExplanation> {
  return apiFetch(`/papers/${paperId}/sections/${sectionId}/explain?depth=${depth}`, {
    signal,
  });
}

export function getSectionVisual(
  paperId: string,
  sectionId: string,
  depth: DepthLevel,
): Promise<SectionVisual> {
  return apiFetch(`/papers/${paperId}/sections/${sectionId}/visual?depth=${depth}`);
}

// -- Threads --

export function createTermThread(
  paperId: string,
  args: { sectionId: string; selectedText: string; term?: string; depthLevel: DepthLevel },
): Promise<Thread> {
  return apiFetch(`/papers/${paperId}/threads`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function getOrCreateCopilot(
  paperId: string,
  depthLevel: DepthLevel = "technical",
): Promise<Thread> {
  return apiFetch(`/papers/${paperId}/copilot`, {
    method: "POST",
    body: JSON.stringify({ depthLevel }),
  });
}

export function listThreadsForPaper(paperId: string): Promise<Thread[]> {
  return apiFetch(`/papers/${paperId}/threads`);
}

export type ChatIntent = "recommend";

export function sendThreadMessage(
  threadId: string,
  content: string,
  intent?: ChatIntent,
): Promise<ThreadMessage> {
  return apiFetch(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(intent ? { content, intent } : { content }),
  });
}

// -- Library --

export async function getLibrary(): Promise<Paper[]> {
  const res = await apiFetch<{ papers: Paper[] }>("/library");
  return res.papers;
}

// -- Citations --

export function getCitations(paperId: string): Promise<CitedPaper[]> {
  return apiFetch(`/papers/${paperId}/citations`);
}

// -- Onboarding --

export function calibrateDepth(defaultDepth: DepthLevel): Promise<void> {
  return apiFetch("/users/calibrate", {
    method: "POST",
    body: JSON.stringify({ defaultDepth }),
  });
}
