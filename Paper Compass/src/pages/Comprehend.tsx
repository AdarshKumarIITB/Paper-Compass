import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePaper } from "@/hooks/use-papers";
import type { ChatIntent } from "@/lib/api";
import {
  useSections,
  useSectionExplanation,
  useSectionVisualPolling,
  useCopilotThread,
  useCreateTermThread,
} from "@/hooks/use-comprehend";
import { useOrderedSectionExplanations, type ExplanationState } from "@/hooks/use-ordered-explanations";
import { DepthSelector } from "@/components/DepthSelector";
import { SectionRenderer } from "@/components/SectionRenderer";
import { ThreadPanel } from "@/components/ThreadPanel";
import { RightPanelTabs, type RightTab } from "@/components/RightPanelTabs";
import { CopilotEmptyState } from "@/components/CopilotEmptyState";
import { SelectionPopover } from "@/components/SelectionPopover";
import { useSendMessage } from "@/hooks/use-comprehend";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Menu, X, Sparkles, ChevronsRight } from "lucide-react";
import type { DepthLevel, Thread } from "@/lib/types";

function SectionContent({
  paperId,
  sectionId,
  sectionTitle,
  depth,
  globalDepth,
  state,
  onDepthChange,
}: {
  paperId: string;
  sectionId: string;
  sectionTitle: string;
  depth: DepthLevel;
  globalDepth: DepthLevel;
  state: ExplanationState | undefined;
  onDepthChange: (dir: "deeper" | "simpler") => void;
}) {
  // The worker pool only fetches at globalDepth. If the user has changed this
  // section's depth via the "Go deeper / Simplify" controls, fall back to a
  // single-section query at the requested depth.
  const usePool = depth === globalDepth;
  const fallback = useSectionExplanation(usePool ? undefined : paperId, sectionId, depth);

  const explanation = usePool ? state?.explanation : fallback.data;
  const isLoading = usePool
    ? state?.status === "loading" || state?.status === "idle"
    : fallback.isLoading;
  const visualStatusFromState = usePool ? state?.visualStatus : explanation?.visualStatus;

  // Poll the visual endpoint while the explanation is ready but its visual is pending.
  const visualPending = !!explanation && visualStatusFromState === "pending";
  const { data: visualPoll } = useSectionVisualPolling(
    paperId,
    sectionId,
    depth,
    visualPending,
  );

  const visualSvg = visualPoll?.visual ?? explanation?.visual ?? null;
  const visualStatus = visualPoll?.visualStatus ?? visualStatusFromState;

  return (
    <SectionRenderer
      title={sectionTitle}
      explanation={explanation}
      depthLevel={depth}
      onTermClick={() => {
        /* no-op: term clicking is now driven by free-text selection */
      }}
      onDepthChange={onDepthChange}
      isLoading={isLoading}
      visualOverride={visualSvg}
      visualStatus={visualStatus}
    />
  );
}

