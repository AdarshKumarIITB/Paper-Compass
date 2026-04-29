import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSearchPapers } from "@/hooks/use-papers";
import { Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const timeFilters = ["Last year", "Last 3 years", "Last 5 years", "All time"];

const statusConfig: Record<string, { label: string; className: string }> = {
  discovered: { label: "Discovered", className: "bg-muted text-muted-foreground" },
  fetching_pdf: { label: "Fetching PDF", className: "bg-primary/15 text-primary" },
  parsing: { label: "Parsing", className: "bg-primary/15 text-primary" },
  summarizing: { label: "Summarizing", className: "bg-primary/15 text-primary" },
  awaiting_upload: { label: "Needs PDF", className: "bg-amber-500/15 text-amber-600" },
  awaiting_confirmation: { label: "Confirm match", className: "bg-amber-500/15 text-amber-600" },
  ready: { label: "Ready", className: "bg-diagram-process/15 text-diagram-process" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
  evaluated: { label: "Evaluated", className: "bg-diagram-input/15 text-diagram-input" },
  reading: { label: "Reading", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-diagram-process/15 text-diagram-process" },
};

export default function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState("All time");
  const [sortBy, setSortBy] = useState<"foundational" | "recent">("foundational");

  const { data, isLoading } = useSearchPapers(initialQuery, activeFilter, sortBy);
  const papers = data?.papers || [];

  const maxCitations = papers.length > 0 ? Math.max(...papers.map((p) => p.citationCount)) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-serif text-xl font-bold text-foreground tracking-tight">
            PaperLens
          </button>
          <nav className="flex gap-6 text-sm font-sans">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">Home</button>
            <button onClick={() => navigate("/library")} className="text-muted-foreground hover:text-foreground transition-colors">Library</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base font-serif bg-card border-border"
          />
        </form>

        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-wrap gap-2">
            {timeFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-sans border transition-colors",
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortBy(sortBy === "foundational" ? "recent" : "foundational")}
            className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortBy === "foundational" ? "Foundational" : "Recent"}
          </button>
        </div>

        <div className="space-y-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-lg border border-border bg-muted animate-pulse" />
              ))
            : papers.map((paper) => {
                const status = statusConfig[paper.status];
                const authorText =
                  paper.authors.length > 3
                    ? `${paper.authors.slice(0, 3).map((a) => a.name).join(", ")} et al.`
                    : paper.authors.map((a) => a.name).join(", ");

                return (
                  <button
                    key={paper.id}
                    onClick={() => navigate(`/paper/${paper.id}/evaluate`)}
                    className="w-full text-left group rounded-lg border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-serif text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                        {paper.title}
                      </h3>
                      {status && (
                        <Badge variant="outline" className={cn("shrink-0 text-[10px] font-sans", status.className)}>
                          {status.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-sans mb-3">
                      {authorText}, {paper.year}
                    </p>
                    <div className="flex items-center gap-4 mb-3 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Citations:</span>
                        <span className="font-medium">{paper.citationCount.toLocaleString()}</span>
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full"
                            style={{ width: `${(paper.citationCount / maxCitations) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Influential:</span>
                        <span className="font-medium">{paper.influentialCitationCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/70 font-serif leading-relaxed">
                      {paper.contributionSummary}
                    </p>
                  </button>
                );
              })}
          {!isLoading && papers.length === 0 && initialQuery && (
            <p className="text-center text-muted-foreground font-sans py-12">No papers found for "{initialQuery}"</p>
          )}
        </div>
      </main>
    </div>
  );
}
