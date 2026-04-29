import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Selection {
  text: string;
  rect: DOMRect;
}

interface SelectionPopoverProps {
  /**
   * Element whose interior selections should trigger the popover. The popover
   * watches `selectionchange` on the document and only fires when the entire
   * selection is inside this element.
   */
  containerRef: React.RefObject<HTMLElement>;
  /** Map a selection event to the section it belongs to. Returning null suppresses the popover. */
  resolveSectionId: (anchorNode: Node) => string | null;
  onAsk: (selectedText: string, sectionId: string) => void;
  disabled?: boolean;
}

const MIN_CHARS = 2;
const MAX_CHARS = 400;

export function SelectionPopover({
  containerRef,
  resolveSectionId,
  onAsk,
  disabled,
}: SelectionPopoverProps) {
  const [active, setActive] = useState<{ text: string; sectionId: string; x: number; y: number } | null>(null);
  const lastSelectionRef = useRef<Selection | null>(null);

  useEffect(() => {
    if (disabled) {
      setActive(null);
      return;
    }
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setActive(null);
        lastSelectionRef.current = null;
        return;
      }
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container) return;

      // Both endpoints must be inside the reading container
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        setActive(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
        setActive(null);
        return;
      }

      const sectionId = resolveSectionId(range.startContainer);
      if (!sectionId) {
        setActive(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      lastSelectionRef.current = { text, rect };
      setActive({
        text,
        sectionId,
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + window.scrollY - 8,
      });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [containerRef, resolveSectionId, disabled]);

  // Dismiss on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!active) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAsk(active.text, active.sectionId);
    // Drop the selection so the popover hides on next render
    window.getSelection()?.removeAllRanges();
    setActive(null);
  };

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // don't clear selection on click
      onClick={handleClick}
      style={{
        position: "absolute",
        top: active.y,
        left: active.x,
        transform: "translate(-50%, -100%)",
      }}
      className={cn(
        "z-50 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background",
        "px-3 py-1.5 text-xs font-sans font-medium shadow-lg",
        "hover:bg-foreground/90 transition-colors cursor-pointer",
      )}
    >
      <Sparkles className="h-3 w-3" />
      Ask AI about this
    </button>
  );
}
