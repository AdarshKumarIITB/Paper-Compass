/**
 * Sliding-window worker pool that fetches per-section explanations in order
 * with at most N requests in flight at any time.
 *
 * Why a custom hook (not just N TanStack Queries):
 *  - We need a strict ordering guarantee — the queue is processed by section.order
 *    so Section 1 starts first.
 *  - We need a strict in-flight cap (N=3) so the browser doesn't open 10 connections
 *    and burn through Anthropic's per-account concurrency.
 *  - On unmount we cancel everything via AbortController. TanStack's per-query cancel
 *    doesn't help when it's the queue itself that needs to stop.
 */
import { useEffect, useRef, useState } from "react";
import { getSectionExplanation } from "@/lib/api";
import type { DepthLevel, Section, SectionExplanation, VisualStatus } from "@/lib/types";

export interface ExplanationState {
  status: "idle" | "loading" | "ready" | "error";
  explanation?: SectionExplanation;
  visualStatus?: VisualStatus;
  error?: string;
}

interface UseOrderedExplanationsResult {
  byId: Record<string, ExplanationState>;
  /** Total fraction (0..1) of sections that have at least their text loaded. */
  progress: number;
}

export function useOrderedSectionExplanations(
  paperId: string | undefined,
  sections: Section[] | undefined,
  depth: DepthLevel,
  windowSize = 3,
): UseOrderedExplanationsResult {
  const [byId, setById] = useState<Record<string, ExplanationState>>({});
  const inFlightRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<string[]>([]);
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    if (!paperId || !sections || sections.length === 0) {
      setById({});
      return;
    }

    const controllers = abortRef.current;

    // Reset state on key change (paper or depth)
    setById(() => {
      const init: Record<string, ExplanationState> = {};
      for (const s of sections) init[s.id] = { status: "idle" };
      return init;
    });

    const ordered = [...sections].sort((a, b) => a.order - b.order).map((s) => s.id);
    queueRef.current = ordered;
    inFlightRef.current = new Set();

    let stopped = false;

    const fetchOne = async (sectionId: string) => {
      if (stopped) return;
      const ctrl = new AbortController();
      controllers.set(sectionId, ctrl);
      setById((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], status: "loading" },
      }));
      try {
        const explanation = await getSectionExplanation(
          paperId,
          sectionId,
          depth,
          ctrl.signal,
        );
        if (stopped) return;
        setById((prev) => ({
          ...prev,
          [sectionId]: {
            status: "ready",
            explanation,
            visualStatus: explanation.visualStatus ?? "pending",
          },
        }));
      } catch (err) {
        if (stopped) return;
        // AbortError is fine — the user navigated away or the depth changed
        if (
          err instanceof DOMException &&
          (err.name === "AbortError" || err.name === "TimeoutError")
        ) {
          return;
        }
        const message = err instanceof Error ? err.message : "Request failed";
        setById((prev) => ({
          ...prev,
          [sectionId]: { status: "error", error: message },
        }));
      } finally {
        controllers.delete(sectionId);
        inFlightRef.current.delete(sectionId);
        if (!stopped) pump();
      }
    };

    const pump = () => {
      while (
        !stopped &&
        inFlightRef.current.size < windowSize &&
        queueRef.current.length > 0
      ) {
        const next = queueRef.current.shift()!;
        if (inFlightRef.current.has(next)) continue;
        inFlightRef.current.add(next);
        // Fire and forget — fetchOne re-pumps on completion.
        void fetchOne(next);
      }
    };

    pump();

    return () => {
      stopped = true;
      for (const ctrl of controllers.values()) ctrl.abort();
      controllers.clear();
      inFlightRef.current.clear();
      queueRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId, depth, sections?.map((s) => s.id).join("|")]);

  const total = sections?.length || 0;
  const ready = total > 0
    ? Object.values(byId).filter((s) => s.status === "ready").length
    : 0;
  const progress = total > 0 ? ready / total : 0;

  return { byId, progress };
}
