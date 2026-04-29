import { useCallback, useRef, useState } from "react";
import { Lock, Upload, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MAX_PDF_MB, validatePdfFile } from "@/lib/pdf-validation";

interface PaywallUploadPromptProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  errorMessage?: string;
}

export function PaywallUploadPrompt({
  onUpload,
  isUploading,
  errorMessage,
}: PaywallUploadPromptProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const err = validatePdfFile(file);
    if (err) {
      setClientError(err);
      return;
    }
    setClientError(null);
    onUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold mb-1">
            This paper appears to be paywalled
          </h3>
          <p className="text-sm font-sans text-muted-foreground leading-relaxed">
            We couldn't find an open-access PDF for this paper. To continue, please upload your own
            copy. We'll only use it to generate your summary and reading guide — it stays private to
            your library.
          </p>
        </div>
      </div>

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer mt-2",
          isUploading && "opacity-60 cursor-wait",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-primary/50",
        )}
      >
        <Upload className="h-7 w-7 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-sans text-foreground mb-1">
          {isUploading ? "Uploading…" : "Drop the PDF here or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">PDF only · max {MAX_PDF_MB} MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />
      </div>

      {(clientError || errorMessage) && (
        <div className="flex items-start gap-2 mt-4 text-sm font-sans text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{clientError || errorMessage}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-6 font-sans"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        Choose PDF
      </Button>
    </div>
  );
}
