import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getSections,
  getSectionExplanation,
  getSectionVisual,
  createTermThread,
  getOrCreateCopilot,
  listThreadsForPaper,
  sendThreadMessage,
  type ChatIntent,
} from "@/lib/api";
import type { DepthLevel, SectionVisual, Thread } from "@/lib/types";

export function useSections(paperId: string | undefined) {
  return useQuery({
    queryKey: ["sections", paperId],
    queryFn: () => getSections(paperId!),
    enabled: !!paperId,
  });
}

export function useSectionExplanation(
  paperId: string | undefined,
  sectionId: string,
  depth: DepthLevel,
) {
  return useQuery({
    queryKey: ["sectionExplanation", paperId, sectionId, depth],
    queryFn: () => getSectionExplanation(paperId!, sectionId, depth),
    enabled: !!paperId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Polls /visual at 5s when pending. Once status flips to a terminal value
 * (ready / failed / skipped) the polling stops. Stays cached forever once terminal.
 */
export function useSectionVisualPolling(
  paperId: string | undefined,
  sectionId: string | undefined,
  depth: DepthLevel,
  enabled: boolean,
) {
  return useQuery<SectionVisual>({
    queryKey: ["sectionVisual", paperId, sectionId, depth],
    queryFn: () => getSectionVisual(paperId!, sectionId!, depth),
    enabled: enabled && !!paperId && !!sectionId,
    refetchInterval: (q) => (q.state.data?.visualStatus === "pending" ? 5000 : false),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export function useCopilotThread(paperId: string | undefined, depthLevel: DepthLevel) {
  return useQuery<Thread>({
    queryKey: ["copilotThread", paperId],
    queryFn: () => getOrCreateCopilot(paperId!, depthLevel),
    enabled: !!paperId,
    staleTime: Infinity,
  });
}

export function useCreateTermThread(paperId: string | undefined) {
  return useMutation({
    mutationFn: ({
      sectionId,
      selectedText,
      term,
      depthLevel,
    }: {
      sectionId: string;
      selectedText: string;
      term?: string;
      depthLevel: DepthLevel;
    }) =>
      createTermThread(paperId!, { sectionId, selectedText, term, depthLevel }),
  });
}

export function useThreadsForPaper(paperId: string | undefined) {
  return useQuery({
    queryKey: ["threadsForPaper", paperId],
    queryFn: () => listThreadsForPaper(paperId!),
    enabled: !!paperId,
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: ({
      threadId,
      content,
      intent,
    }: {
      threadId: string;
      content: string;
      intent?: ChatIntent;
    }) => sendThreadMessage(threadId, content, intent),
  });
}
