import { cn } from "@/lib/utils";

interface VisualContainerProps {
  svgContent: string;
  caption?: string;
  className?: string;
}

export function VisualContainer({ svgContent, caption, className }: VisualContainerProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-4", className)}>
      <div
        className="w-full [&>svg]:w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {caption && (
        <p className="mt-3 text-center text-xs text-muted-foreground font-sans leading-relaxed">
          {caption}
        </p>
      )}
    </div>
  );
}
