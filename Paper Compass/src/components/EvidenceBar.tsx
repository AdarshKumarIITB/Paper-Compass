import { cn } from "@/lib/utils";

interface EvidenceBarProps {
  strength: "weak" | "mixed" | "solid" | "strong";
  className?: string;
}

const segments: { value: string; label: string }[] = [
  { value: "weak", label: "Weak" },
  { value: "mixed", label: "Mixed" },
  { value: "solid", label: "Solid" },
  { value: "strong", label: "Strong" },
];

export function EvidenceBar({ strength, className }: EvidenceBarProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {segments.map((seg) => (
        <div key={seg.value} className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "h-2 w-16 rounded-full transition-colors",
              seg.value === strength
                ? "bg-primary"
                : "bg-muted"
            )}
          />
          <span
            className={cn(
              "text-xs font-sans",
              seg.value === strength
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {seg.label}
          </span>
        </div>
      ))}
    </div>
  );
}
