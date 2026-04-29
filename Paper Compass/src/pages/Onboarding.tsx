import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { VisualContainer } from "@/components/VisualContainer";
import { useCalibrateDepth } from "@/hooks/use-user";
import type { DepthLevel } from "@/lib/types";
import { ArrowRight } from "lucide-react";

const sampleVisual = `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="50" width="100" height="50" rx="6" fill="hsl(220, 52%, 49%)" opacity="0.12" stroke="hsl(220, 52%, 49%)" stroke-width="1.5"/>
  <text x="70" y="80" text-anchor="middle" font-size="12" fill="hsl(220, 52%, 49%)" font-family="DM Sans">Query</text>
  <rect x="150" y="50" width="100" height="50" rx="6" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1.5"/>
  <text x="200" y="80" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Attention</text>
  <rect x="280" y="50" width="100" height="50" rx="6" fill="hsl(14, 55%, 50%)" opacity="0.12" stroke="hsl(14, 55%, 50%)" stroke-width="1.5"/>
  <text x="330" y="80" text-anchor="middle" font-size="12" fill="hsl(14, 55%, 50%)" font-family="DM Sans">Output</text>
  <line x1="120" y1="75" x2="150" y2="75" stroke="hsl(0, 0%, 60%)" stroke-width="1"/>
  <line x1="250" y1="75" x2="280" y2="75" stroke="hsl(0, 0%, 60%)" stroke-width="1"/>
</svg>`;

const sampleExplanation = `Attention is a mechanism that allows a model to focus on the most relevant parts of the input when producing each part of the output. Instead of compressing the entire input into a single fixed-size vector, attention lets the model "look back" at the full input and weight different parts based on their relevance.

Think of it like reading a textbook: when answering a question, you don't re-read the entire chapter — you scan for the most relevant paragraphs. Attention works similarly, assigning higher weights to the input positions that matter most for the current computation.`;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const calibrate = useCalibrateDepth();
  const [step, setStep] = useState(0);
  const [selectedDepth, setSelectedDepth] = useState<DepthLevel>("technical");

  const handleCalibrate = (depth: DepthLevel) => {
    setSelectedDepth(depth);
    calibrate.mutate(depth);
    setStep(2);
  };

  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="font-serif text-3xl font-bold mb-4">Welcome to PaperLens</h1>
          <p className="font-serif text-foreground/80 leading-relaxed mb-8">
            PaperLens helps you find, evaluate and understand CS research papers.
            Explanations are visual by default and adjust to your level.
          </p>
          <Button size="lg" className="font-sans gap-2" onClick={() => setStep(1)}>
            Get started <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-reading w-full">
          <h2 className="font-serif text-2xl font-bold mb-2 text-center">Calibrate your depth</h2>
          <p className="text-sm font-sans text-muted-foreground text-center mb-8">
            Here's a sample explanation of the attention mechanism. Is this level right for you?
          </p>

          <div className="rounded-lg border border-border bg-card p-6 mb-8">
            <h3 className="font-serif text-lg font-semibold mb-4">Attention Mechanism</h3>
            <p className="font-serif text-[15px] leading-[1.7] text-foreground/90 mb-6">
              {sampleExplanation}
            </p>
            <VisualContainer svgContent={sampleVisual} caption="Attention: query is matched against input to produce a weighted output." />
          </div>

          <p className="text-sm font-sans text-center text-muted-foreground mb-4">Is this about right for you?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              className="font-sans"
              onClick={() => handleCalibrate("conceptual")}
            >
              Too much detail — simplify
            </Button>
            <Button
              className="font-sans"
              onClick={() => handleCalibrate("technical")}
            >
              This is about right
            </Button>
            <Button
              variant="outline"
              className="font-sans"
              onClick={() => handleCalibrate("formal")}
            >
              I want more depth
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const depthLabels: Record<DepthLevel, string> = {
    conceptual: "Conceptual",
    technical: "Technical",
    formal: "Formal",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="text-4xl mb-4">✨</div>
        <h2 className="font-serif text-2xl font-bold mb-4">You're all set</h2>
        <p className="font-serif text-foreground/80 leading-relaxed mb-2">
          Your default depth is <strong>{depthLabels[selectedDepth]}</strong>.
        </p>
        <p className="text-sm text-muted-foreground font-sans mb-8">
          You can change this anytime, and adjust per section as you read.
        </p>
        <Button size="lg" className="font-sans gap-2" onClick={() => navigate("/")}>
          Go to home <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
