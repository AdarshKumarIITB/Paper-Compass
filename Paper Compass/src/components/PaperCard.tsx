import { cn } from "@/lib/utils";
import type { Paper, PaperStatus } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface PaperCardProps {
  paper: Paper;
  className?: string;
  showProgress?: boolean;
}

const STATUS_CONFIG: Record<PaperStatus, { label: string; className: string }> = {
  // workflow states
  discovered: { label: "Discovered", className: "bg-muted text-muted-foreground" },
  fetching_pdf: { label: "Fetching PDF", className: "bg-primary/15 text-primary border-primary/30" },
  parsing: { label: "Parsing", className: "bg-primary/15 text-primary border-primary/30" },
  summarizing: { label: "Summarizing", className: "bg-primary/15 text-primary border-primary/30" },
  awaiting_upload: { label: "Needs PDF", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  awaiting_confirmation: { label: "Confirm match", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  ready: { label: "Ready", className: "bg-diagram-process/15 text-diagram-process border-diagram-process/30" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  // legacy
  evaluated: { label: "Evaluated", className: "bg-diagram-input/15 text-diagram-input border-diagram-input/30" },
  reading: { label: "Reading", className: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Completed", className: "bg-diagram-process/15 text-diagram-process border-diagram-process/30" },
};

const FALLBACK_STATUS = STATUS_CONFIG.discovered;

export function PaperCard({ paper, className, showProgress = true }: PaperCardProps) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[paper.status] ?? FALLBACK_STATUS;

  const handleClick = () => {
    if (paper.status === "reading" || paper.status === "completed") {
      navigate(`/paper/${paper.id}/read`);
    } else {
      navigate(`/paper/${paper.id}/evaluate`);
    }
  };

  const authorText =
    paper.authors.length > 1
      ? `${paper.authors[0].name} et al.`
      : paper.authors[0]?.name ?? "Unknown";

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group w-full text-left rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-serif text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {paper.title}
        </h3>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px] font-sans", status.className)}
        >
          {status.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground font-sans mb-2">
        {authorText}, {paper.year}
      </p>
      {paper.lastInteraction && (
        <p className="text-[10px] text-muted-foreground font-sans">{paper.lastInteraction}</p>
      )}
      {showProgress && paper.status === "reading" && paper.comprehensionProgress !== undefined && (
        <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${paper.comprehensionProgress}%` }}
          />
        </div>
      )}
    </button>
  );
}
