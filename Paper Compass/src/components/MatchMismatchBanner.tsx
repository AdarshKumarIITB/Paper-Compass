import { AlertTriangle, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaywallUploadPrompt } from "@/components/PaywallUploadPrompt";
import { useState } from "react";
import type { MatchVerdict } from "@/lib/types";

interface MatchMismatchBannerProps {
  verdict: MatchVerdict;
  reason: string;
  intendedTitle: string;
  isAcknowledging: boolean;
  isUploading: boolean;
  uploadErrorMessage?: string;
  onAcknowledge: () => void;
  onReupload: (file: File) => void;
}

const COPY: Record<MatchVerdict, { headline: string; lead: string }> = {
  mismatch: {
    headline: "This PDF looks like a different paper",
    lead: "Our review of the uploaded PDF doesn't match the paper you opened. Please re-upload the correct PDF, or continue anyway if you're sure.",
  },
  uncertain: {
    headline: "We couldn't fully confirm the uploaded PDF",
    lead: "The PDF metadata was too noisy to be sure this matches the paper you opened. You can re-upload, or continue if you're confident.",
  },
  match: {
    // Should never render with verdict=match, but kept for completeness.
    headline: "PDF accepted",
    lead: "",
  },
};

export function MatchMismatchBanner({
  verdict,
  reason,
  intendedTitle,
  isAcknowledging,
  isUploading,
  uploadErrorMessage,
  onAcknowledge,
  onReupload,
}: MatchMismatchBannerProps) {
  const [showReupload, setShowReupload] = useState(false);
  const copy = COPY[verdict];

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-serif text-base font-semibold mb-1">{copy.headline}</h3>
          <p className="text-sm font-sans text-muted-foreground leading-relaxed">{copy.lead}</p>
        </div>
      </div>

      <dl className="text-xs font-sans bg-card border border-border rounded-md p-3 mb-4 space-y-1">
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-24 shrink-0">Paper opened:</dt>
          <dd className="text-foreground">{intendedTitle}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-24 shrink-0">Reviewer note:</dt>
          <dd className="text-foreground">{reason}</dd>
        </div>
      </dl>

      {!showReupload ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-sans gap-2"
            onClick={() => setShowReupload(true)}
            disabled={isAcknowledging || isUploading}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-upload the correct PDF
          </Button>
          <Button
            type="button"
            size="sm"
            className="font-sans gap-2"
            onClick={onAcknowledge}
            disabled={isAcknowledging || isUploading}
          >
            {isAcknowledging ? "Continuing…" : "Use this anyway"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <PaywallUploadPrompt
            onUpload={onReupload}
            isUploading={isUploading}
            errorMessage={uploadErrorMessage}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-sans"
            onClick={() => setShowReupload(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
