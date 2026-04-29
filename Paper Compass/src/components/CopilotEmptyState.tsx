import { MessageSquare } from "lucide-react";
import type { ChatIntent } from "@/lib/api";

interface CopilotEmptyStateProps {
  onPrompt: (prompt: string, intent?: ChatIntent) => void;
  paperTitle: string;
}

interface SamplePrompt {
  text: string;
  intent?: ChatIntent;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  { text: "What's this paper's main claim?" },
  { text: "What are the limitations of this method?" },
  { text: "What should I read next to dig deeper?", intent: "recommend" },
];

export function CopilotEmptyState({ onPrompt, paperTitle }: CopilotEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-4">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <MessageSquare className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-serif text-base font-semibold mb-1">Copilot</h3>
        <p className="text-sm font-sans text-muted-foreground leading-relaxed max-w-xs">
          Ask broad questions about <span className="text-foreground">{paperTitle}</span>{" "}
          — claims, methods, evidence, or how to apply the work.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {SAMPLE_PROMPTS.map((p) => (
          <button
            key={p.text}
            type="button"
            onClick={() => onPrompt(p.text, p.intent)}
            className="text-left text-xs font-sans px-3 py-2 rounded-md border border-border bg-card hover:border-primary/40 hover:bg-card transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {p.text}
          </button>
        ))}
      </div>
    </div>
  );
}
