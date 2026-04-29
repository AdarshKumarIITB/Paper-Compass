import { cn } from "@/lib/utils";
import type { PaperStatus } from "@/lib/types";
import { CheckCircle2, Loader2 } from "lucide-react";

interface PaperLoadingProps {
  status: PaperStatus;
  processingStep?: string;
}

const STEPS: { id: PaperStatus; label: string }[] = [
  { id: "fetching_pdf", label: "Looking for the open-access PDF" },
  { id: "parsing", label: "Reading the paper structure" },
  { id: "summarizing", label: "Generating the summary" },
];

const ORDER: PaperStatus[] = ["fetching_pdf", "parsing", "summarizing", "ready"];

export function PaperLoading({ status, processingStep }: PaperLoadingProps) {
  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <p className="font-serif text-base">
          {processingStep || "Preparing your paper…"}
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const done = currentIdx > i;
          const active = ORDER[currentIdx] === step.id;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3 text-sm font-sans",
                done && "text-muted-foreground",
                active && "text-foreground font-medium",
                !done && !active && "text-muted-foreground/60",
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : active ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
              )}
              {step.label}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground font-sans mt-6">
        First-time analysis takes 10–20 seconds. After that, this paper loads instantly.
      </p>
    </div>
  );
}
