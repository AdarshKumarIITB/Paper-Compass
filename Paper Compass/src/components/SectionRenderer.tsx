import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualContainer } from "@/components/VisualContainer";
import type {
  SectionExplanation,
  DepthLevel,
  GlossaryTerm,
  VisualStatus,
} from "@/lib/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SectionRendererProps {
  title: string;
  explanation: SectionExplanation | undefined;
  depthLevel: DepthLevel;
  onTermClick: (term: string) => void;
  onDepthChange: (direction: "deeper" | "simpler") => void;
  isLoading?: boolean;
  /** Resolved visual SVG (may differ from explanation.visual once polling settles). */
  visualOverride?: string | null;
  /** Lifecycle of the diagram: pending → ready / failed / skipped. */
  visualStatus?: VisualStatus;
  className?: string;
}

function renderExplanationWithTerms(text: string, terms: string[], onTermClick: (term: string) => void) {
  if (!terms.length) {
    return text.split("\n\n").map((para, i) => (
      <p key={i} className="mb-4 last:mb-0" dangerouslySetInnerHTML={{
        __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      }} />
    ));
  }

  return text.split("\n\n").map((para, i) => {
    let html = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    terms.forEach((term) => {
      const regex = new RegExp(`(?<![<\\w])(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w>])`, "gi");
      html = html.replace(regex, `<span class="term-highlight cursor-pointer border-b border-dotted border-primary/50 text-primary/80 hover:text-primary transition-colors" data-term="${term}">$1</span>`);
    });
    return (
      <p
        key={i}
        className="mb-4 last:mb-0"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.dataset.term) onTermClick(target.dataset.term);
        }}
      />
    );
  });
}

function GlossaryBlock({ terms, defaultOpen }: { terms: GlossaryTerm[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!terms.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6 rounded-md border border-border bg-muted/30 overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-sans font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/50 transition-colors">
        Key Terms ({terms.length})
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-2">
          {terms.map((t) => (
            <div key={t.term} className="text-sm">
              <span className="font-mono text-xs font-medium text-primary">{t.term}</span>
              <span className="text-muted-foreground mx-1.5">—</span>
              <span className="text-foreground/80 font-serif text-sm">{t.definition}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-32 bg-muted rounded-lg mt-6" />
    </div>
  );
}

export function SectionRenderer({
  title,
  explanation,
  depthLevel,
  onTermClick,
  onDepthChange,
  isLoading,
  visualOverride,
  visualStatus,
  className,
}: SectionRendererProps) {
  if (isLoading || !explanation) {
    return (
      <section className={cn("py-8 border-b border-border last:border-0", className)}>
        <h2 className="font-serif text-xl font-semibold mb-6">{title}</h2>
        <SectionSkeleton />
      </section>
    );
  }

  return (
    <section className={cn("py-8 border-b border-border last:border-0 transition-opacity duration-300", className)}>
      <h2 className="font-serif text-xl font-semibold mb-6">{title}</h2>

      {(depthLevel === "technical" || depthLevel === "formal") && (
        <GlossaryBlock
          terms={explanation.glossary}
          defaultOpen={depthLevel === "technical"}
        />
      )}

      <div className="font-serif text-[15px] leading-[1.7] text-foreground/90">
        {renderExplanationWithTerms(explanation.explanationText, explanation.unfamiliarTerms, onTermClick)}
      </div>

      {(() => {
        const svg = visualOverride ?? explanation.visual;
        const status = visualStatus ?? explanation.visualStatus;
        if (svg) {
          return (
            <VisualContainer
              svgContent={svg}
              caption={explanation.visualCaption ?? undefined}
              className="mt-6"
            />
          );
        }
        if (status === "pending") {
          return (
            <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 flex items-center justify-center gap-2 text-xs font-sans text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" />
              Generating diagram… ~30s
            </div>
          );
        }
        // status === "failed" | "skipped" → render nothing
        return null;
      })()}

      <div className="flex justify-end mt-4">
        {depthLevel !== "formal" && (
          <button
            onClick={() => onDepthChange("deeper")}
            className="flex items-center gap-1 text-xs font-sans text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
            Go deeper
          </button>
        )}
        {depthLevel !== "conceptual" && (
          <button
            onClick={() => onDepthChange("simpler")}
            className="flex items-center gap-1 text-xs font-sans text-muted-foreground hover:text-primary transition-colors ml-3"
          >
            <ChevronLeft className="h-3 w-3" />
            Simplify
          </button>
        )}
      </div>
    </section>
  );
}
