import { Navigate } from "react-router-dom";
import { Search, Compass, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { googleSignInUrl } from "@/lib/api";

const ARTIFACTS = [
  {
    icon: Search,
    title: "Discover",
    description:
      "Search across millions of papers with sort by foundational impact or recency. Filter by recency to surface what matters now.",
  },
  {
    icon: Compass,
    title: "Evaluate",
    description:
      "One paper, one page. Claims, method, evidence strength, prerequisites, and reading-time estimates — generated from the full paper.",
  },
  {
    icon: BookOpen,
    title: "Comprehend",
    description:
      "Section-by-section explanations at your depth: conceptual, technical, or formal. Discuss any term in a thread.",
  },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl font-bold tracking-tight mb-4">Paper Compass</h1>
          <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            An AI research assistant for academic papers. Discover the right work, get a clear
            evaluation in one page, and read with depth-adjustable explanations of every section.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {ARTIFACTS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-serif text-lg font-semibold mb-2">{title}</h2>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="font-sans gap-2"
            onClick={() => {
              window.location.href = googleSignInUrl;
            }}
          >
            <GoogleIcon className="h-4 w-4" />
            Sign in with Google
          </Button>
          <p className="text-xs font-sans text-muted-foreground">
            We use Google sign-in only to keep your library and progress private to you.
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
