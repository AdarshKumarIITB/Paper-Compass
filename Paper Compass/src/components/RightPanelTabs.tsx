import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export type RightTab = "copilot" | "term";

interface RightPanelTabsProps {
  activeTab: RightTab;
  onChange: (tab: RightTab) => void;
}

const TABS: { id: RightTab; label: string }[] = [
  { id: "copilot", label: "Copilot" },
  { id: "term", label: "Ask AI about this" },
];

export function RightPanelTabs({ activeTab, onChange }: RightPanelTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Left/right arrow keyboard nav across the two tabs
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!el.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange("copilot");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange("term");
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Chat surfaces"
      className="flex border-b border-border bg-card/60"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 text-xs font-sans px-3 py-2.5 transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              isActive
                ? "text-foreground font-medium border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
