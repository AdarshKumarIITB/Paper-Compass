import { cn } from "@/lib/utils";
import type { DepthLevel } from "@/lib/types";

interface DepthSelectorProps {
  value: DepthLevel;
  onChange: (level: DepthLevel) => void;
  size?: "sm" | "md";
  className?: string;
}

const levels: { value: DepthLevel; label: string }[] = [
  { value: "conceptual", label: "Conceptual" },
  { value: "technical", label: "Technical" },
  { value: "formal", label: "Formal" },
];

export function DepthSelector({ value, onChange, size = "md", className }: DepthSelectorProps) {
  return (
    <div className={cn("inline-flex rounded-md border border-border bg-muted/50 p-0.5", className)}>
      {levels.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          className={cn(
            "rounded-sm font-sans transition-all duration-200",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === level.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
