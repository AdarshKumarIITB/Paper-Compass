import { useState, useCallback, useRef } from "react";
import { Upload, Link, Hash, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_PDF_MB, validatePdfFile } from "@/lib/pdf-validation";

interface PaperEntryInputProps {
  onSubmit: (input: { type: "url" | "doi"; value: string }) => void;
  onPdfUpload?: (file: File) => void;
  className?: string;
}

export function PaperEntryInput({ onSubmit, onPdfUpload, className }: PaperEntryInputProps) {
  const [urlValue, setUrlValue] = useState("");
  const [doiValue, setDoiValue] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlValue.trim()) onSubmit({ type: "url", value: urlValue.trim() });
  };

  const handleDoiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (doiValue.trim()) onSubmit({ type: "doi", value: doiValue.trim() });
  };

  const handleFile = (file: File) => {
    if (!onPdfUpload) return;
    const err = validatePdfFile(file);
    if (err) {
      setPdfError(err);
      return;
    }
    setPdfError(null);
    onPdfUpload(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [onPdfUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
        )}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-sans text-muted-foreground mb-1">
          Drop a PDF here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Paste a paper URL, enter a DOI, or drop a PDF · max {MAX_PDF_MB} MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
      {pdfError && (
        <div className="flex items-start gap-2 text-sm font-sans text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{pdfError}</span>
        </div>
      )}
      <form onSubmit={handleUrlSubmit} className="relative">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="Paste paper URL (e.g., arxiv.org/abs/...)"
          className="pl-10 h-10 text-sm font-sans bg-card"
        />
      </form>
      <form onSubmit={handleDoiSubmit} className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={doiValue}
          onChange={(e) => setDoiValue(e.target.value)}
          placeholder="Enter DOI (e.g., 10.1234/...)"
          className="pl-10 h-10 text-sm font-sans bg-card"
        />
      </form>
    </div>
  );
}
