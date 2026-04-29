import { useNavigate } from "react-router-dom";
import { SearchInput } from "@/components/SearchInput";
import { PaperCard } from "@/components/PaperCard";
import { useLibrary } from "@/hooks/use-papers";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const recentSearches = [
  "attention mechanisms in vision transformers",
  "diffusion models for text generation",
  "efficient fine-tuning of large language models",
  "graph neural networks for molecular property prediction",
  "reinforcement learning from human feedback",
];

export default function Index() {
  const navigate = useNavigate();
  const { data: papers, isLoading } = useLibrary();
  const { user, logout } = useAuth();

  const handleSearch = (query: string) => {
    navigate(`/discover?q=${encodeURIComponent(query)}`);
  };

  const recentPapers = (papers || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold text-foreground tracking-tight">Paper Compass</h1>
          <div className="flex items-center gap-6">
            <nav className="flex gap-6 text-sm font-sans">
              <button onClick={() => navigate("/home")} className="text-foreground font-medium">Home</button>
              <button onClick={() => navigate("/library")} className="text-muted-foreground hover:text-foreground transition-colors">Library</button>
            </nav>
            {user && (
              <div className="flex items-center gap-2">
                {user.pictureUrl ? (
                  <img
                    src={user.pictureUrl}
                    alt={user.name || user.email || "User"}
                    className="h-7 w-7 rounded-full border border-border"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-sans text-muted-foreground hidden sm:inline">
                  {user.name || user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="h-7 px-2 text-muted-foreground"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-2xl mb-16">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <h2 className="font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Discover
            </h2>
          </div>
          <h3 className="font-serif text-2xl font-semibold mb-6">
            Find research papers
          </h3>
          <SearchInput
            onSearch={handleSearch}
            recentSearches={recentSearches}
          />
        </div>

        {/* Library Preview */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-diagram-process" />
                <h2 className="font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Library
                </h2>
              </div>
              <p className="text-sm text-muted-foreground font-sans">Recent papers you've interacted with</p>
            </div>
            <button
              onClick={() => navigate("/library")}
              className="flex items-center gap-1 text-sm font-sans text-primary hover:text-primary/80 transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-lg border border-border bg-muted animate-pulse" />
                ))
              : recentPapers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
          </div>
        </section>
      </main>
    </div>
  );
}
