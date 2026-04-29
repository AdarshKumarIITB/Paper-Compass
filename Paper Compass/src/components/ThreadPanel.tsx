import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/hooks/use-comprehend";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Thread, ThreadMessage } from "@/lib/types";

interface ThreadPanelProps {
  thread: Thread;
  /** Optional subhead under the chat title (e.g. section name for term threads). */
  subhead?: string;
  /** Optional input placeholder override. */
  placeholder?: string;
  className?: string;
  /** True when a sibling component (e.g. the empty-state chips) has a send in flight. */
  externalPending?: boolean;
}

export function ThreadPanel({ thread, subhead, placeholder, className, externalPending }: ThreadPanelProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>(thread.messages);
  const [input, setInput] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const sendMutation = useSendMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resync local messages whenever the thread's message list reference changes
  // (e.g. cache refetch after a chip-click in the parent).
  useEffect(() => {
    setMessages(thread.messages);
  }, [thread.messages]);

  // When the thread itself changes (different highlight, copilot vs term), reset transient UI.
  useEffect(() => {
    setInput("");
    setErrorText(null);
  }, [thread.id]);

  const isPending = sendMutation.isPending || !!externalPending;

  // Auto-scroll to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isPending]);

  const submit = (raw: string) => {
    const content = raw.trim();
    if (!content || sendMutation.isPending) return;

    const userMsg: ThreadMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setErrorText(null);

    sendMutation.mutate(
      { threadId: thread.id, content },
      {
        onSuccess: (reply) => {
          setMessages((prev) => [...prev, reply]);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.message : "Couldn't get a response. Try again.";
          setErrorText(msg);
          // Roll back the optimistic user message so they can retry the same text
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          setInput(content);
        },
      },
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-serif font-semibold text-sm">
          {thread.threadType === "paper"
            ? "Copilot — ask about this paper"
            : thread.selectedText || thread.term || "Highlighted phrase"}
        </h3>
        {subhead && (
          <p className="text-xs font-sans text-muted-foreground mt-1 truncate">{subhead}</p>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs font-sans text-muted-foreground text-center py-8">
            Start the conversation below.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg p-3 text-sm leading-relaxed",
              msg.role === "system" ? "bg-muted font-serif" : "bg-primary/10 ml-6 font-sans",
            )}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {isPending && (
          <div className="flex items-center gap-2 text-xs font-sans text-muted-foreground px-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking…
          </div>
        )}
        {errorText && (
          <p className="text-xs font-sans text-destructive px-1">{errorText}</p>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder ?? "Ask a follow-up question..."}
          className="flex-1 text-sm font-sans"
          disabled={sendMutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 cursor-pointer"
          disabled={sendMutation.isPending || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
