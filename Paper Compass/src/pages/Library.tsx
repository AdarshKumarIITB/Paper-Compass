import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "@/hooks/use-papers";
import { PaperCard } from "@/components/PaperCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { PaperStatus } from "@/lib/types";

// Two user-meaningful filters: papers with a summary ready, and papers the user
// has actually deep-dived into (viewed at least one section explanation).
type FilterValue = "all" | "summary" | "deepdive";

const SUMMARY_STATUSES: PaperStatus[] = ["ready", "evaluated", "completed", "reading"];

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "summary", label: "Summary" },
  { value: "deepdive", label: "Deep-dive" },
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const { data: papers, isLoading } = useLibrary();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const allPapers = papers || [];
  const filtered = allPapers.filter((p) => {
    if (filter === "summary" && !SUMMARY_STATUSES.includes(p.status)) return false;
    if (filter === "deepdive" && !p.hasDeepDive) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthor = p.authors.some((a) => a.name.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthor) return false;
    }
    return true;
  });

  // Group by sourceQuery
  const groups = new Map<string, typeof filtered>();
  filtered.forEach((p) => {
    const key = p.sourceQuery || "Ungrouped";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/home")} className="font-serif text-xl font-bold text-foreground tracking-tight">
            Paper Compass
          </button>
          <nav className="flex gap-6 text-sm font-sans">
            <button onClick={() => navigate("/home")} className="text-muted-foreground hover:text-foreground transition-colors">Home</button>
            <button onClick={() => navigate("/library")} className="text-foreground font-medium">Library</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-bold mb-8">Your Library</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or author..."
              className="pl-10 text-sm font-sans"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-sans border transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-lg border border-border bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📖</p>
            <p className="font-serif text-lg text-muted-foreground">
              {search || filter !== "all"
                ? "No papers match your filters."
                : "Your library is empty. Start by discovering papers or evaluating one you're reading."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(groups.entries()).map(([groupName, papers]) => (
              <div key={groupName}>
                <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-3">
                  {groupName}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {papers.map((paper) => (
                    <PaperCard key={paper.id} paper={paper} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
