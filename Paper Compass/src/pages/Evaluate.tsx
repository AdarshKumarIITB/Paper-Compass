import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePaperStatus } from "@/hooks/use-paper-status";
import { useEvaluation } from "@/hooks/use-evaluation";
import { acknowledgeMatch, uploadPdfForPaper, ApiError } from "@/lib/api";
import { EvidenceBar } from "@/components/EvidenceBar";
import { VisualContainer } from "@/components/VisualContainer";
import { PaperLoading } from "@/components/PaperLoading";
import { PaywallUploadPrompt } from "@/components/PaywallUploadPrompt";
import { MatchMismatchBanner } from "@/components/MatchMismatchBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Paper } from "@/lib/types";

const levelColors: Record<string, string> = {
  basic: "bg-diagram-process/15 text-diagram-process border-diagram-process/30",
  intermediate: "bg-diagram-input/15 text-diagram-input border-diagram-input/30",
  advanced: "bg-diagram-output/15 text-diagram-output border-diagram-output/30",
};

const TERMINAL_OK: Paper["status"][] = ["ready", "evaluated", "completed"];

export default function EvaluatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: paper, isLoading: paperLoading } = usePaperStatus(id);
  const isReady = paper && TERMINAL_OK.includes(paper.status);
  const { data: evaluation } = useEvaluation(isReady ? id : undefined);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadPdfForPaper(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper", id] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeMatch(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper", id] });
    },
  });

  const uploadErrorMessage =
    uploadMutation.error instanceof ApiError
      ? uploadMutation.error.message
      : uploadMutation.error
        ? "Upload failed. Try again."
        : undefined;

  if (paperLoading) {
    return <SkeletonShell />;
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-lg text-muted-foreground mb-4">Paper not found</p>
          <Button onClick={() => navigate("/home")}>Go home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onHome={() => navigate("/home")} onLibrary={() => navigate("/library")} />

      <main className="max-w-reading mx-auto px-6 py-12">
        <PaperHeader paper={paper} />

        {paper.status === "fetching_pdf" ||
        paper.status === "parsing" ||
        paper.status === "summarizing" ||
        paper.status === "discovered" ? (
          <PaperLoading status={paper.status} processingStep={paper.processingStep} />
        ) : paper.status === "awaiting_upload" ? (
          <PaywallUploadPrompt
            onUpload={(file) => uploadMutation.mutate(file)}
            isUploading={uploadMutation.isPending}
            errorMessage={uploadErrorMessage}
          />
        ) : paper.status === "awaiting_confirmation" && paper.matchVerdict && paper.matchVerdict !== "match" ? (
          <MatchMismatchBanner
            verdict={paper.matchVerdict}
            reason={paper.matchReason || ""}
            intendedTitle={paper.title}
            isAcknowledging={acknowledgeMutation.isPending}
            isUploading={uploadMutation.isPending}
            uploadErrorMessage={uploadErrorMessage}
            onAcknowledge={() => acknowledgeMutation.mutate()}
            onReupload={(file) => uploadMutation.mutate(file)}
          />
        ) : paper.status === "failed" ? (
          <FailureCard
            reason={paper.failureReason}
            onRetry={() => {
              uploadMutation.reset();
              queryClient.invalidateQueries({ queryKey: ["paper", id] });
            }}
          />
        ) : evaluation ? (
          <EvaluationView paper={paper} evaluation={evaluation} navigate={navigate} />
        ) : (
          <PaperLoading status="summarizing" processingStep="Loading summary…" />
        )}
      </main>
    </div>
  );
}

function Header({ onHome, onLibrary }: { onHome: () => void; onLibrary: () => void }) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={onHome}
          className="font-serif text-xl font-bold text-foreground tracking-tight"
        >
          Paper Compass
        </button>
        <nav className="flex gap-6 text-sm font-sans">
          <button onClick={onHome} className="text-muted-foreground hover:text-foreground transition-colors">
            Home
          </button>
          <button onClick={onLibrary} className="text-muted-foreground hover:text-foreground transition-colors">
            Library
          </button>
        </nav>
      </div>
    </header>
  );
}