export default function ComprehendPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: paper } = usePaper(id);
  const { data: sections } = useSections(id);

  const [globalDepth, setGlobalDepth] = useState<DepthLevel>("technical");
  const [perSectionDepth, setPerSectionDepth] = useState<Record<string, DepthLevel>>({});

  const [activeTab, setActiveTab] = useState<RightTab>("copilot");
  const [termThread, setTermThread] = useState<Thread | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const [viewedSections, setViewedSections] = useState<Set<string>>(new Set());
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const readingRef = useRef<HTMLDivElement>(null);

  const sectionList = sections || [];

  const { data: copilotThread } = useCopilotThread(id, globalDepth);
  const createTermThread = useCreateTermThread(id);
  const copilotSendMutation = useSendMessage();
  const queryClient = useQueryClient();

  // Worker pool: at most 3 explain requests in flight, processed by section.order.
  // Note: we drive this off the global depth, not per-section depth, because the
  // pool re-keys on `depth` change. Per-section depth still works via direct fetch
  // from inside SectionRenderer's "go deeper" / "simplify" controls — those use
  // the existing single-section query path.
  const { byId: explanationById } = useOrderedSectionExplanations(
    id,
    sectionList,
    globalDepth,
  );

  // Initial active section
  useEffect(() => {
    if (sectionList.length > 0 && activeSectionId === null) {
      setActiveSectionId(sectionList[0].id);
      setViewedSections(new Set([sectionList[0].id]));
    }
  }, [sectionList, activeSectionId]);

  // Cmd+/ toggles the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setPanelOpen((p) => !p);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const getSectionDepth = (sectionId: string) =>
    perSectionDepth[sectionId] || globalDepth;

  const handleGlobalDepthChange = (level: DepthLevel) => {
    setGlobalDepth(level);
    setPerSectionDepth({});
  };

  const handleSectionDepthChange = (
    sectionId: string,
    direction: "deeper" | "simpler",
  ) => {
    const current = getSectionDepth(sectionId);
    const levels: DepthLevel[] = ["conceptual", "technical", "formal"];
    const idx = levels.indexOf(current);
    const next = direction === "deeper" ? levels[idx + 1] : levels[idx - 1];
    if (next) setPerSectionDepth((prev) => ({ ...prev, [sectionId]: next }));
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setViewedSections((prev) => new Set([...prev, sectionId]));
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  // Resolve a selection's section by walking up to the closest [data-section-id] ancestor
  const resolveSectionId = useCallback((node: Node): string | null => {
    let el: Node | null = node;
    while (el && el !== readingRef.current) {
      if (el instanceof HTMLElement && el.dataset.sectionId) return el.dataset.sectionId;
      el = el.parentNode;
    }
    return null;
  }, []);

  const handleAsk = (selectedText: string, sectionId: string) => {
    if (!id) return;
    setActiveTab("term");
    setPanelOpen(true);
    createTermThread.mutate(
      { sectionId, selectedText, depthLevel: globalDepth },
      {
        onSuccess: (thread) => setTermThread(thread),
      },
    );
  };

  const handleCopilotPrompt = (prompt: string, intent?: ChatIntent) => {
    if (!copilotThread) return;
    if (copilotSendMutation.isPending) return;

    // Optimistically push the user's message into the cache so the empty state
    // flips to the chat view immediately and the user sees their prompt.
    const optimisticUser = {
      id: `local-${Date.now()}`,
      role: "user" as const,
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    queryClient.setQueryData<Thread>(["copilotThread", id], (prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticUser] } : prev,
    );

    copilotSendMutation.mutate(
      { threadId: copilotThread.id, content: prompt, intent },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["copilotThread", id] });
        },
        onError: () => {
          // Roll back the optimistic user message if the request failed.
          queryClient.setQueryData<Thread>(["copilotThread", id], (prev) =>
            prev
              ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticUser.id) }
              : prev,
          );
        },
      },
    );
  };

  const paperTitle = paper?.title || "Loading...";
  const activeSection = activeSectionId
    ? sectionList.find((s) => s.id === activeSectionId)
    : null;
  const termSection = termThread?.sectionId
    ? sectionList.find((s) => s.id === termThread.sectionId)
    : null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
              aria-label="Toggle section list"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <nav className="text-xs font-sans text-muted-foreground flex items-center gap-1 min-w-0">
              <button
                onClick={() => navigate("/library")}
                className="hover:text-foreground transition-colors shrink-0 cursor-pointer"
              >
                Library
              </button>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate text-foreground font-medium">{paperTitle}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <DepthSelector value={globalDepth} onChange={handleGlobalDepthChange} size="sm" />
            <button
              onClick={() => setPanelOpen((p) => !p)}
              className="hidden lg:inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-xs font-sans text-muted-foreground cursor-pointer"
              title="Toggle chat panel (⌘/)"
              aria-label="Toggle chat panel"
            >
              {panelOpen ? <ChevronsRight className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {panelOpen ? "Hide" : "Chat"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left sidebar */}
        <aside
          className={cn(
            "w-sidebar border-r border-border bg-card/30 overflow-y-auto shrink-0 transition-all duration-200 h-full min-h-0",
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full absolute lg:relative lg:translate-x-0",
            "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-10 max-lg:bg-card max-lg:shadow-lg",
          )}
        >
          <div className="p-4">
            <button
              onClick={() => navigate("/home")}
              className="font-serif text-lg font-bold text-foreground tracking-tight mb-6 block cursor-pointer"
            >
              Paper Compass
            </button>
            <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-3">
              Sections
            </p>
            <nav className="space-y-0.5">
              {sectionList.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm font-sans transition-colors cursor-pointer",
                    activeSectionId === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {viewedSections.has(section.id) && (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  )}
                  <span className="truncate">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Center column */}
        <main className="flex-1 overflow-y-auto" ref={readingRef}>
          <div className="max-w-reading mx-auto px-6 py-8">
            {sectionList.map((section) => (
              <div key={section.id} id={section.id} data-section-id={section.id}>
                <SectionContent
                  paperId={id!}
                  sectionId={section.id}
                  sectionTitle={section.title}
                  depth={getSectionDepth(section.id)}
                  globalDepth={globalDepth}
                  state={explanationById[section.id]}
                  onDepthChange={(dir) => handleSectionDepthChange(section.id, dir)}
                />
              </div>
            ))}
          </div>
        </main>

        {/* Right panel: 2 fixed tabs */}
        {panelOpen && (
          <aside
            className={cn(
              "w-[380px] shrink-0 border-l border-border bg-card flex flex-col h-full min-h-0",
              "max-xl:absolute max-xl:right-0 max-xl:inset-y-0 max-xl:z-10 max-xl:shadow-lg",
            )}
          >
            <RightPanelTabs activeTab={activeTab} onChange={setActiveTab} />
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeTab === "copilot" ? (
                copilotThread ? (
                  copilotThread.messages.length === 0 ? (
                    <div className="flex flex-col h-full min-h-0">
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <CopilotEmptyState
                          paperTitle={paperTitle}
                          onPrompt={handleCopilotPrompt}
                        />
                      </div>
                      <ThreadPanel
                        thread={copilotThread}
                        placeholder="Ask anything about this paper..."
                        className="h-auto border-t border-border shrink-0"
                        externalPending={copilotSendMutation.isPending}
                      />
                    </div>
                  ) : (
                    <ThreadPanel
                      thread={copilotThread}
                      placeholder="Ask anything about this paper..."
                      className="h-full min-h-0"
                      externalPending={copilotSendMutation.isPending}
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-xs font-sans text-muted-foreground">
                    Loading copilot…
                  </div>
                )
              ) : termThread ? (
                <ThreadPanel
                  thread={termThread}
                  subhead={termSection ? `From: ${termSection.title}` : undefined}
                  className="h-full min-h-0"
                />
              ) : createTermThread.isPending ? (
                <div className="flex flex-col items-center justify-center h-full text-xs font-sans text-muted-foreground gap-2">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  Looking up that phrase…
                </div>
              ) : (
                <TermEmptyState />
              )}
            </div>
          </aside>
        )}

        {/* Floating selection popover */}
        <SelectionPopover
          containerRef={readingRef}
          resolveSectionId={resolveSectionId}
          onAsk={handleAsk}
          disabled={!id || createTermThread.isPending}
        />
      </div>
    </div>
  );
}

function TermEmptyState() {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12 gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="font-serif text-base font-semibold">Highlight to ask</h3>
      <p className="text-sm font-sans text-muted-foreground leading-relaxed max-w-xs">
        Drag-select any word or phrase in the reading area, then click{" "}
        <span className="text-foreground font-medium">"Ask AI about this"</span>. The chat will appear here.
      </p>
    </div>
  );
}
