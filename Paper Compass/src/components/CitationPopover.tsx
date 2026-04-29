import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { CitedPaper } from "@/lib/types";

interface CitationPopoverProps {
  citation: CitedPaper;
  children: React.ReactNode;
}

export function CitationPopover({ citation, children }: CitationPopoverProps) {
  const authorText =
    citation.authors.length > 1
      ? `${citation.authors[0].name} et al.`
      : citation.authors[0].name;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <h4 className="font-serif text-sm font-semibold leading-snug mb-1">
          {citation.title}
        </h4>
        <p className="text-xs font-sans text-muted-foreground mb-3">
          {authorText}, {citation.year}
        </p>
        <p className="text-xs font-serif text-foreground/80 leading-relaxed mb-4">
          {citation.microEvaluation}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs font-sans">
            Evaluate this paper
          </Button>
          <Button size="sm" variant="ghost" className="text-xs font-sans">
            Dismiss
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
