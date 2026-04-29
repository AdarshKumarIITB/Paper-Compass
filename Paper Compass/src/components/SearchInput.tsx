import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  recentSearches?: string[];
}

const timeFilters = ["Last year", "Last 3 years", "Last 5 years", "All time"];

export function SearchInput({ onSearch, placeholder, className, recentSearches = [] }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All time");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div className={cn("space-y-4", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || "Search a topic, e.g. 'attention mechanisms in vision transformers'"}
          className="pl-10 h-12 text-sm font-sans bg-card border-border focus-visible:ring-primary"
        />
      </form>
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
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={search}
                onClick={() => { setQuery(search); onSearch(search); }}
                className="px-3 py-1.5 rounded-full text-xs font-sans bg-muted text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
