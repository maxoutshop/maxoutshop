import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/auth";
import { ChallengeBoard } from "@/components/ChallengeBoard";

const TITLE = "Challenges — MAXOUT";
const DESC = "Join MAXOUT challenges, track live progress from your real training and climb the leaderboard.";

export const Route = createFileRoute("/challenges")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const { user, loading } = useSession();

  return (
    <AppShell>
      <div className="pt-2">
        <Link to="/profile" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Profile
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Challenges</h1>
        <p className="mt-1 text-xs text-muted-foreground">Live goals, real progress, points on the line.</p>

        {loading ? (
          <div className="mt-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ChallengeBoard uid={user?.id} />
        )}
      </div>
    </AppShell>
  );
}