function PaperHeader({ paper }: { paper: Paper }) {
  const authorText =
    paper.authors.length > 3
      ? `${paper.authors
          .slice(0, 3)
          .map((a) => a.name)
          .join(", ")} et al.`
      : paper.authors.map((a) => a.name).join(", ");

  return (
    <div className="mb-12">
      <h1 className="font-serif text-3xl font-bold leading-tight mb-4">{paper.title}</h1>
      <p className="text-sm font-sans text-muted-foreground mb-2">{authorText}</p>
      <div className="flex items-center gap-3 text-xs font-sans text-muted-foreground">
        <span>{paper.year}</span>
        <span>•</span>
        <span>{paper.venue}</span>
        <span>•</span>
        <span>{paper.citationCount.toLocaleString()} citations</span>
      </div>
    </div>
  );
}

function FailureCard({ reason, onRetry }: { reason?: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <h3 className="font-serif text-lg font-semibold mb-1">We hit a snag</h3>
          <p className="text-sm font-sans text-muted-foreground">
            {reason || "Something went wrong while processing this paper."}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="font-sans gap-2" onClick={onRetry}>
        <RotateCcw className="h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
}

function EvaluationView({
  paper,
  evaluation,
  navigate,
}: {
  paper: Paper;
  evaluation: NonNullable<ReturnType<typeof useEvaluation>["data"]>;
  navigate: (to: string) => void;
}) {
  return (
    <>
      <section className="mb-10">
        <SectionHeader label="What this paper claims" />
        <p className="font-serif text-[15px] leading-[1.7] text-foreground/90">
          {evaluation.claimSummary}
        </p>
      </section>

      <section className="mb-10">
        <SectionHeader label="How it works" />
        <p className="font-serif text-[15px] leading-[1.7] text-foreground/90 mb-6">
          {evaluation.methodOverview}
        </p>
        <VisualContainer
          svgContent={evaluation.methodVisual}
          caption="Method diagram (auto-generated from the paper)."
        />
      </section>

      <section className="mb-10">
        <SectionHeader label="Strength of evidence" />
        <EvidenceBar strength={evaluation.evidenceStrength} className="mb-4" />
        <p className="font-serif text-[15px] leading-[1.7] text-foreground/90">
          {evaluation.evidenceAssessment}
        </p>
      </section>

      <section className="mb-10">
        <SectionHeader label="What you need to know first" />
        <div className="flex flex-wrap gap-2">
          {evaluation.prerequisites.map((prereq) => (
            <Badge
              key={prereq.name}
              variant="outline"
              className={cn("text-xs font-sans", levelColors[prereq.level])}
            >
              {prereq.name}
              <span className="ml-1.5 opacity-60 text-[10px]">{prereq.level}</span>
            </Badge>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader label="Reading time estimate" />
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Conceptual", time: evaluation.readingTimeEstimates.conceptual },
            { label: "Technical", time: evaluation.readingTimeEstimates.technical },
            { label: "Formal", time: evaluation.readingTimeEstimates.formal },
          ].map((est) => (
            <div
              key={est.label}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm font-sans"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">~{est.time} min</span>
              <span className="font-medium">{est.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
        <Button
          size="lg"
          className="font-sans gap-2"
          onClick={() => navigate(`/paper/${paper.id}/read`)}
        >
          Read this paper <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="font-sans"
          onClick={() => navigate(`/discover?q=${encodeURIComponent(paper.title)}`)}
        >
          Find related papers
        </Button>
      </div>
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-1 w-1 rounded-full bg-primary" />
      <h2 className="font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
    </div>
  );
}

function SkeletonShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
      </header>
      <main className="max-w-reading mx-auto px-6 py-12 space-y-6">
        <div className="h-10 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </main>
    </div>
  );
}
